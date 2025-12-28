import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { env } from './config/env';
import { initializeSocketService } from './services/socket.service';

const prisma = new PrismaClient();

/**
 * Main server entry point
 */
async function main(): Promise<void> {
    try {
        // Connect to database
        console.log('[Database] Connecting to PostgreSQL...');
        await prisma.$connect();
        console.log('[Database] Connected successfully');

        // Create Express app
        const app = createApp();

        // Create HTTP server
        const httpServer = createServer(app);

        // Initialize Socket.IO
        initializeSocketService(httpServer);
        console.log('[Socket.IO] Initialized');

        // Start server
        httpServer.listen(env.PORT, () => {
            console.log('═══════════════════════════════════════════════');
            console.log(`   🚀 Anginat API Server`);
            console.log('═══════════════════════════════════════════════');
            console.log(`   Environment: ${env.NODE_ENV}`);
            console.log(`   Port: ${env.PORT}`);
            console.log(`   Health: http://localhost:${env.PORT}/health`);
            console.log('═══════════════════════════════════════════════');
        });

        // Graceful shutdown handlers
        const shutdown = async (signal: string): Promise<void> => {
            console.log(`\n[${signal}] Shutting down gracefully...`);

            // Close HTTP server
            httpServer.close(() => {
                console.log('[HTTP] Server closed');
            });

            // Disconnect from database
            await prisma.$disconnect();
            console.log('[Database] Disconnected');

            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('[FATAL] Uncaught Exception:', error);
            shutdown('UNCAUGHT_EXCEPTION');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
            shutdown('UNHANDLED_REJECTION');
        });
    } catch (error) {
        console.error('[FATAL] Failed to start server:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

// Start the server
main();
