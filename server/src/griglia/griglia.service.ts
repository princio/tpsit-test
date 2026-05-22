import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GrigliaSessionDto {
  students: unknown;
  weights: unknown;
}

@Injectable()
export class GrigliaService {
  constructor(private readonly prisma: PrismaService) {}

  private deserialize(row: {
    key: string;
    students: string;
    weights: string;
    updatedAt: Date;
    createdAt: Date;
  }) {
    return {
      key: row.key,
      students: JSON.parse(row.students),
      weights: JSON.parse(row.weights),
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    };
  }

  async findByKey(key: string) {
    const row = await this.prisma.grigliaSession.findUnique({ where: { key } });
    if (!row) throw new NotFoundException(`Griglia per "${key}" non trovata`);
    return this.deserialize(row);
  }

  async upsert(key: string, dto: GrigliaSessionDto) {
    const row = await this.prisma.grigliaSession.upsert({
      where: { key },
      create: {
        key,
        students: JSON.stringify(dto.students ?? []),
        weights: JSON.stringify(dto.weights ?? {}),
      },
      update: {
        students: JSON.stringify(dto.students ?? []),
        weights: JSON.stringify(dto.weights ?? {}),
      },
    });
    return this.deserialize(row);
  }
}
