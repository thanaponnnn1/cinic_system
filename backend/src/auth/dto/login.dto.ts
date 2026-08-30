import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@thnpclinic.com' })
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;

  @ApiProperty({ example: 'demo1234' })
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' })
  password: string;
}
