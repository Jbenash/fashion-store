import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './products.entity.js';
import { ProductVariant } from './varients.entity.js';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant])],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}