import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity.js';
import { ProductVariant } from '../products/varients.entity.js';
import { decimal } from '../common/decimal.transformer.js';

export enum OrderStatus {
  PENDING = 'PENDING', PAID = 'PAID', CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED', DELIVERED = 'DELIVERED', CANCELLED = 'CANCELLED',
}
export enum PaymentMethod { PAYHERE = 'PAYHERE', WHATSAPP = 'WHATSAPP' }

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) orderNumber: string;
  @ManyToOne(() => User, { nullable: false }) user: User;
  @Column() customerName: string;
  @Column() phone: string;
  @Column() email: string;
  @Column('text') address: string;
  @Column() city: string;
  @Column({ type: 'enum', enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING }) status: OrderStatus;
  @Column('decimal', { precision: 10, scale: 2, transformer: decimal }) total: number;
  @Column({ type: 'varchar', nullable: true }) paymentRef: string | null;
  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true, eager: true }) items: OrderItem[];
  @CreateDateColumn() createdAt: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' }) order: Order;
  @Column() variantId: number;
  @ManyToOne(() => ProductVariant, { nullable: false }) @JoinColumn({ name: 'variantId' }) variant: ProductVariant;
  @Column() productName: string;
  @Column() size: string;
  @Column() colour: string;
  @Column('decimal', { precision: 10, scale: 2, transformer: decimal }) unitPrice: number;
  @Column('int') quantity: number;
}