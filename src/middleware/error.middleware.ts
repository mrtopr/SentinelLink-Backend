import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

/**
 * Custom application error class
 */
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
    });
}

/**
 * Central error handling middleware
 * Handles different error types and formats responses appropriately
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log error in development
    if (env.NODE_ENV === 'development') {
        console.error('Error:', err);
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        const formattedErrors = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));

        res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: 'Validation failed',
            details: formattedErrors,
        });
        return;
    }

    // Handle custom application errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            message: err.message,
        });
        return;
    }

    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as { code?: string; meta?: { target?: string[] } };

        if (prismaError.code === 'P2002') {
            const target = prismaError.meta?.target?.join(', ') || 'field';
            res.status(409).json({
                success: false,
                error: `A record with this ${target} already exists`,
            });
            return;
        }

        if (prismaError.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: 'Record not found',
            });
            return;
        }
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            error: 'Invalid token',
            message: 'Invalid token',
        });
        return;
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            error: 'Token has expired',
            message: 'Token has expired',
        });
        return;
    }

    // Default error response
    const statusCode = 500;
    const message = env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        error: message,
        message: message,
        ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
