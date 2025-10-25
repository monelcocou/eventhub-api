import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ==========================================
  // POST /events - Créer un événement
  // ==========================================
  @Post()
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Créer un événement (organizer/admin)' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: any) {
    return this.eventsService.create(createEventDto, user.id);
  }

  // ==========================================
  // GET /events - Liste des événements
  // ==========================================
  @Get()
  @Public()
  @ApiOperation({ summary: 'Liste des événements (public)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, example: 'published' })
  @ApiQuery({ name: 'categoryId', required: false, example: 1 })
  @ApiQuery({ name: 'search', required: false, example: 'concert' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: number,
    @Query('search') search?: string,
  ) {
    return this.eventsService.findAll(
      page ? +page : 1,
      limit ? +limit : 10,
      status,
      categoryId ? +categoryId : undefined,
      search,
    );
  }

  // ==========================================
  // GET /events/upcoming - Événements à venir
  // ==========================================
  @Get('upcoming')
  @Public()
  @ApiOperation({ summary: 'Événements à venir (public)' })
  findUpcoming() {
    return this.eventsService.findUpcoming();
  }

  // ==========================================
  // GET /events/my-events - Mes événements
  // ==========================================
  @Get('my-events')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mes événements (organizer/admin)' })
  findMyEvents(@CurrentUser() user: any) {
    return this.eventsService.findMyEvents(user.id);
  }

  // ==========================================
  // GET /events/:id - Détails d'un événement
  // ==========================================
  @Get(':id')
  @Public()
  @ApiOperation({ summary: "Détails d'un événement (public)" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  // ==========================================
  // PATCH /events/:id - Modifier un événement
  // ==========================================
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Modifier un événement (organizer propriétaire/admin)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.update(id, updateEventDto, user.id, user.role);
  }

  // ==========================================
  // DELETE /events/:id - Supprimer un événement
  // ==========================================
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Supprimer un événement (organizer propriétaire/admin)',
  })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.eventsService.remove(id, user.id, user.role);
  }
}
