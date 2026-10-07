import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity.js';
import { Category } from '../categories/categories.entity.js';
import { Product } from '../products/products.entity.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Category, Product])],
  providers: [SeedService],
})
export class SeedModule {}