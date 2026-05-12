import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { TestsService } from './tests.service';

@Controller('api')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get('tests')
  list(
    @Query('classe') classe?: string,
    @Query('materia') materia?: string,
    @Query('uda') uda?: string,
  ) {
    return this.testsService.list({ classe, materia, uda });
  }

  @Get('tests/:id')
  read(@Param('id', ParseIntPipe) id: number) {
    return this.testsService.read(id);
  }

  @Get('tests/:id/versions')
  listVersions(@Param('id', ParseIntPipe) id: number) {
    return this.testsService.listVersions(id);
  }

  @Get('versions/:versionId')
  readVersion(@Param('versionId', ParseIntPipe) versionId: number) {
    return this.testsService.readVersion(versionId);
  }

  @Put('tests/:id/file')
  saveFile(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.testsService.saveFile(id, body);
  }

  @Post('tests/:id/versions')
  saveVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.testsService.saveVersion(id, body);
  }
}
