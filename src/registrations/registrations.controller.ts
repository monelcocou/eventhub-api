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
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  // ==========================================
  // POST /registrations - S'inscrire à un événement
  // ==========================================
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "S'inscrire à un événement" })
  @HttpCode(HttpStatus.CREATED)
  register(
    @Body() createRegistrationDto: CreateRegistrationDto,
    @CurrentUser() user: any,
  ) {
    return this.registrationsService.register(createRegistrationDto, user.id);
  }

  // ==========================================
  // GET /registrations/my-registrations - Mes inscriptions
  // ==========================================
  @Get('my-registrations')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mes inscriptions' })
  findMyRegistrations(@CurrentUser() user: any) {
    return this.registrationsService.findMyRegistrations(user.id);
  }

  // ==========================================
  // GET /registrations/event/:eventId - Liste des inscrits (organizer/admin)
  // ==========================================
  @Get('event/:eventId')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Liste des inscrits à un événement (organizer/admin)',
  })
  @ApiParam({ name: 'eventId', type: 'number', example: 1 })
  findEventRegistrations(
    @Param('eventId', ParseIntPipe) eventId: number,
    @CurrentUser() user: any,
  ) {
    return this.registrationsService.findEventRegistrations(
      eventId,
      user.id,
      user.role,
    );
  }

  // ==========================================
  // GET /registrations/event/:eventId/is-registered - Vérifier si inscrit
  // ==========================================
  @Get('event/:eventId/is-registered')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vérifier si je suis inscrit à un événement' })
  @ApiParam({ name: 'eventId', type: 'number', example: 1 })
  isRegistered(
    @Param('eventId', ParseIntPipe) eventId: number,
    @CurrentUser() user: any,
  ) {
    return this.registrationsService.isRegistered(eventId, user.id);
  }

  // ==========================================
  // DELETE /registrations/event/:eventId - Se désinscrire
  // ==========================================
  @Delete('event/:eventId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Se désinscrire d'un événement" })
  @ApiParam({ name: 'eventId', type: 'number', example: 1 })
  @HttpCode(HttpStatus.OK)
  unregister(
    @Param('eventId', ParseIntPipe) eventId: number,
    @CurrentUser() user: any,
  ) {
    return this.registrationsService.unregister(eventId, user.id);
  }

  // ==========================================
  // PATCH /registrations/event/:eventId/user/:userId - Changer status (organizer/admin)
  // ==========================================
  @Patch('event/:eventId/user/:userId')
  @UseGuards(RolesGuard)
  @Roles('organizer', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Mettre à jour le status d'une inscription (organizer/admin)",
  })
  @ApiParam({ name: 'eventId', type: 'number', example: 1 })
  @ApiParam({ name: 'userId', type: 'number', example: 5 })
  updateStatus(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateRegistrationDto: UpdateRegistrationDto,
    @CurrentUser() user: any,
  ) {
    return this.registrationsService.updateStatus(
      eventId,
      userId,
      updateRegistrationDto,
      user.id,
      user.role,
    );
  }
}
