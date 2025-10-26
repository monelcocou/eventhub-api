import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsRepository } from './events.repository';
import slugify from 'slugify';

@Injectable()
export class EventsService {
  constructor(private readonly repository: EventsRepository) {}

  // ==========================================
  // 1. CREATE - Créer un événement
  // ==========================================
  async create(createEventDto: CreateEventDto, organizerId: number) {
    // Générer le slug depuis le titre
    const slug = slugify(createEventDto.title, {
      lower: true,
      strict: true,
    });

    // Vérifier que le slug n'existe pas déjà
    const existingBySlug = await this.repository.findBySlug(slug);
    if (existingBySlug) {
      throw new ConflictException('An event with this title already exists');
    }

    // Valider les dates
    this.validateDates(
      new Date(createEventDto.startDate),
      new Date(createEventDto.endDate),
    );

    // Créer l'événement
    return this.repository.create({
      title: createEventDto.title,
      slug,
      description: createEventDto.description,
      image: createEventDto.image,
      location: createEventDto.location,
      startDate: new Date(createEventDto.startDate),
      endDate: new Date(createEventDto.endDate),
      maxParticipants: createEventDto.maxParticipants,
      price: createEventDto.price,
      status: createEventDto.status || 'draft',
      organizer: {
        connect: { id: organizerId },
      },
      category: {
        connect: { id: createEventDto.categoryId },
      },
    });
  }

  // ==========================================
  // 2. FIND ALL - Lister les événements
  // ==========================================
  async findAll(
    page = 1,
    limit = 10,
    status?: string,
    categoryId?: number,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    // Construire les filtres
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.repository.findAll({
      skip,
      take: limit,
      where,
      orderBy: { startDate: 'asc' },
    });

    //Utilisation
    // # Événements publiés
    //   curl "http://localhost:3000/events?status=published"
    //
    // # Catégorie 1
    //   curl "http://localhost:3000/events?categoryId=1"
    //
    // # Recherche
    //   curl "http://localhost:3000/events?search=concert"
    //
    // # Pagination
    //   curl "http://localhost:3000/events?page=1&limit=10"
    //
    // # Combiné
    //   curl "http://localhost:3000/events?status=published&categoryId=1&page=1&limit=10"
  }

  // ==========================================
  // 3. FIND ONE - Détails d'un événement
  // ==========================================
  async findOne(id: number) {
    const event = await this.repository.findById(id);

    if (!event) {
      throw new NotFoundException(`Event #${id} not found`);
    }

    return event;
  }

  // ==========================================
  // 4. FIND BY SLUG - Par slug
  // ==========================================
  async findBySlug(slug: string) {
    const event = await this.repository.findBySlug(slug);

    if (!event) {
      throw new NotFoundException(`Event with slug "${slug}" not found`);
    }

    return event;
  }

  // ==========================================
  // 5. UPDATE - Modifier un événement
  // ==========================================
  async update(
    id: number,
    updateEventDto: UpdateEventDto,
    userId: number,
    userRole: string,
  ) {
    // Vérifier que l'événement existe
    const event = await this.findOne(id);

    // Vérifier les permissions (organizer propriétaire ou admin)
    if (event.organizerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only update your own events');
    }

    // Si le titre change, regénérer le slug et vérifier l'unicité
    let slug: string | undefined;
    if (updateEventDto.title) {
      slug = slugify(updateEventDto.title, {
        lower: true,
        strict: true,
      });

      const existingBySlug = await this.repository.findBySlug(slug);
      if (existingBySlug && existingBySlug.id !== id) {
        throw new ConflictException('An event with this title already exists');
      }
    }

    // Valider les dates si modifiées
    if (updateEventDto.startDate || updateEventDto.endDate) {
      const startDate = updateEventDto.startDate
        ? new Date(updateEventDto.startDate)
        : event.startDate;
      const endDate = updateEventDto.endDate
        ? new Date(updateEventDto.endDate)
        : event.endDate;

      this.validateDates(startDate, endDate);
    }

    // Mettre à jour
    const updateData: any = {
      ...updateEventDto,
      slug,
    };

    // Convertir les dates si présentes
    if (updateEventDto.startDate) {
      updateData.startDate = new Date(updateEventDto.startDate);
    }
    if (updateEventDto.endDate) {
      updateData.endDate = new Date(updateEventDto.endDate);
    }

    // Mettre à jour la catégorie si changée
    if (updateEventDto.categoryId) {
      updateData.category = {
        connect: { id: updateEventDto.categoryId },
      };
      delete updateData.categoryId;
    }

    return this.repository.update(id, updateData);
  }

  // ==========================================
  // 6. DELETE - Supprimer un événement
  // ==========================================
  async remove(id: number, userId: number, userRole: string) {
    // Vérifier que l'événement existe
    const event = await this.findOne(id);

    // Vérifier les permissions
    if (event.organizerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own events');
    }

    // Vérifier qu'il n'y a pas d'inscriptions confirmées
    const registrationCount = await this.repository.countRegistrations(id);

    if (registrationCount > 0) {
      throw new BadRequestException(
        `Cannot delete event with ${registrationCount} confirmed registration(s)`,
      );
    }

    // Supprimer (soft delete)
    await this.repository.delete(id);

    return { message: 'Event successfully deleted' };
  }

  // ==========================================
  // 7. FIND MY EVENTS - Mes événements (organizer)
  // ==========================================
  async findMyEvents(userId: number) {
    return this.repository.findAll({
      where: { organizerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // 8. FIND UPCOMING - Événements à venir
  // ==========================================
  async findUpcoming() {
    return this.repository.findAll({
      where: {
        status: 'published',
        startDate: {
          gte: new Date(),
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  // ==========================================
  // MÉTHODES PRIVÉES (helpers)
  // ==========================================

  private validateDates(startDate: Date, endDate: Date) {
    const now = new Date();

    // Vérifier que la date de début est dans le futur
    if (startDate < now) {
      throw new BadRequestException('Start date must be in the future');
    }

    // Vérifier que la date de fin est après la date de début
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }
  }
}
