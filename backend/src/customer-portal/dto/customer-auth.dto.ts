import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LiffLoginDto {
  @ApiProperty({ description: 'ID token ที่ได้จาก liff.getIDToken()' })
  @IsString()
  @MinLength(1, { message: 'ไม่พบ ID token จาก LINE' })
  @MaxLength(4096)
  idToken: string;
}

export class LinkAccountDto extends LiffLoginDto {
  @ApiProperty({ example: '482913', description: 'รหัสเชื่อม 6 หลักที่พนักงานสร้างให้' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'รหัสเชื่อมต้องเป็นตัวเลข 6 หลัก' })
  code: string;
}

/**
 * ข้อมูลสมัครของลูกค้าใหม่ — กฎชื่อกับเบอร์ต้องตรงกับ CreateCustomerDto ฝั่งพนักงาน
 * ไม่งั้นเบอร์เดียวกันที่พิมพ์ต่างรูปแบบจะหลุดการกันเบอร์ซ้ำ
 *
 * ความยินยอมสองช่องบังคับส่งมาเสมอ (true หรือ false) เพราะหน้าสมัครต้องให้ลูกค้าเลือกเอง
 * การไม่ส่งมาแล้วถือว่า false จะทำให้พิสูจน์ไม่ได้ว่าลูกค้าเห็นตัวเลือกนั้นจริง
 */
export class DemoRegisterDto {
  @ApiProperty({ example: 'สมหญิง ใจดี' })
  @IsString()
  @MinLength(1, { message: 'ต้องระบุชื่อ' })
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({ example: '0812345678', description: 'เบอร์มือถือ 10 หลัก' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
  @Matches(/^0\d{8,9}$/, { message: 'เบอร์โทรไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก)' })
  phone: string;

  @ApiProperty({ description: 'ยินยอมรับข้อความเตือนนัดทาง LINE' })
  @IsBoolean()
  consentReminder: boolean;

  @ApiProperty({ description: 'ยินยอมรับข่าวสารและโปรโมชันทาง LINE' })
  @IsBoolean()
  consentMarketing: boolean;
}

export class RegisterCustomerDto extends DemoRegisterDto {
  @ApiProperty({ description: 'ID token ที่ได้จาก liff.getIDToken()' })
  @IsString()
  @MinLength(1, { message: 'ไม่พบ ID token จาก LINE' })
  @MaxLength(4096)
  idToken: string;
}

export class DemoLoginDto {
  @ApiProperty({ description: 'ลูกค้าจาก GET /api/customer/demo/customers' })
  @IsString()
  @MinLength(1)
  customerId: string;
}
