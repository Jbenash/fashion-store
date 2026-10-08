import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Order } from './order.entity.js';

@Injectable()
export class PayhereService {
  constructor(private config: ConfigService) {}

  private md5 = (s: string) => createHash('md5').update(s).digest('hex').toUpperCase();
  private secretHash = () => this.md5(this.config.getOrThrow('PAYHERE_MERCHANT_SECRET'));

  buildCheckout(order: Order) {
    const merchantId = this.config.getOrThrow<string>('PAYHERE_MERCHANT_ID');
    // Trailing slashes are easy to paste in from a browser address bar and
    // would produce '.../app//orders/5', which the SPA host may not route.
    const trimSlash = (u: string) => u.replace(/\/+$/, '');
    const frontend = trimSlash(this.config.getOrThrow<string>('FRONTEND_URL'));
    const backend = trimSlash(this.config.getOrThrow<string>('BACKEND_URL'));
    const amount = order.total.toFixed(2);
    const currency = 'LKR';
    const [firstName, ...rest] = order.customerName.trim().split(' ');

    return {
      action: this.config.getOrThrow<string>('PAYHERE_CHECKOUT_URL'),
      fields: {
        merchant_id: merchantId,
        return_url: `${frontend}/orders/${order.id}?payment=return`,
        cancel_url: `${frontend}/orders/${order.id}`,
        notify_url: `${backend}/api/payments/payhere/notify`,
        order_id: order.orderNumber,
        items: `Order ${order.orderNumber}`,
        currency,
        amount,
        first_name: firstName,
        last_name: rest.join(' ') || '-',
        email: order.email,
        phone: order.phone,
        address: order.address,
        city: order.city,
        country: 'Sri Lanka',
        hash: this.md5(merchantId + order.orderNumber + amount + currency + this.secretHash()),
      },
    };
  }

  verifyNotification(b: Record<string, string>) {
    const expected = this.md5(
      b.merchant_id + b.order_id + b.payhere_amount + b.payhere_currency + b.status_code + this.secretHash(),
    );
    return b.merchant_id === this.config.get('PAYHERE_MERCHANT_ID') && expected === b.md5sig;
  }
}