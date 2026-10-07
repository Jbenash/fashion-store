import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Role, User } from '../users/user.entity.js';
import { Category } from '../categories/categories.entity.js';
import { Product } from '../products/products.entity.js';

const CLOUD_FOLDER = 'fashion-store/products';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Category) private categories: Repository<Category>,
    @InjectRepository(Product) private products: Repository<Product>,
    private config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.getOrThrow<string>('ADMIN_EMAIL');
    if (!(await this.users.findOneBy({ email }))) {
      const password = await bcrypt.hash(this.config.getOrThrow('ADMIN_PASSWORD'), 10);
      await this.users.save({ name: 'Store Admin', email, password, role: Role.ADMIN });
    }

    if (await this.products.count()) return;
    const [men, women, accessories] = await this.categories.save([{ name: 'Men' }, { name: 'Women' }, { name: 'Accessories' }]);
    const sizes = (colour: string) => ['S', 'M', 'L', 'XL'].map((size) => ({ size, colour, stock: 50 }));

    // Demo photography lives in this store's own Cloudinary folder (sourced
    // from Unsplash under the Unsplash License). imagePublicId is set so the
    // admin UI can replace these images and clean up the old asset.
    // Without a cloud name the URL would 404, and a broken image looks worse
    // than none — the storefront renders its placeholder for a null imageUrl.
    const cloud = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const img = (slug: string) =>
      cloud
        ? {
            imageUrl: `https://res.cloudinary.com/${cloud}/image/upload/${CLOUD_FOLDER}/${slug}.jpg`,
            imagePublicId: `${CLOUD_FOLDER}/${slug}`,
          }
        : { imageUrl: null, imagePublicId: null };

    await this.products.save([
      { name: 'Black Oversized T-Shirt', description: '240 GSM cotton oversized tee.', price: 2500, bulkMinQty: 10, bulkPrice: 2100,
        ...img('black-oversized-tee'), category: men, variants: sizes('Black') },
      { name: 'White Oversized T-Shirt', description: '240 GSM cotton oversized tee.', price: 2500, bulkMinQty: 10, bulkPrice: 2100,
        ...img('white-oversized-tee'), category: men, variants: sizes('White') },
      { name: 'Linen Summer Dress', description: 'Breathable linen midi dress.', price: 6800,
        ...img('linen-summer-dress'), category: women, variants: [...sizes('Beige'), ...sizes('Sage')] },
      { name: 'Canvas Tote Bag', description: 'Heavy-duty canvas tote.', price: 1800, bulkMinQty: 20, bulkPrice: 1400,
        ...img('canvas-tote-bag'), category: accessories, variants: [{ size: 'Free Size', colour: 'Natural', stock: 100 }] },
    ]);
  }
}