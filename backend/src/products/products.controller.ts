import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './products.dto.js';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/gaurds.js';
import { Role } from '../users/user.entity.js';

@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  findAll(@Query() q: ProductQueryDto) {
    return this.products.findAll(q);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllAdmin() {
    return this.products.findAllAdmin();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.products.findOne(id, true);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.products.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.products.deactivate(id);
  }
}