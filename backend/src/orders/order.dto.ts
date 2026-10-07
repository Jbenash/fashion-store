import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsEmail, IsEnum, IsInt, IsNotEmpty, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { OrderStatus, PaymentMethod } from './order.entity.js';

export class OrderItemDto {
  @IsInt() variantId: number;
  @IsInt() @Min(1) @Max(1000) quantity: number;
}

export class CreateOrderDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[];
  @IsNotEmpty() @MaxLength(80) customerName: string;
  @Matches(/^(\+94|0)?7\d{8}$/, { message: 'Enter a valid Sri Lankan mobile number' }) phone: string;
  @IsEmail() email: string;
  @IsNotEmpty() @MaxLength(250) address: string;
  @IsNotEmpty() @MaxLength(60) city: string;
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
}

export class UpdateStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
}