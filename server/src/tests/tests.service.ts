import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class TestsService {
  private readonly testsDir = path.resolve(__dirname, '..', '..', '..', 'public');

  private sanitize(filename: string): string {
    const base = path.basename(filename);
    if (!base.endsWith('.json')) {
      return base + '.json';
    }
    return base;
  }

  async list(): Promise<{ filename: string; title: string }[]> {
    const files = await fs.readdir(this.testsDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const results = await Promise.all(
      jsonFiles.map(async (filename) => {
        try {
          const raw = await fs.readFile(
            path.join(this.testsDir, filename),
            'utf-8',
          );
          const data = JSON.parse(raw);
          return { filename, title: data.title || filename };
        } catch {
          return { filename, title: filename };
        }
      }),
    );

    return results;
  }

  async read(filename: string): Promise<any> {
    const safe = this.sanitize(filename);
    const filePath = path.join(this.testsDir, safe);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      throw new NotFoundException(`Test "${safe}" non trovato`);
    }
  }

  async save(filename: string, data: any): Promise<{ filename: string }> {
    const safe = this.sanitize(filename);
    const filePath = path.join(this.testsDir, safe);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { filename: safe };
  }
}
