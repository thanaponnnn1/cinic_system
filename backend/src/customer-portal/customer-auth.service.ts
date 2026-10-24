import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiErrorCode } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClockService } from '../clock/clock.service';
import { isUniqueViolation } from '../common/prisma-errors';
import { LineAccountLinkService } from '../line/line-account-link.service';
import { LineIdTokenVerifier } from './line-id-token.verifier';
import {
  CUSTOMER_SESSION_TTL_SECONDS,
  CUSTOMER_TOKEN_TYPE,
  type CustomerSessionPayload,
} from './customer-session';
import type {
  CustomerAuthResult,
  CustomerProfile,
  DemoCustomerOption,
} from './customer-portal.types';
import type { DemoRegisterDto, RegisterCustomerDto } from './dto/customer-auth.dto';
import type { Prisma } from '../generated/prisma/client';

const PROFILE_SELECT = {
  id: true,
  name: true,
  lineUserId: true,
  consentReminder: true,
  consentMarketing: true,
  isActive: true,
} satisfies Prisma.CustomerSelect;

type ProfileRow = Prisma.CustomerGetPayload<{ select: typeof PROFILE_SELECT }>;

/** ข้อมูลลูกค้าใหม่ที่สมัครเอง — ไม่มี lineUserId ตอนสมัครผ่านโหมดเดโม */
type NewCustomer = Pick<DemoRegisterDto, 'name' | 'phone' | 'consentReminder' | 'consentMarketing'>;

/**
 * ไม่บอกว่าเบอร์นี้เป็นของใคร — ใครก็พิมพ์เบอร์คนอื่นมาลองได้
 * บอกแค่ทางที่ถูก คือขอรหัสเชื่อมจากร้านซึ่งต้องยืนยันตัวตนกับพนักงานก่อน
 */
const PHONE_TAKEN_MESSAGE =
  'เบอร์นี้มีข้อมูลอยู่กับทางร้านแล้ว กรุณาขอรหัสเชื่อม 6 หลักจากทางร้าน แล้วเลือก "เคยใช้บริการแล้ว"';

/**
 * ยืนยันตัวตนลูกค้าที่เปิดหน้าร้านจาก LINE แล้วออก customer session
 *
 * ทุกทางเข้าจบที่ token ชนิดเดียวกัน (sub = customerId, typ = customer) endpoint ข้างใน
 * จึงไม่ต้องรู้ว่าลูกค้าเข้ามาทางไหน — LINE จริง ผูกด้วยรหัส สมัครใหม่ หรือปุ่มเดโม
 */
