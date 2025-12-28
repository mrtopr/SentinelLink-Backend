import express, { Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import incidentRoutes from './routes/incident.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalRateLimiter } from './middleware/rateLimit.middleware';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
    const app = express();

    // Trust proxy for accurate IP detection behind reverse proxy (Render)
    app.set('trust proxy', 1);

    // CORS configuration
    const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
    app.use(
        cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, curl, etc.)
                if (!origin) {
                    return callback(null, true);
                }

                const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
                const isAllowed = corsOrigins.includes(origin) ||
                    corsOrigins.includes('*') ||
                    (env.NODE_ENV === 'development' && isLocalhost);

                if (isAllowed) {
                    callback(null, true);
                } else {
                    console.warn(`CORS: Origin ${origin} not allowed. Allowed: ${corsOrigins.join(', ')}`);
                    callback(null, false);
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        })
    );

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // General rate limiting
    app.use(generalRateLimiter);

    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.status(200).json({
            success: true,
            message: 'Anginat API is running',
            timestamp: new Date().toISOString(),
            environment: env.NODE_ENV,
        });
    });

    // API version prefix
    const API_PREFIX = '/api';

    // Mount routes
    app.use(`${API_PREFIX}/auth`, authRoutes);
    app.use(`${API_PREFIX}/incidents`, incidentRoutes);

    // 404 handler
    app.use(notFoundHandler);

    // Error handler (must be last)
    app.use(errorHandler);

    return app;
}
