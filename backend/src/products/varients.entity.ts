import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Product } from './products.entity.js';

@Entity('product_variants')
@Unique(['product', 'size', 'colour'])
export class ProductVariant {
  @PrimaryGeneratedColumn() id: number;
  @Column() size: string;
  @Column() colour: string;
  @Column('int', { default: 0 }) stock: number;
  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' }) product: Product;
}