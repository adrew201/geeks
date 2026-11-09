export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID!,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    apiBase: process.env.PAYPAL_API_BASE!,
    webhookId: process.env.PAYPAL_WEBHOOK_ID!,
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
};
