import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Reads the latest valid version's content. Falls back to the latest version
   * (which may be invalid) if no valid version exists.
   */
  async read(id: number): Promise<unknown> {
    const test = await this.prisma.test.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!test) throw new NotFoundException(`Test ${id} non trovato`);

    let chosen = test.versions[0];
    if (chosen && !chosen.valid) {
      const valid = await this.prisma.testVersion.findFirst({
        where: { testId: id, valid: true },
        orderBy: { createdAt: 'desc' },
      });
      if (valid) chosen = valid;
    }
    if (!chosen) {
      throw new NotFoundException(`Nessuna versione disponibile per il test ${id}`);
    }

    const parsed =
      this.tryParse(chosen.data) ?? { __invalid: true, raw: chosen.data };
    return {
      id: test.id,
      filePath: test.filePath,
      classe: test.classe,
      materia: test.materia,
      uda: test.uda,
      versionId: chosen.id,
      versionValid: chosen.valid,
      versionErrors: chosen.errors,
      versionCreatedAt: chosen.createdAt,
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
