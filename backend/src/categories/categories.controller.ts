import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Category } from './categories.entity.js';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/gaurds.js';
import { Role } from '../users/user.entity.js';

class CreateCategoryDto { @IsNotEmpty() name: string; }

@Controller('categories')
export class CategoriesController {
  constructor(@InjectRepository(Category) private repo: Repository<Category>) {}

  @Get()
  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCategoryDto) {
    return this.repo.save(this.repo.create(dto));
  }
}