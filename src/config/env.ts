import { z } from 'zod';

/**
 * Environment variable schema with Zod validation
 * Ensures all required configuration is present and correctly typed
 */
const envSchema = z.object({
    // Server
    PORT: z.string().default('3001').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
    CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
    CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

    // CORS
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('10').transform(Number),

    // Incident Configuration
    VERIFICATION_THRESHOLD: z.string().default('5').transform(Number),
    DUPLICATE_DISTANCE_METERS: z.string().default('200').transform(Number),
    DUPLICATE_TIME_MINUTES: z.string().default('10').transform(Number),
});

/**
 * Parse and validate environment variables
 * Throws detailed error if validation fails
 */
function validateEnv() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
        throw new Error('Invalid environment variables');
    }

    return parsed.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
