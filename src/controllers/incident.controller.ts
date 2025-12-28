import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { getSocketService } from '../services/socket.service';
import { IncidentStatus } from '@prisma/client';
import { incidentService } from '../services/incident.service';
import {
    createIncidentSchema,
    updateStatusSchema,
    incidentQuerySchema,
} from '../validations/incident.schema';
import { AppError } from '../middleware/error.middleware';

/**
 * Incident controller
 * Handles HTTP requests for incident operations
 */
export class IncidentController {
    /**
     * POST /api/incidents
     * Create a new incident report
     */
    async createIncident(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            // Parse body - handle multipart form data
            const bodyData = req.body.data
                ? JSON.parse(req.body.data)
                : req.body;

            // Validate input
            const validatedData = createIncidentSchema.parse(bodyData);

            // Get media file if present (from multer)
            const mediaBuffer = req.file?.buffer;

            const incident = await incidentService.createIncident(
                validatedData,
                mediaBuffer
            );

            res.status(201).json({
                success: true,
                data: incident,
                message: incident.status === 'FLAGGED'
                    ? 'Incident reported and flagged as potential duplicate'
                    : 'Incident reported successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/incidents
     * List all incidents with filtering and pagination
     */
    async getIncidents(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            // Validate query params
            const validatedQuery = incidentQuerySchema.parse(req.query);

            const result = await incidentService.getIncidents(validatedQuery);

            res.status(200).json({
                success: true,
                data: result.incidents,
                meta: {
                    total: result.total,
                    page: result.page,
                    totalPages: result.totalPages,
                    limit: validatedQuery.limit,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/incidents/:id
     * Get a single incident by ID
     */
    async getIncidentById(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                throw new AppError('Incident ID is required', 400);
            }

            const incident = await incidentService.getIncidentById(id);

            if (!incident) {
                throw new AppError('Incident not found', 404);
            }

            res.status(200).json({
                success: true,
                data: incident,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/incidents/:id/status
     * Update incident status (Admin only)
     */
    async updateStatus(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                throw new AppError('Incident ID is required', 400);
            }

            if (!req.user) {
                throw new AppError('Authentication required', 401);
            }

            // Validate input
            const validatedData = updateStatusSchema.parse(req.body);

            const incident = await incidentService.updateIncidentStatus(
                id,
                validatedData.status as IncidentStatus,
                req.user.id,
                validatedData.note
            );

            res.status(200).json({
                success: true,
                data: incident,
                message: `Incident status updated to ${validatedData.status}`,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/incidents/:id/notes
     * Add admin note
     */
    async addNote(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { id } = req.params;
            const { note } = req.body;

            if (!id || !note) {
                throw new AppError('Incident ID and note are required', 400);
            }

            if (!req.user) {
                throw new AppError('Authentication required', 401);
            }

            const incident = await incidentService.addAdminNote(id, req.user.id, note);

            res.status(200).json({
                success: true,
                data: incident,
                message: 'Note added successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/incidents/:id/severity
     * Update incident severity
     */
    async updateSeverity(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { id } = req.params;
            const { severity } = req.body;

            if (!id || !severity) {
                throw new AppError('Incident ID and severity are required', 400);
            }

            if (!['LOW', 'MEDIUM', 'HIGH'].includes(severity)) {
                throw new AppError('Invalid severity level', 400);
            }

            const incident = await incidentService.updateSeverity(id, severity);

            res.status(200).json({
                success: true,
                data: incident,
                message: `Severity updated to ${severity}`,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/incidents/:id/upvote
     * Upvote an incident to increase its trust score
     */
    async upvoteIncident(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                throw new AppError('Incident ID is required', 400);
            }

            const userId = req.user?.id || 'anonymous';
            const { incident, alreadyVoted } = await incidentService.upvoteIncident(
                id,
                userId
            );

            if (alreadyVoted) {
                res.status(200).json({
                    success: true,
                    data: incident,
                    message: 'You have already upvoted this incident',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: incident,
                message: incident.status === 'VERIFIED'
                    ? 'Upvote recorded. Incident is now verified!'
                    : 'Upvote recorded successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/incidents/stats
     * Get incident statistics
     */
    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await incidentService.getStats();
            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/incidents/:id
     * Delete an incident (Admin only)
     */
    async deleteIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                throw new AppError('Incident ID is required', 400);
            }

            if (!req.user) {
                throw new AppError('Authentication required', 401);
            }

            await incidentService.deleteIncident(id);

            res.status(200).json({
                success: true,
                message: 'Incident deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/incidents/broadcast
     * Mock broadcast functionality
     */
    async broadcast(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { message } = req.body;
            console.log(`[BROADCAST] ${message}`);

            const socketService = getSocketService();
            if (socketService) {
                socketService.emitBroadcast(message);
            }

            res.status(200).json({
                success: true,
                message: 'Broadcast initiated successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const incidentController = new IncidentController();
