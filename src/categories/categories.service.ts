import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesRepository } from './categories.repository';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Générer le slug depuis le nom
    const slug = slugify(createCategoryDto.name, {
      lower: true,
      strict: true,
    });

    // Vérifier que le slug n'existe pas déjà
    const existingBySlug = await this.repository.findBySlug(slug);
    if (existingBySlug) {
      throw new ConflictException('A category with this name already exists');
    }

    // Créer la catégorie
    return this.repository.create({
      name: createCategoryDto.name,
      slug,
      description: createCategoryDto.description,
    });
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    // Vérifier que la catégorie existe
    await this.findOne(id);

    // Si le nom change, regénérer le slug et vérifier l'unicité
    let slug: string | undefined;
    if (updateCategoryDto.name) {
      slug = slugify(updateCategoryDto.name, {
        lower: true,
        strict: true,
      });

      const existingBySlug = await this.repository.findBySlug(slug);
      if (existingBySlug && existingBySlug.id !== id) {
        throw new ConflictException('A category with this name already exists');
      }
    }

    // Mettre à jour
    return this.repository.update(id, {
      name: updateCategoryDto.name,
      slug,
      description: updateCategoryDto.description,
    });
  }

  async remove(id: number) {
    // Vérifier que la catégorie existe
    await this.findOne(id);

    // Vérifier qu'elle n'a pas d'événements associés
    const eventCount = await this.repository.countEventsByCategory(id);
    if (eventCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${eventCount} associated event(s)`,
      );
    }

    // Supprimer
    await this.repository.delete(id);

    return { message: 'Category successfully deleted' };
  }
}