@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly clock: ClockService,
    private readonly verifier: LineIdTokenVerifier,
    private readonly accountLink: LineAccountLinkService,
  ) {}

  // ── เข้าผ่าน LINE จริง ──────────────────────────────────

  async loginWithLiff(idToken: string): Promise<CustomerAuthResult> {
    const { lineUserId } = await this.verifier.verify(idToken);
    const customer = await this.findByLineUserId(lineUserId);

    return customer ? this.issueSession(customer) : { status: 'needs_link' };
  }

  /** ลูกค้าเก่าที่ยังไม่ผูก LINE — ใช้รหัสจากร้านด้วยกฎเดียวกับการพิมพ์รหัสในแชท */
  async linkWithCode(idToken: string, code: string): Promise<CustomerAuthResult> {
    const { lineUserId } = await this.verifier.verify(idToken);
    const result = await this.accountLink.link(code, lineUserId);

    switch (result.status) {
      case 'code_not_found':
        throw new BadRequestException(
          'รหัสนี้ใช้ไม่ได้แล้ว รหัสเชื่อมใช้ได้ครั้งเดียว กรุณาขอรหัสใหม่จากทางร้าน',
        );
      case 'line_already_linked_to_other':
        throw new ConflictException(
          'บัญชี LINE นี้ผูกกับข้อมูลลูกค้าอีกท่านอยู่แล้ว กรุณาติดต่อทางร้านเพื่อตรวจสอบ',
        );
      case 'linked':
        return this.issueSession(await this.loadProfile(result.customer.id));
    }
  }

  /**
   * ลูกค้าใหม่สมัครเอง
   *
   * ถ้าบัญชี LINE นี้มีเจ้าของในระบบแล้ว ให้เข้าสู่ระบบเป็นคนนั้นเลยแทนการ error —
   * ลูกค้าที่กดสมัครซ้ำเพราะเน็ตหลุดหลังสมัครสำเร็จ ต้องได้ผลเหมือนกดครั้งเดียว
   */
  async register(dto: RegisterCustomerDto): Promise<CustomerAuthResult> {
    const { lineUserId } = await this.verifier.verify(dto.idToken);
    const existing = await this.findByLineUserId(lineUserId);

    if (existing) return this.issueSession(existing);

    return this.createAndIssue(dto, lineUserId);
  }

  async me(customerId: string): Promise<CustomerProfile> {
    return toProfile(await this.loadProfile(customerId));
  }

  // ── ทางเข้าโหมดเดโม (ไม่ต้องมี LINE) ─────────────────────

  async listDemoCustomers(): Promise<DemoCustomerOption[]> {
    this.assertDemoMode();

    return this.prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async loginAsDemo(customerId: string): Promise<CustomerAuthResult> {
    this.assertDemoMode();

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: PROFILE_SELECT,
    });
    if (!customer?.isActive) throw new NotFoundException('ไม่พบลูกค้ารายนี้');

    return this.issueSession(customer);
  }

  /** เจ้าของร้านสมัครด้วยชื่อตัวเองตอนเดโม แล้วเห็นชื่อตัวเองขึ้นบนบอร์ดคิว */
  async registerDemo(dto: DemoRegisterDto): Promise<CustomerAuthResult> {
    this.assertDemoMode();

    return this.createAndIssue(dto, null);
  }

  // ── ตัวช่วยภายใน ────────────────────────────────────────

  /**
   * ทุก endpoint เดโมผ่านตรงนี้ก่อนแตะข้อมูลใด ๆ
   *
   * ทางเข้าเดโมคือ "เข้าเป็นลูกค้าคนไหนก็ได้โดยไม่ต้องยืนยันตัวตน" — บนร้านจริงต้องปิดตาย
   * และ env.validation ก็ไม่ยอมให้ DEMO_MODE=true บน production อยู่แล้วอีกชั้นหนึ่ง
   */
  private assertDemoMode(): void {
    if (!this.clock.demoMode) {
      throw new ForbiddenException('ทางเข้านี้เปิดใช้ได้เฉพาะโหมดเดโมเท่านั้น');
    }
  }

  private async findByLineUserId(lineUserId: string): Promise<ProfileRow | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { lineUserId },
      select: PROFILE_SELECT,
    });

    if (customer && !customer.isActive) {
      throw new ForbiddenException('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อทางร้าน');
    }

    return customer;
  }

  private async loadProfile(customerId: string): Promise<ProfileRow> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: PROFILE_SELECT,
    });

    // token ยังไม่หมดอายุแต่ร้านปิดบัญชีไปแล้ว — ให้กลับไปเข้าสู่ระบบใหม่ ไม่ใช่เห็นข้อมูลค้าง
    if (!customer?.isActive) throw new UnauthorizedException('ไม่พบบัญชีลูกค้านี้แล้ว');

    return customer;
  }

  /**
   * สร้างลูกค้าใหม่จากการสมัครเอง — ไม่สร้างซ้ำเด็ดขาดเมื่อเบอร์มีอยู่แล้ว
   *
   * เช็กเบอร์ก่อนเพื่อให้ได้คำตอบที่อ่านรู้เรื่อง แล้วจับ unique ตอนเขียนไว้อีกชั้น
   * สำหรับสองคำขอที่มาพร้อมกันและผ่านการเช็กทั้งคู่
   */
  private async createAndIssue(
    input: NewCustomer,
    lineUserId: string | null,
  ): Promise<CustomerAuthResult> {
    const taken = await this.prisma.customer.findUnique({
      where: { phone: input.phone },
      select: { id: true },
    });
    if (taken) throw phoneTaken();

    const givesConsent = input.consentReminder || input.consentMarketing;

    let customer: ProfileRow;
    try {
      customer = await this.prisma.customer.create({
        data: {
          name: input.name,
          phone: input.phone,
          lineUserId,
          consentReminder: input.consentReminder,
          consentMarketing: input.consentMarketing,
          // หลักฐาน PDPA ใช้เวลาจริงเสมอ ไม่ใช่นาฬิกาเดโมที่ถูกกดข้ามเวลาไว้
          consentAt: givesConsent ? new Date() : null,
        },
        select: PROFILE_SELECT,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw phoneTaken();
      throw error;
    }

    this.logger.log(`ลูกค้าสมัครเองผ่านหน้าร้าน ${customer.id}${lineUserId ? '' : ' (เดโม)'}`);

    return this.issueSession(customer);
  }

  private async issueSession(customer: ProfileRow): Promise<CustomerAuthResult> {
    const payload: CustomerSessionPayload = { sub: customer.id, typ: CUSTOMER_TOKEN_TYPE };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_CUSTOMER_SECRET'),
      expiresIn: CUSTOMER_SESSION_TTL_SECONDS,
    });

    return { status: 'ok', token, customer: toProfile(customer) };
  }
}

function toProfile(customer: ProfileRow): CustomerProfile {
  return {
    id: customer.id,
    name: customer.name,
    hasLineLinked: customer.lineUserId !== null,
    consentReminder: customer.consentReminder,
    consentMarketing: customer.consentMarketing,
  };
}

function phoneTaken(): ConflictException {
  return new ConflictException({
    error: ApiErrorCode.PHONE_ALREADY_REGISTERED,
    message: PHONE_TAKEN_MESSAGE,
  });
}
