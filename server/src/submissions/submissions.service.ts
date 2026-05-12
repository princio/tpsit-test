import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateSubmissionDto {
  testVersionId: number;
  studentName?: string;
  answers: unknown;
  score?: number;
}

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(s: {
    id: number;
    testId: number;
    testVersionId: number;
    studentName: string | null;
    answers: string;
    score: number | null;
    createdAt: Date;
    test?: {
      filePath: string;
      classe: string;
      materia: string;
      uda: string;
    };
    testVersion?: { hash: string; title: string; valid: boolean };
  }) {
    return {
      id: s.id,
      testId: s.testId,
      testVersionId: s.testVersionId,
      test: s.test,
      version: s.testVersion,
      studentName: s.studentName,
      answers: JSON.parse(s.answers),
      score: s.score,
      createdAt: s.createdAt,
    };
  }

  async create(dto: CreateSubmissionDto) {
    if (!dto || typeof dto.testVersionId !== 'number') {
      throw new BadRequestException('"testVersionId" mancante o non numerico');
    }
    if (dto.answers === undefined) {
      throw new BadRequestException('"answers" mancante');
    }

    const version = await this.prisma.testVersion.findUnique({
      where: { id: dto.testVersionId },
    });
    if (!version) {
      throw new NotFoundException(
        `Versione ${dto.testVersionId} non trovata`,
      );
    }

    const submission = await this.prisma.submission.create({
      data: {
        testId: version.testId,
        testVersionId: version.id,
        studentName: dto.studentName ?? null,
        answers: JSON.stringify(dto.answers),
        score: typeof dto.score === 'number' ? dto.score : null,
      },
      include: {
        test: {
          select: { filePath: true, classe: true, materia: true, uda: true },
        },
        testVersion: { select: { hash: true, title: true, valid: true } },
      },
    });

    return this.serialize(submission);
  }

  async listForTest(testId: number) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test) {
      throw new NotFoundException(`Test ${testId} non trovato`);
    }

    const rows = await this.prisma.submission.findMany({
      where: { testId },
      orderBy: { createdAt: 'desc' },
      include: {
        test: {
          select: { filePath: true, classe: true, materia: true, uda: true },
        },
        testVersion: { select: { hash: true, title: true, valid: true } },
      },
    });
    return rows.map((r) => this.serialize(r));
  }

  async findOne(id: number) {
    const row = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        test: {
          select: { filePath: true, classe: true, materia: true, uda: true },
        },
        testVersion: { select: { hash: true, title: true, valid: true } },
      },
    });
    if (!row) {
      throw new NotFoundException(`Submission ${id} non trovata`);
    }
    return this.serialize(row);
  }

  async remove(id: number) {
    try {
      await this.prisma.submission.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Submission ${id} non trovata`);
    }
    return { id };
  }
}
