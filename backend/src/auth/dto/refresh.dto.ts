import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'refresh token ที่ได้ตอนเข้าสู่ระบบ' })
  @IsString()
  @MinLength(1)
  refreshToken: string;
}
