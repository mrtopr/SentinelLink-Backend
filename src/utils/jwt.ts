import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * JWT token payload structure
 */
export interface TokenPayload {
    userId: string;
    email: string;
    role: 'CITIZEN' | 'ADMIN';
}

/**
 * Generate a JWT token for a user
 * @param payload - User data to encode in token
 * @returns Signed JWT token string
 */
export function generateToken(payload: TokenPayload): string {
    const options: SignOptions = {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
        issuer: 'anginat-api',
        audience: 'anginat-client',
    };
    return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string to verify
 * @returns Decoded payload if valid, null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            issuer: 'anginat-api',
            audience: 'anginat-client',
        }) as TokenPayload;

        return decoded;
    } catch {
        return null;
    }
}

/**
 * Decode a JWT token without verification (for debugging/inspection)
 * @param token - JWT token string to decode
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): TokenPayload | null {
    try {
        return jwt.decode(token) as TokenPayload | null;
    } catch {
        return null;
    }
}
