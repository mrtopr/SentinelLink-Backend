
import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../prisma';

/**
 * Extend Express Request to include user information
 */
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload & { id: string };
        }
    }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authentication required. Please provide a valid token.',
            });
            return;
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        if (!payload) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token.',
            });
            return;
        }

        // Verify user still exists in database
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, name: true },
        });

        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User no longer exists.',
            });
            return;
        }

        req.user = {
            id: user.id,
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Authentication failed.',
        });
    }
}

/**
 * Optional authentication middleware
 * Attaches user if token present, continues without error if not
 */
export async function optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = verifyToken(token);

            if (payload) {
                const user = await prisma.user.findUnique({
                    where: { id: payload.userId },
                    select: { id: true, email: true, role: true },
                });

                if (user) {
                    req.user = {
                        id: user.id,
                        userId: user.id,
                        email: user.email,
                        role: user.role,
                    };
                }
            }
        }

        next();
    } catch {
        // Continue without authentication
        next();
    }
}

/**
 * Admin-only authorization middleware
 * Must be used after authenticate middleware
 */
export function isAdmin(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required.',
        });
        return;
    }

    if (req.user.role !== 'ADMIN') {
        res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.',
        });
        return;
    }

    next();
}
