import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { SyncService } from './sync/sync.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const logger = new Logger('Bootstrap');

  const syncService = app.get(SyncService);
  try {
    const result = await syncService.sync();
    logger.log(
      `Startup sync: ${result.newTests} new tests, ${result.newVersions} new versions, ` +
        `${result.unchanged} unchanged, ${result.invalid} invalid`,
    );
  } catch (e) {
    logger.error('Startup sync failed', e instanceof Error ? e.stack : e);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
