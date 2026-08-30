import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthUserDto, LoginResponseDto, TokenPairDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './auth.types';

@ApiTags('เข้าสู่ระบบ')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ขอ access token ใบใหม่',
    description: 'refresh token ใบเดิมจะถูกเพิกถอนทันที และได้ใบใหม่กลับไปแทน',
  })
  @ApiResponse({ status: 200, type: TokenPairDto })
  refresh(@Body() dto: RefreshDto): Promise<TokenPairDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'ออกจากระบบเฉพาะอุปกรณ์นี้' })
  logout(@Body() dto: RefreshDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ออกจากระบบทุกอุปกรณ์',
    description: 'ใช้เมื่อสงสัยว่าบัญชีถูกผู้อื่นเข้าถึง',
  })
  logoutAll(@CurrentUser('id') userId: string): Promise<void> {
    return this.auth.logoutAll(userId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ข้อมูลผู้ใช้ที่กำลังเข้าสู่ระบบอยู่' })
  @ApiResponse({ status: 200, type: AuthUserDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserDto> {
    return this.auth.getProfile(user.id);
  }
}
