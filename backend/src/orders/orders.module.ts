import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem } from './order.entity.js';
import { OrdersService } from './orders.service.js';
import { PayhereService } from './payhere.service.js';
import { OrdersController } from './orders.controller.js';
import { PaymentsController } from './payments.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  providers: [OrdersService, PayhereService],
  controllers: [OrdersController, PaymentsController],
})
export class OrdersModule {}