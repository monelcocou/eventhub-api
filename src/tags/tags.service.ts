import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsRepository } from './tags.repository';
import slugify from 'slugify';

@Injectable()
export class TagsService {
  constructor(private readonly repository: TagsRepository) {}
  async create(createTagDto: CreateTagDto) {
    // Générer le slug depuis le nom
    const slug = slugify(createTagDto.name, {
      lower: true,
      strict: true,
    });

    // Vérifier que le slug n'existe pas déjà
    const existingBySlug = await this.repository.findBySlug(slug);
    if (existingBySlug) {
      throw new ConflictException('A tag with this slug already exists');
    }

    return this.repository.create({
      name: createTagDto.name,
      slug,
      color: createTagDto.color,
    });
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const tag = await this.repository.findById(id);

    if (!tag) {
      throw new NotFoundException(`Tag #${id} not found`);
    }

    return tag;
  }

  async update(id: number, updateTagDto: UpdateTagDto) {
    await this.findOne(id);

    // Si le nom change, regénérer le slug et vérifier l'unicité
    let slug: string | undefined;
    if (updateTagDto.name) {
      slug = slugify(updateTagDto.name, {
        lower: true,
        strict: true,
      });

      const existingBySlug = await this.repository.findBySlug(slug);
      if (existingBySlug && existingBySlug.id !== id) {
        throw new ConflictException('A tag with this name already exists');
      }
    }

    // Mettre à jour
    return this.repository.update(id, {
      name: updateTagDto.name,
      slug,
      color: updateTagDto.color,
    });
  }

  async remove(id: number) {
    // Vérifier que le tag existe
    await this.findOne(id);

    // Vérifier qu'il n'a pas d'événements associés
    const eventCount = await this.repository.countEventsByTag(id);
    if (eventCount > 0) {
      throw new BadRequestException(
        `Cannot delete tag with ${eventCount} associated event(s)`,
      );
    }

    // Supprimer
    await this.repository.delete(id);

    return { message: 'Category successfully deleted' };
  }
}
