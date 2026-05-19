import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { SyncService } from '../sync/sync.service';
import { validateTestSafe } from '../schema/validate';

export interface TestSummary {
  id: number;
  filePath: string;
  classe: string;
  materia: string;
  uda: string;
  title: string;
  latestVersionId: number | null;
  latestValidVersionId: number | null;
  /** True if the latest version on disk is valid. False if the file is currently broken. */
  currentlyValid: boolean | null;
  latestErrors: string | null;
}

export interface VersionSummary {
  id: number;
  testId: number;
  hash: string;
  title: string;
  valid: boolean;
  errors: string | null;
  createdAt: Date;
}

@Injectable()
export class TestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: SyncService,
  ) {}

  /**
   * Overwrites the canonical JSON file for the given test id with `data`,
   * validates it against the schema, and re-syncs to capture the new version.
   * Throws BadRequestException if validation fails.
   */
  async saveFile(id: number, data: unknown): Promise<unknown> {
    const test = await this.prisma.test.findUnique({ where: { id } });
    if (!test) throw new NotFoundException(`Test ${id} non trovato`);

    const validation = validateTestSafe(data);
    if (!validation.valid) {
      throw new BadRequestException(
        `JSON non conforme allo schema: ${validation.error}`,
      );
    }

    const absPath = path.join(this.sync.getPublicDir(), test.filePath);
    const serialized = JSON.stringify(data, null, 2) + '\n';
    await fs.writeFile(absPath, serialized, 'utf-8');

    const entry = await this.sync.syncFile(test.filePath);
    return {
      id: test.id,
      filePath: test.filePath,
      classe: test.classe,
      materia: test.materia,
      uda: test.uda,
      sync: entry,
    };
  }

  /**
   * Captures a new TestVersion in the DB for the given test without touching
   * the canonical file on disk. Validates the body and dedupes by content
   * hash: an identical hash returns the existing version instead of creating
   * a duplicate.
   */
  async saveVersion(id: number, data: unknown): Promise<unknown> {
    const test = await this.prisma.test.findUnique({ where: { id } });
    if (!test) throw new NotFoundException(`Test ${id} non trovato`);

    const validation = validateTestSafe(data);
    if (!validation.valid) {
      throw new BadRequestException(
        `JSON non conforme allo schema: ${validation.error}`,
      );
    }

    const serialized = JSON.stringify(data, null, 2) + '\n';
    const hash = createHash('sha256').update(serialized).digest('hex');

    const existing = await this.prisma.testVersion.findUnique({
      where: { testId_hash: { testId: test.id, hash } },
    });
    if (existing) {
      return {
        id: test.id,
        filePath: test.filePath,
        version: {
          id: existing.id,
          hash: existing.hash,
          title: existing.title,
          valid: existing.valid,
          createdAt: existing.createdAt,
        },
        status: 'unchanged',
      };
    }

    const title =
      typeof validation.data.title === 'string' && validation.data.title.trim()
        ? validation.data.title
        : test.filePath;

    const created = await this.prisma.testVersion.create({
      data: {
        testId: test.id,
        hash,
        data: serialized,
        title,
        valid: true,
        errors: null,
      },
    });

    return {
      id: test.id,
      filePath: test.filePath,
      version: {
        id: created.id,
        hash: created.hash,
        title: created.title,
        valid: created.valid,
        createdAt: created.createdAt,
      },
      status: 'new-version',
    };
  }

  async list(filters: {
    classe?: string;
    materia?: string;
    uda?: string;
  }): Promise<TestSummary[]> {
    const tests = await this.prisma.test.findMany({
      where: {
        classe: filters.classe,
        materia: filters.materia,
        uda: filters.uda,
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            title: true,
            valid: true,
            errors: true,
          },
        },
      },
      orderBy: [
        { classe: 'asc' },
        { materia: 'asc' },
        { uda: 'asc' },
        { id: 'asc' },
      ],
    });

    const summaries: TestSummary[] = [];
    for (const t of tests) {
      const latest = t.versions[0];
      let latestValidId: number | null = null;
      if (latest && !latest.valid) {
        const lv = await this.prisma.testVersion.findFirst({
          where: { testId: t.id, valid: true },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        latestValidId = lv?.id ?? null;
      } else if (latest?.valid) {
        latestValidId = latest.id;
      }
      summaries.push({
        id: t.id,
        filePath: t.filePath,
        classe: t.classe,
        materia: t.materia,
        uda: t.uda,
        title: latest?.title ?? t.filePath,
        latestVersionId: latest?.id ?? null,
        latestValidVersionId: latestValidId,
        currentlyValid: latest ? latest.valid : null,
        latestErrors: latest?.errors ?? null,
      });
    }
    return summaries;
  }

  /** Reads the test content directly from the local JSON file on disk. */
  async read(id: number): Promise<unknown> {
    const test = await this.prisma.test.findUnique({ where: { id } });
    if (!test) throw new NotFoundException(`Test ${id} non trovato`);

    const absPath = path.join(this.sync.getPublicDir(), test.filePath);
    let raw: string;
    try {
      raw = await fs.readFile(absPath, 'utf-8');
    } catch {
      throw new NotFoundException(`File non trovato su disco: ${test.filePath}`);
    }

    const parsed = this.tryParse(raw) ?? { __invalid: true, raw };
    return {
      id: test.id,
      filePath: test.filePath,
      classe: test.classe,
      materia: test.materia,
      uda: test.uda,
      ...(typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : { data: parsed }),
    };
  }

  async listVersions(testId: number): Promise<VersionSummary[]> {
    const exists = await this.prisma.test.findUnique({
      where: { id: testId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Test ${testId} non trovato`);

    const rows = await this.prisma.testVersion.findMany({
      where: { testId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        testId: true,
        hash: true,
        title: true,
        valid: true,
        errors: true,
        createdAt: true,
      },
    });
    return rows;
  }

  async readVersion(versionId: number): Promise<unknown> {
    const v = await this.prisma.testVersion.findUnique({
      where: { id: versionId },
      include: {
        test: {
          select: {
            id: true,
            filePath: true,
            classe: true,
            materia: true,
            uda: true,
          },
        },
      },
    });
    if (!v) throw new NotFoundException(`Versione ${versionId} non trovata`);

    const parsed = this.tryParse(v.data);
    return {
      id: v.id,
      testId: v.testId,
      hash: v.hash,
      valid: v.valid,
      errors: v.errors,
      createdAt: v.createdAt,
      test: v.test,
      data: parsed ?? v.data,
    };
  }

  private tryParse(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
