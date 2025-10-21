import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TagsRepository {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.tag.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.tag.findUnique({
      where: { slug },
    });
  }

  async create(data: Prisma.TagCreateInput) {
    return this.prisma.tag.create({
      data,
    });
  }

  async update(id: number, data: Prisma.TagUpdateInput) {
    return this.prisma.tag.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.tag.delete({
      where: { id },
    });
  }

  //méthode pour compter les événements liés
  async countEventsByTag(tagId: number) {
    return this.prisma.eventTag.count({
      where: { tagId },
    });
  }
}
