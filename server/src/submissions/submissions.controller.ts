import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import type { CreateSubmissionDto } from './submissions.service';

@Controller('api')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post('submissions')
  create(@Body() body: CreateSubmissionDto) {
    if (!body) throw new BadRequestException('Body mancante');
    return this.submissions.create(body);
  }

  @Get('submissions/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.submissions.findOne(id);
  }

  @Delete('submissions/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.submissions.remove(id);
  }

  @Get('tests/:id/submissions')
  listForTest(@Param('id', ParseIntPipe) id: number) {
    return this.submissions.listForTest(id);
  }
}
