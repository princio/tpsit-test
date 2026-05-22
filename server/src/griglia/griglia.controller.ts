import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  Query,
} from '@nestjs/common';
import { GrigliaService } from './griglia.service';

@Controller('api/griglia')
export class GrigliaController {
  constructor(private readonly griglia: GrigliaService) {}

  @Get()
  find(@Query('key') key: string) {
    if (!key) throw new BadRequestException('"key" mancante');
    return this.griglia.findByKey(key);
  }

  @Put()
  upsert(
    @Query('key') key: string,
    @Body() body: { students: unknown; weights: unknown },
  ) {
    if (!key) throw new BadRequestException('"key" mancante');
    return this.griglia.upsert(key, body);
  }
}
