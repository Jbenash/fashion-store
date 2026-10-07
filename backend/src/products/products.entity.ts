import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from '../categories/categories.entity.js';
import { ProductVariant } from './varients.entity.js';
import { decimal } from '../common/decimal.transformer.js';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column('text') description: string;
  @Column('decimal', { precision: 10, scale: 2, transformer: decimal }) price: number;
  @Column('int', { nullable: true }) bulkMinQty: number | null;
  @Column('decimal', { precision: 10, scale: 2, nullable: true, transformer: decimal }) bulkPrice: number | null;
  @Column({ type: 'varchar', nullable: true }) imageUrl: string | null;
  // Cloudinary asset id behind imageUrl, kept so a replaced image can be
  // deleted instead of orphaned. Null for externally hosted URLs.
  @Column({ type: 'varchar', nullable: true }) imagePublicId: string | null;
  @Column({ default: true }) isActive: boolean;
  @ManyToOne(() => Category, { nullable: false, eager: true }) category: Category;
  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: true, eager: true }) variants: ProductVariant[];
  @CreateDateColumn() createdAt: Date;
}