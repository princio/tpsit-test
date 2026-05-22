import { Module } from '@nestjs/common';
import { GrigliaController } from './griglia.controller';
import { GrigliaService } from './griglia.service';

@Module({
  controllers: [GrigliaController],
  providers: [GrigliaService],
})
export class GrigliaModule {}
