import { Module } from '@nestjs/common';
import { SyncModule } from '../sync/sync.module';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
  imports: [SyncModule],
  controllers: [TestsController],
  providers: [TestsService],
})
export class TestsModule {}
