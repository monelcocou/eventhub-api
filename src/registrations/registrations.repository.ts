import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  registrationBasicSelect,
  registrationWithRelationsSelect,
  registrationListSelect,
} from './registrations.select';

@Injectable()
export class RegistrationsRepository {
  constructor(private prisma: PrismaService) {}

  // Trouver une inscription spécifique (user + event)
  async findByUserAndEvent(userId: number, eventId: number) {
    return this.prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
      select: registrationBasicSelect,
    });
  }

  // Créer une inscription
  async create(data: Prisma.RegistrationCreateInput) {
    return this.prisma.registration.create({
      data,
      select: registrationWithRelationsSelect,
    });
  }

  // Mettre à jour le status
  async updateStatus(userId: number, eventId: number, status: string) {
    return this.prisma.registration.update({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
      data: { status },
      select: registrationBasicSelect,
    });
  }

  // Supprimer une inscription
  async delete(userId: number, eventId: number) {
    return this.prisma.registration.delete({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });
  }

  // Mes inscriptions (user)
  async findByUser(userId: number) {
    return this.prisma.registration.findMany({
      where: { userId },
      select: registrationWithRelationsSelect,
      orderBy: { registeredAt: 'desc' },
    });
  }

  // Liste des inscrits d'un événement (organizer)
  async findByEvent(eventId: number) {
    return this.prisma.registration.findMany({
      where: { eventId },
      select: registrationListSelect,
      orderBy: { registeredAt: 'asc' },
    });
  }

  // Compter les inscriptions confirmées
  async countConfirmed(eventId: number) {
    return this.prisma.registration.count({
      where: {
        eventId,
        status: 'confirmed',
      },
    });
  }

  // Vérifier si l'utilisateur est inscrit
  async isRegistered(userId: number, eventId: number) {
    const registration = await this.findByUserAndEvent(userId, eventId);
    return !!registration;
  }
}
