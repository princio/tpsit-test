import { Module } from '@nestjs/common';
import { TestsModule } from './tests/tests.module';

@Module({
  imports: [TestsModule],
})
export class AppModule {}
