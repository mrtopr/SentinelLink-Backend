import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { Incident } from '@prisma/client';
import { env } from '../config/env';

/**
 * Socket.IO service singleton
 * Manages WebSocket connections and real-time event broadcasting
 */
class SocketService {
    private io: SocketServer;

    constructor(httpServer: HttpServer) {
        const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());

        this.io = new SocketServer(httpServer, {
            cors: {
                origin: corsOrigins,
                methods: ['GET', 'POST'],
                credentials: true,
            },
            pingTimeout: 60000,
            pingInterval: 25000,
        });

        this.setupEventHandlers();
    }

    /**
     * Set up connection and event handlers
     */
    private setupEventHandlers(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log(`[Socket.IO] Client connected: ${socket.id}`);

            // Handle joining rooms (for future room-based updates)
            socket.on('join:incidents', () => {
                socket.join('incidents');
                console.log(`[Socket.IO] Client ${socket.id} joined incidents room`);
            });

            // Handle subscribing to specific incident updates
            socket.on('subscribe:incident', (incidentId: string) => {
                socket.join(`incident:${incidentId}`);
                console.log(`[Socket.IO] Client ${socket.id} subscribed to incident ${incidentId}`);
            });

            // Handle unsubscribing from specific incident
            socket.on('unsubscribe:incident', (incidentId: string) => {
                socket.leave(`incident:${incidentId}`);
            });

            // Handle disconnection
            socket.on('disconnect', (reason) => {
                console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
            });

            // Handle errors
            socket.on('error', (error) => {
                console.error(`[Socket.IO] Socket error for ${socket.id}:`, error);
            });
        });

        console.log('[Socket.IO] Event handlers initialized');
    }

    /**
     * Emit new incident event to all connected clients
     */
    emitNewIncident(incident: Incident): void {
        this.io.emit('incident:new', {
            type: 'incident:new',
            data: incident,
            timestamp: new Date().toISOString(),
        });
        console.log(`[Socket.IO] Emitted incident:new for ${incident.id}`);
    }

    /**
     * Emit emergency broadcast to all clients
     */
    emitBroadcast(message: string): void {
        this.io.emit('emergency:broadcast', {
            type: 'emergency:broadcast',
            message,
            timestamp: new Date().toISOString(),
        });
        console.log(`[Socket.IO] Emitted emergency:broadcast: ${message}`);
    }

    /**
     * Emit incident update event to all connected clients
     */
    emitIncidentUpdate(incident: Incident): void {
        // Broadcast to all clients
        this.io.emit('incident:update', {
            type: 'incident:update',
            data: incident,
            timestamp: new Date().toISOString(),
        });

        // Also emit to specific incident room
        this.io.to(`incident:${incident.id}`).emit('incident:updated', {
            type: 'incident:updated',
            data: incident,
            timestamp: new Date().toISOString(),
        });

        console.log(`[Socket.IO] Emitted incident:update for ${incident.id}`);
    }

    /**
     * Get the Socket.IO server instance
     */
    getIO(): SocketServer {
        return this.io;
    }

    /**
     * Get count of connected clients
     */
    async getConnectedClientsCount(): Promise<number> {
        const sockets = await this.io.fetchSockets();
        return sockets.length;
    }
}

// Singleton instance
let socketServiceInstance: SocketService | null = null;

/**
 * Initialize the socket service
 */
export function initializeSocketService(httpServer: HttpServer): SocketService {
    if (!socketServiceInstance) {
        socketServiceInstance = new SocketService(httpServer);
    }
    return socketServiceInstance;
}

/**
 * Get the socket service instance
 */
export function getSocketService(): SocketService | null {
    return socketServiceInstance;
}
