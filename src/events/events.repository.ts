import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  eventBasicSelect,
  eventWithRelationsSelect,
  eventListSelect,
} from './events.select';

@Injectable()
export class EventsRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.EventWhereInput;
    orderBy?: Prisma.EventOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params || {};

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        skip,
        take,
        where,
        orderBy,
        select: eventListSelect,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { events, total };
  }

  async findById(id: number) {
    return this.prisma.event.findUnique({
      where: { id },
      select: eventWithRelationsSelect,
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.event.findUnique({
      where: { slug },
      select: eventWithRelationsSelect,
    });
  }

  async create(data: Prisma.EventCreateInput) {
    return this.prisma.event.create({
      data,
      select: eventBasicSelect,
    });
  }

  async update(id: number, data: Prisma.EventUpdateInput) {
    return this.prisma.event.update({
      where: { id },
      data,
      select: eventBasicSelect,
    });
  }

  async delete(id: number) {
    return this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countRegistrations(eventId: number) {
    return this.prisma.registration.count({
      where: {
        eventId,
        status: 'confirmed',
      },
    });
  }

  // async findWithStatistics() {
  //   return this.prisma.$queryRaw`
  //   SELECT
  //     e.*,
  //     COUNT(r.id) as registration_count,
  //     AVG(rating) as avg_rating
  //   FROM events e
  //   LEFT JOIN registrations r ON e.id = r.event_id
  //   GROUP BY e.id
  //   HAVING COUNT(r.id) > 10
  // `;
  // }
}
