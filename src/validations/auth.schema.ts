import { z } from 'zod';

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
    email: z
        .string()
        .email('Invalid email format')
        .min(1, 'Email is required')
        .max(255, 'Email is too long')
        .toLowerCase()
        .trim(),
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .max(128, 'Password is too long'),
});

/**
 * User registration validation schema (for admin seeding)
 */
export const registerSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name is too long')
        .trim(),
    email: z
        .string()
        .email('Invalid email format')
        .min(1, 'Email is required')
        .max(255, 'Email is too long')
        .toLowerCase()
        .trim(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password is too long')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
    role: z.enum(['CITIZEN', 'ADMIN']).default('CITIZEN'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
