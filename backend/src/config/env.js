require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/techzon_crm'),
  JWT_SECRET: z.string().default('supersecretjwtkey_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

module.exports = {
  env: _env.data
};
