import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { RegistrationsRepository } from './registrations.repository';
import { EventsService } from '../events/events.service';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly repository: RegistrationsRepository,
    private readonly eventsService: EventsService,
  ) {}

  // ==========================================
  // 1. S'INSCRIRE À UN ÉVÉNEMENT
  // ==========================================
  async register(createRegistrationDto: CreateRegistrationDto, userId: number) {
    const { eventId } = createRegistrationDto;

    // 1. Vérifier que l'événement existe
    const event = await this.eventsService.findOne(eventId);

    // 2. Vérifier que l'événement est publié
    if (event.status !== 'published') {
      throw new BadRequestException('Cannot register to unpublished event');
    }

    // 3. Vérifier que l'événement n'est pas passé
    const now = new Date();
    if (new Date(event.startDate) < now) {
      throw new BadRequestException('Cannot register to past event');
    }

    // 4. Vérifier que l'utilisateur n'est pas déjà inscrit
    const existingRegistration = await this.repository.findByUserAndEvent(
      userId,
      eventId,
    );

    if (existingRegistration) {
      throw new ConflictException('You are already registered to this event');
    }

    // 5. Vérifier que l'événement n'est pas complet
    if (event.maxParticipants) {
      const confirmedCount = await this.repository.countConfirmed(eventId);

      if (confirmedCount >= event.maxParticipants) {
        throw new BadRequestException('Event is full');
      }
    }

    // 6. Créer l'inscription
    return this.repository.create({
      status: createRegistrationDto.status || 'confirmed',
      user: {
        connect: { id: userId },
      },
      event: {
        connect: { id: eventId },
      },
    });
  }

  // ==========================================
  // 2. SE DÉSINSCRIRE D'UN ÉVÉNEMENT
  // ==========================================
  async unregister(eventId: number, userId: number) {
    // 1. Vérifier que l'événement existe
    await this.eventsService.findOne(eventId);

    // 2. Vérifier que l'inscription existe
    const registration = await this.repository.findByUserAndEvent(
      userId,
      eventId,
    );

    if (!registration) {
      throw new NotFoundException('You are not registered to this event');
    }

    // 3. Vérifier que l'événement n'a pas encore commencé (optionnel)
    const event = await this.eventsService.findOne(eventId);
    const now = new Date();

    if (new Date(event.startDate) < now) {
      throw new BadRequestException(
        'Cannot unregister from an event that has already started',
      );
    }

    // 4. Supprimer l'inscription
    await this.repository.delete(userId, eventId);

    return { message: 'Successfully unregistered from event' };
  }

  // ==========================================
  // 3. MES INSCRIPTIONS (USER)
  // ==========================================
  async findMyRegistrations(userId: number) {
    return this.repository.findByUser(userId);
  }

  // ==========================================
  // 4. INSCRITS À UN ÉVÉNEMENT (ORGANIZER/ADMIN)
  // ==========================================
  async findEventRegistrations(
    eventId: number,
    userId: number,
    userRole: string,
  ) {
    // 1. Vérifier que l'événement existe
    const event = await this.eventsService.findOne(eventId);

    // 2. Vérifier les permissions (organizer propriétaire ou admin)
    if (event.organizerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException(
        'You can only view registrations for your own events',
      );
    }

    // 3. Retourner la liste
    return this.repository.findByEvent(eventId);
  }

  // ==========================================
  // 5. VÉRIFIER SI JE SUIS INSCRIT
  // ==========================================
  async isRegistered(eventId: number, userId: number) {
    // Vérifier que l'événement existe
    await this.eventsService.findOne(eventId);

    const isRegistered = await this.repository.isRegistered(userId, eventId);

    return { isRegistered };
  }

  // ==========================================
  // 6. METTRE À JOUR LE STATUS (ORGANIZER/ADMIN)
  // ==========================================
  async updateStatus(
    eventId: number,
    registrationUserId: number,
    updateDto: UpdateRegistrationDto,
    currentUserId: number,
    currentUserRole: string,
  ) {
    // 1. Vérifier que l'événement existe
    const event = await this.eventsService.findOne(eventId);

    // 2. Vérifier les permissions
    if (event.organizerId !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException(
        'You can only update registrations for your own events',
      );
    }

    // 3. Vérifier que l'inscription existe
    const registration = await this.repository.findByUserAndEvent(
      registrationUserId,
      eventId,
    );

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    // 4. Mettre à jour le status
    return this.repository.updateStatus(
      registrationUserId,
      eventId,
      updateDto.status,
    );
  }
}
