import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { TestsService } from './tests.service';

@Controller('api/tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get()
  list() {
    return this.testsService.list();
  }

  @Get(':filename')
  read(@Param('filename') filename: string) {
    return this.testsService.read(filename);
  }

  @Put(':filename')
  save(@Param('filename') filename: string, @Body() body: any) {
    return this.testsService.save(filename, body);
  }
}
