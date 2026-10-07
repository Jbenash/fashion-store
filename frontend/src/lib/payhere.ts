import type { PayhereCheckout } from './types';

/**
 * PayHere expects a normal HTML form POST, so we build one and submit it.
 * The merchant hash is generated server-side; nothing secret lives here.
 */
export function submitPayhere(checkout: PayhereCheckout) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkout.action;
  form.style.display = 'none';

  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value ?? '';
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

/** The sandbox credentials are optional in .env, so guard the handoff. */
export function payhereConfigured(checkout: PayhereCheckout | undefined): boolean {
  return Boolean(checkout?.action && checkout.fields?.merchant_id);
}
