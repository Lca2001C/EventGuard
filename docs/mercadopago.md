# Mercado Pago

The billing module integrates with Mercado Pago Checkout Pro-style preferences and webhook processing.

## Environment

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `API_URL`
- `FRONTEND_URL`

## Checkout

Setup and subscription checkout endpoints create a local `payments` row with a unique `external_reference`, then call:

```txt
POST https://api.mercadopago.com/checkout/preferences
```

The preference includes:

- `external_reference`
- `notification_url`
- `back_urls`
- one BRL item with the amount in reais

If the access token is absent in local development, the API returns a mock checkout URL so the dashboard remains testable.

## Webhook

Mercado Pago sends `x-signature` and `x-request-id`. The API validates those headers with the official `WebhookSignatureValidator`, using `data.id` as the signed resource identifier.

After validation, EventGuard stores the webhook in `webhook_events`, fetches the full payment resource when credentials are configured, and updates:

- `payments.status`
- `payments.mercadopago_payment_id`
- `subscriptions.status`
- `tenants.status`

Approved subscription payments activate the tenant. Rejected payments mark the tenant as `PAST_DUE`.

Official webhook validation reference: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
