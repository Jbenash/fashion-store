import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './products.entity.js';
import { ProductVariant } from './varients.entity.js';
import { Category } from '../categories/categories.entity.js';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './products.dto.js';
import { CloudinaryService } from '../uploads/cloudinary.service.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private repo: Repository<Product>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
    private cloudinary: CloudinaryService,
  ) {}

  findAll(q: ProductQueryDto) {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.variants', 'v')
      .where('p.isActive = true');

    if (q.search) qb.andWhere('(p.name ILIKE :s OR p.description ILIKE :s)', { s: `%${q.search}%` });
    if (q.categoryId) qb.andWhere('c.id = :cid', { cid: q.categoryId });
    if (q.minPrice != null) qb.andWhere('p.price >= :min', { min: q.minPrice });
    if (q.maxPrice != null) qb.andWhere('p.price <= :max', { max: q.maxPrice });
    if (q.size) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM product_variants pv WHERE pv."productId" = p.id AND pv.size = :size AND pv.stock > 0)',
        { size: q.size },
      );
    }

    if (q.sort === 'price_asc') qb.orderBy('p.price', 'ASC');
    else if (q.sort === 'price_desc') qb.orderBy('p.price', 'DESC');
    else qb.orderBy('p.createdAt', 'DESC');

    return qb.getMany();
  }

  async findOne(id: number, includeInactive = false) {
    const product = await this.repo.findOneBy(includeInactive ? { id } : { id, isActive: true });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  findAllAdmin() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  create(dto: CreateProductDto) {
    const { categoryId, ...rest } = dto;
    return this.repo.save(this.repo.create({ ...rest, category: { id: categoryId } }));
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.findOne(id, true);
    const { categoryId, variants, ...rest } = dto;

    // If the image is being replaced or cleared, remember the outgoing asset so
    // it can be removed from Cloudinary once the row is safely saved.
    const previousPublicId =
      'imagePublicId' in rest && rest.imagePublicId !== product.imagePublicId
        ? product.imagePublicId
        : null;

    Object.assign(product, rest);
    if (categoryId) product.category = { id: categoryId } as Category;
    // variants are updated or added, never deleted, because past orders reference them; set stock to 0 instead
    for (const v of variants ?? []) {
      const existing = product.variants.find((e) => e.id === v.id);
      if (existing) Object.assign(existing, v);
      else product.variants.push(this.variantRepo.create(v));
    }

    const saved = await this.repo.save(product);
    // Only after the new URL is committed, so a failed save never deletes a
    // still-referenced image.
    if (previousPublicId) await this.cloudinary.destroy(previousPublicId);
    return saved;
  }

  async deactivate(id: number) {
    const product = await this.findOne(id, true);
    product.isActive = false;
    return this.repo.save(product);
  }
}