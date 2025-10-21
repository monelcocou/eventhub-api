import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}
  async create(createUserDto: CreateUserDto) {
    // Vérifier que l'email n'existe pas déjà
    const existing = await this.repository.findByEmail(createUserDto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // Créer l'utilisateur
    return this.repository.create(createUserDto);
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.repository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string) {
    return this.repository.findByEmailWithPassword(email);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Vérifier que l'utilisateur existe
    await this.findOne(id);

    // Si l'email change, vérifier qu'il n'est pas déjà pris
    if (updateUserDto.email) {
      const existing = await this.repository.findByEmail(updateUserDto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    // Mettre à jour
    return this.repository.update(id, updateUserDto);
  }

  async remove(id: number) {
    // Vérifier que l'utilisateur existe
    await this.findOne(id);

    // Soft delete
    await this.repository.delete(id);

    return { message: 'User successfully deleted' };
  }
}
