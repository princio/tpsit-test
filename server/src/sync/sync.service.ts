import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { existsSync, statSync } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { validateTestSafe } from '../schema/validate';

/**
 * Locates the canonical public/ directory by walking up from this file's
 * compiled location. PUBLIC_DIR env var overrides everything.
 */
function resolvePublicDir(): string {
  if (process.env['PUBLIC_DIR']) return path.resolve(process.env['PUBLIC_DIR']);
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'public');
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not locate public/ directory above ${__dirname}. Set PUBLIC_DIR env var.`,
  );
}

export interface PathMeta {
  classe: string;
  materia: string;
  uda: string;
}

export interface SyncEntry {
  filePath: string;
  status: 'new' | 'new-version' | 'unchanged' | 'error';
  valid?: boolean;
  errors?: string;
  versionId?: number;
  testId?: number;
}

export interface SyncResult {
  publicDir: string;
  scanned: number;
  newTests: number;
  newVersions: number;
  unchanged: number;
  invalid: number;
  entries: SyncEntry[];
}

/**
 * Walks the canonical JSON files under public/, hashes each one,
 * and appends a TestVersion row whenever an unseen content hash appears.
 * Validation errors are stored on the version with `valid=false`.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly publicDir = resolvePublicDir();

  constructor(private readonly prisma: PrismaService) {}

  getPublicDir(): string {
    return this.publicDir;
  }

  async sync(): Promise<SyncResult> {
    const files = await this.walk(this.publicDir);
    const result: SyncResult = {
      publicDir: this.publicDir,
      scanned: files.length,
      newTests: 0,
      newVersions: 0,
      unchanged: 0,
      invalid: 0,
      entries: [],
    };

    for (const absPath of files) {
      try {
        const entry = await this.syncOne(absPath);
        result.entries.push(entry);
        if (entry.status === 'new') result.newTests++;
        if (entry.status === 'new' || entry.status === 'new-version')
          result.newVersions++;
        if (entry.status === 'unchanged') result.unchanged++;
        if (entry.valid === false) result.invalid++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`Failed to sync ${absPath}: ${msg}`);
        result.entries.push({
          filePath: path.relative(this.publicDir, absPath),
          status: 'error',
          errors: msg,
        });
      }
    }

    this.logger.log(
      `sync: scanned=${result.scanned} new=${result.newTests} ` +
        `versions=${result.newVersions} unchanged=${result.unchanged} ` +
        `invalid=${result.invalid}`,
    );
    return result;
  }

  private async syncOne(absPath: string): Promise<SyncEntry> {
    const filePath = path.relative(this.publicDir, absPath).replace(/\\/g, '/');
    const raw = await fs.readFile(absPath, 'utf-8');
    const hash = createHash('sha256').update(raw).digest('hex');
    const meta = this.inferMeta(filePath);

    let parsed: unknown = null;
    let parseError: string | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }

    const validation =
      parseError == null
        ? validateTestSafe(parsed)
        : { valid: false as const, error: `JSON parse: ${parseError}` };

    const title =
      validation.valid && typeof validation.data.title === 'string'
        ? validation.data.title
        : filePath;

    // Find or create the Test row (one per file).
    const existingTest = await this.prisma.test.findUnique({
      where: { filePath },
    });
    const isNewTest = !existingTest;
    const test =
      existingTest ??
      (await this.prisma.test.create({
        data: {
          filePath,
          classe: meta.classe,
          materia: meta.materia,
          uda: meta.uda,
        },
      }));

    // Keep classe/materia/uda in sync with current path (in case files moved).
    if (
      existingTest &&
      (existingTest.classe !== meta.classe ||
        existingTest.materia !== meta.materia ||
        existingTest.uda !== meta.uda)
    ) {
      await this.prisma.test.update({
        where: { id: existingTest.id },
        data: { classe: meta.classe, materia: meta.materia, uda: meta.uda },
      });
    }

    // Has this exact content been captured before?
    const existingVersion = await this.prisma.testVersion.findUnique({
      where: { testId_hash: { testId: test.id, hash } },
    });
    if (existingVersion) {
      return {
        filePath,
        status: 'unchanged',
        valid: existingVersion.valid,
        errors: existingVersion.errors ?? undefined,
        versionId: existingVersion.id,
        testId: test.id,
      };
    }

    const version = await this.prisma.testVersion.create({
      data: {
        testId: test.id,
        hash,
        data: raw,
        title,
        valid: validation.valid,
        errors: validation.valid ? null : validation.error,
      },
    });

    return {
      filePath,
      status: isNewTest ? 'new' : 'new-version',
      valid: validation.valid,
      errors: validation.valid ? undefined : validation.error,
      versionId: version.id,
      testId: test.id,
    };
  }

  private async walk(dir: string, out: string[] = []): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await this.walk(full, out);
      else if (e.isFile() && e.name.endsWith('.json')) out.push(full);
    }
    return out;
  }

  /**
   * Maps the relative path (under public/) to (classe, materia, uda).
   *
   *  - `terza/sistema-operativo/sistema-operativo.json`
   *      → classe="terza", materia="sistema-operativo", uda="sistema-operativo"
   *  - `ed.civica/quarta/amministrazione-digitale/file.json`
   *      → classe="quarta", materia="ed.civica", uda="amministrazione-digitale"
   *  - `ed.civica/quinta/prova.json`
   *      → classe="quinta", materia="ed.civica", uda="quinta"
   */
  private inferMeta(relPath: string): PathMeta {
    const parts = relPath.split('/');
    const dirs = parts.slice(0, -1);
    const uda = dirs[dirs.length - 1] ?? '';
    if (dirs[0]?.startsWith('ed.')) {
      return {
        classe: dirs[1] ?? '',
        materia: dirs[0],
        uda,
      };
    }
    return {
      classe: dirs[0] ?? '',
      materia: dirs[1] ?? '',
      uda,
    };
  }
}
