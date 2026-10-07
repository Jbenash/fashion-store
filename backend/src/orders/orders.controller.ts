import { Body, Controller, Get, Param, ParseEnumPipe, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto, UpdateStatusDto } from './order.dto.js';
import { OrderStatus } from './order.entity.js';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/gaurds.js';
import { Role } from '../users/user.entity.js';

type AuthUser = { id: number; role: Role };

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  @Get('my')
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.findMine(user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query('status', new ParseEnumPipe(OrderStatus, { optional: true })) status?: OrderStatus) {
    return this.orders.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.orders.findOneForUser(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }
}
