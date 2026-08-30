import { ApiProperty } from '@nestjs/swagger';
import { ROLE_LABEL, type Role } from '@clinicq/shared';

export class AuthUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['ADMIN', 'STAFF', 'VIEWER'] })
  role: Role;

  @ApiProperty({ description: 'ชื่อสิทธิ์ภาษาไทยสำหรับแสดงผล', example: 'พนักงาน' })
  roleLabel: string;

  static from(user: { id: string; email: string; name: string; role: Role }): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleLabel: ROLE_LABEL[user.role],
    };
  }
}

export class TokenPairDto {
  @ApiProperty({ description: 'ใช้แนบใน header Authorization: Bearer <token>' })
  accessToken: string;

  @ApiProperty({ description: 'ใช้ขอ access token ใบใหม่เมื่อใบเดิมหมดอายุ' })
  refreshToken: string;
}

export class LoginResponseDto extends TokenPairDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
