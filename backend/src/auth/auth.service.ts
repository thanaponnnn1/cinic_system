import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import type { Role } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUserDto, type LoginResponseDto, type TokenPairDto } from './dto/auth-response.dto';
import type { JwtPayload, RefreshPayload } from './auth.types';

/** รอบการเข้ารหัสรหัสผ่าน — 12 รอบคือจุดที่ยังเร็วพอใช้งานแต่แพงพอสำหรับคนที่ขโมยฐานข้อมูลไป */
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  static hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async login(email: string, password: string): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // เทียบรหัสผ่านแม้ไม่พบผู้ใช้ เพื่อให้เวลาตอบกลับใกล้เคียงกันทั้งสองกรณี
    // ไม่งั้นคนที่ลองสุ่มจะจับได้จากเวลาตอบว่าอีเมลไหนมีอยู่จริง
    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    this.logger.log(`เข้าสู่ระบบ: ${user.email} (${user.role})`);

    return { ...tokens, user: AuthUserDto.from(user) };
  }

  /**
   * ออก access token ใบใหม่ พร้อมเปลี่ยน refresh token ใบเดิมทิ้ง (rotation)
   *
   * การหมุนทุกครั้งทำให้ refresh token ที่หลุดออกไปใช้ได้แค่ครั้งเดียว
   * และถ้าเจ้าของตัวจริงใช้ต่อ ใบที่ขโมยไปจะกลายเป็นใบที่ถูกเพิกถอนไปแล้วทันที
   */
  async refresh(refreshToken: string): Promise<TokenPairDto> {
    let payload: RefreshPayload;

    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.tokenHash !== hashToken(refreshToken)
    ) {
      throw new UnauthorizedException('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('บัญชีนี้ถูกปิดการใช้งาน');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  /** ออกจากระบบเฉพาะอุปกรณ์นี้ */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);

    // updateMany เพื่อให้ไม่ throw ถ้าหาไม่เจอ — ออกจากระบบซ้ำไม่ควรเป็น error
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** ตัดสิทธิ์ทุกอุปกรณ์ของผู้ใช้คนนี้ — ใช้ตอนสงสัยว่าบัญชีถูกขโมย */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('ไม่พบผู้ใช้');
    }
    return AuthUserDto.from(user);
  }

  private async issueTokens(userId: string, email: string, role: Role): Promise<TokenPairDto> {
    // ส่ง expiresIn เป็นจำนวนวินาที ไม่ใช่สตริง เพื่อให้อายุของโทเคน
    // กับ expiresAt ที่บันทึกลงฐานข้อมูลคำนวณมาจากค่าเดียวกันเสมอ
    const accessTtlMs = parseDuration(this.config.get<string>('JWT_ACCESS_TTL', '15m'));
    const refreshTtlMs = parseDuration(this.config.get<string>('JWT_REFRESH_TTL', '7d'));

    const accessPayload: JwtPayload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: Math.floor(accessTtlMs / 1000),
    });

    // สร้าง id ของแถวไว้ก่อน เพื่อฝัง jti ลงในโทเคนแล้วค่อยบันทึกลงฐานข้อมูล
    const jti = randomUUID();
    const refreshPayload: RefreshPayload = { sub: userId, jti };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: Math.floor(refreshTtlMs / 1000),
    });

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    return { accessToken, refreshToken };
  }
}

/**
 * เก็บ refresh token เป็น hash ไม่เก็บตัวจริง
 *
 * ใช้ SHA-256 ไม่ใช่ bcrypt เพราะตัวโทเคนเองสุ่มมาแล้วและยาวพอ ไม่ใช่รหัสผ่านที่คนตั้งเอง
 * จึงไม่มีอะไรให้เดา และการ hash ต้องเร็วพอที่จะทำได้ทุก request ที่ขอ refresh
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** แปลงรูปแบบเวลาของ JWT ("15m", "7d", "24h") เป็นมิลลิวินาที */
export function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`รูปแบบเวลาไม่ถูกต้อง: "${value}" (ต้องเป็นเช่น 15m, 24h, 7d)`);
  }

  const amount = Number(match[1]);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * unitMs[match[2] as string]!;
}
