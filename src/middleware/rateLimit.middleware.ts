import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * General API rate limiter
 * Limits requests per IP address within a time window
 */
export const generalRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS * 10, // More lenient for general requests
    message: {
        success: false,
        error: 'Too many requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use X-Forwarded-For header if behind a proxy (e.g., Render)
        return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req.ip
            || 'unknown';
    },
});

/**
 * Strict rate limiter for incident creation
 * Prevents spam and abuse of the incident reporting system
 */
export const incidentCreationLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: {
        success: false,
        error: 'Too many incident reports. Please wait before submitting another.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req.ip
            || 'unknown';
    },
});

/**
 * Auth routes rate limiter
 * Stricter limits to prevent brute force attacks
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req.ip
            || 'unknown';
    },
});
