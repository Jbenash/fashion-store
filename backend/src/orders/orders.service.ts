import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm';
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from './order.entity.js';
import { ProductVariant } from '../products/varients.entity.js';
import { Product } from '../products/products.entity.js';
import { Role } from '../users/user.entity.js';
import { CreateOrderDto } from './order.dto.js';
import { PayhereService } from './payhere.service.js';

//allowed state machine for order statuses - key values
//it helps to move the transitions from one state to another i.e PENDING to CONFIRMED OR CANCELLED
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [], //its empty because ts wont allow to miss any keys
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private repo: Repository<Order>,
    private dataSource: DataSource, //we need both repo and datasource because repo handles reads and datasource handles transactions
    private payhere: PayhereService,
    private config: ConfigService,
  ) {}

  async create(userId: number, dto: CreateOrderDto) {
    //creating a map to set the varient_id and quantity
    const qtyByVariant = new Map<number, number>();
    for (const i of dto.items)
      qtyByVariant.set(
        i.variantId,
        (qtyByVariant.get(i.variantId) ?? 0) + i.quantity,
      );

    // opens a transaction- if anything fails everything rolls back- no partial payments
    const order = await this.dataSource.transaction(async (em) => {
      const variants = await em.find(ProductVariant, {
        where: { id: In([...qtyByVariant.keys()]) },
        relations: { product: true },
      });

      //no of varients and mapped varients should be equal
      if (variants.length !== qtyByVariant.size)
        throw new BadRequestException('Some items no longer exist');

      //creating a map to set the product_id and quantity
      const qtyByProduct = new Map<number, number>();
      for (const v of variants) {
        if (!v.product.isActive)
          throw new BadRequestException(
            `${v.product.name} is no longer available`,
          );
        qtyByProduct.set(
          v.product.id,
          (qtyByProduct.get(v.product.id) ?? 0) + qtyByVariant.get(v.id)!,
        );
      }

      //reduce the stock quantity 
      const items: OrderItem[] = [];
      let total = 0;
      for (const v of variants) {
        const quantity = qtyByVariant.get(v.id)!;
        const res = await em.decrement(
          // we are using entity manager (em) because we need to perfrom operations on diff db in a single transaction
          ProductVariant,
          { id: v.id, stock: MoreThanOrEqual(quantity) }, //Find the ProductVariant where id = v.id and stock >= quantity, then decrease its stock by quantity
          'stock',
          quantity,
        );
        if (!res.affected) {
          throw new BadRequestException(
            `Not enough stock for ${v.product.name} (${v.colour} / ${v.size})`,
          );
        }

        //calculating the price based on the quantity - bulk or normal 
        const unitPrice = this.unitPrice(
          v.product,
          qtyByProduct.get(v.product.id)!,
        );
        total += unitPrice * quantity;
        //creating the order 
        items.push(
          em.create(OrderItem, {
            variantId: v.id,
            productName: v.product.name,
            size: v.size,
            colour: v.colour,
            unitPrice,
            quantity,
          }),
        );
      }

      //saving the order to the db 
      return em.save(
        em.create(Order, {
          ...dto,
          items,
          total: Math.round(total * 100) / 100,
          user: { id: userId },
          orderNumber: `ORD-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`,
        }),
      );
    });

    //redirect the payment to the whatsapp
    if (order.paymentMethod === PaymentMethod.WHATSAPP) {
      return { order, whatsappUrl: this.buildWhatsappUrl(order) };
    }
    return { order, payhere: this.payhere.buildCheckout(order) };
  }

  // if the customer buys bulk unit price will be bulk price if not normal price
  private unitPrice(p: Product, productQty: number) {
    return p.bulkMinQty && p.bulkPrice && productQty >= p.bulkMinQty
      ? p.bulkPrice
      : p.price;
  }

  /**
   * Rebuilds the WhatsApp hand-off link for an order the caller may see.
   * Exposed so the order page can offer the link again later — the customer
   * may not have sent the message straight after checking out.
   */
  async whatsappLinkFor(id: number, user: { id: number; role: Role }) {
    const order = await this.findOneForUser(id, user);
    if (order.paymentMethod !== PaymentMethod.WHATSAPP) {
      throw new BadRequestException('This order was not placed via WhatsApp');
    }
    return { url: this.buildWhatsappUrl(order) };
  }

  // building the whatsapp url
  private buildWhatsappUrl(order: Order) {
    const groups = new Map<string, string[]>();
    for (const i of order.items) {
      const key = `${i.productName} (${i.colour})`;
      groups.set(key, [
        ...(groups.get(key) ?? []),
        `${i.size} × ${i.quantity}`,
      ]);
    }
    const text = [
      `*New Order ${order.orderNumber}*`,
      '',
      ...[...groups].map(
        ([product, sizes]) => `• ${product} — ${sizes.join(', ')}`,
      ),
      '',
      `*Total:* LKR ${order.total.toFixed(2)}`,
      '',
      `*Name:* ${order.customerName}`,
      `*Phone:* ${order.phone}`,
      `*Address:* ${order.address}, ${order.city}`,
    ].join('\n');
    return `https://wa.me/${this.config.getOrThrow('WHATSAPP_NUMBER')}?text=${encodeURIComponent(text)}`;
  }

  findMine(userId: number) {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  findAll(status?: OrderStatus) {
    return this.repo.find({
      where: status ? { status } : {},
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(id: number, user: { id: number; role: Role }) {
    const order = await this.repo.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!order || (user.role !== Role.ADMIN && order.user.id !== user.id))
      throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.repo.findOneBy({ id });
    if (!order) throw new NotFoundException('Order not found');
    if (!TRANSITIONS[order.status].includes(status)) {
      throw new BadRequestException(
        `Cannot change order from ${order.status} to ${status}`,
      );
    }
    if (
      order.paymentMethod === PaymentMethod.PAYHERE &&
      order.status === OrderStatus.PENDING &&
      status === OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'PayHere orders are confirmed automatically after payment',
      );
    }
    if (status === OrderStatus.CANCELLED) return this.cancel(order);
    order.status = status;
    return this.repo.save(order);
  }

  /**
   * Lets the customer who placed an order call it off themselves.
   * Restricted to PENDING: once money has been taken (PAID) or the parcel has
   * moved (CONFIRMED/SHIPPED), cancelling needs a refund or a courier recall,
   * so it stays an admin decision. Admins keep the full state machine via
   * updateStatus. findOneForUser enforces ownership and 404s otherwise.
   */
  async cancelOwn(id: number, user: { id: number; role: Role }) {
    const order = await this.findOneForUser(id, user);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('This order is already cancelled');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'This order can no longer be cancelled online. Please contact us.',
      );
    }
    return this.cancel(order);
  }

  private cancel(order: Order) {
    return this.dataSource.transaction(async (em) => {
      for (const i of order.items)
        await em.increment(
          ProductVariant,
          { id: i.variantId },
          'stock',
          i.quantity,
        );
      order.status = OrderStatus.CANCELLED;
      return em.save(order);
    });
  }

  async handlePayhereNotify(body: Record<string, string>) {
    if (!this.payhere.verifyNotification(body))
      throw new BadRequestException('Invalid signature');
    const order = await this.repo.findOneBy({ orderNumber: body.order_id });
    if (!order) throw new NotFoundException('Order not found');
    if (Number(body.payhere_amount) !== order.total)
      throw new BadRequestException('Amount mismatch');
    if (order.status !== OrderStatus.PENDING) return;

    const code = Number(body.status_code);
    if (code === 2) {
      order.status = OrderStatus.PAID;
      order.paymentRef = body.payment_id;
      await this.repo.save(order);
    } else if (code === -1 || code === -2) {
      await this.cancel(order);
    }
  }
}
