import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { SyncModule } from './sync/sync.module';
import { TestsModule } from './tests/tests.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { GrigliaModule } from './griglia/griglia.module';

@Module({
  imports: [PrismaModule, SyncModule, TestsModule, SubmissionsModule, GrigliaModule],
})
export class AppModule {}
