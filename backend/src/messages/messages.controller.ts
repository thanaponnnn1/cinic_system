import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@clinicq/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { MessagesService } from './messages.service';
import { FindMessagesQueryDto, type MessageFeed } from './dto/message.dto';

@ApiTags('บันทึกการส่งข้อความ')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'ประวัติการส่งข้อความทั้งหมด',
    description:
      'รวมแถวที่ระบบเลือก "ไม่ส่ง" ด้วย ซึ่งคือหลักฐานตาม PDPA ว่าไม่ได้ส่งหาคนที่ไม่ยินยอม — ' +
      'ปิดไม่ให้ระดับ VIEWER เห็น เพราะรายการนี้ผูกกับชื่อลูกค้าเป็นรายคน',
  })
  findAll(@Query() query: FindMessagesQueryDto): Promise<MessageFeed> {
    return this.messages.findAll(query);
  }
}
