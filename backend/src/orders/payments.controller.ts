import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

@Controller('payments/payhere')
export class PaymentsController {
  constructor(private orders: OrdersService) {}

  @Post('notify')
  @HttpCode(200)
  notify(@Body() body: Record<string, string>) {
    return this.orders.handlePayhereNotify(body);
  }
}