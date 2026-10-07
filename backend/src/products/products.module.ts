import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './products.entity.js';
import { ProductVariant } from './varients.entity.js';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { UploadsModule } from '../uploads/uploads.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant]), UploadsModule],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}