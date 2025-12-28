import { Incident, Severity, IncidentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { uploadToCloudinary } from '../config/cloudinary';
import { checkForDuplicate } from '../utils/duplicateDetector';
import { env } from '../config/env';
import { CreateIncidentInput, IncidentQueryInput } from '../validations/incident.schema';
import { getSocketService } from './socket.service';
import prisma from '../prisma';

/**
 * Incident service - handles all incident-related business logic
 */
export class IncidentService {
    /**
     * Create a new incident
     */
    async createIncident(
        data: CreateIncidentInput,
        mediaBuffer?: Buffer
    ): Promise<Incident> {
        const id = uuidv4();
        let mediaUrl: string | null = null;

        // Upload media if provided
        if (mediaBuffer) {
            const uploadResult = await uploadToCloudinary(mediaBuffer, 'incidents');
            mediaUrl = uploadResult.secure_url;
        }

        // Check for duplicate
        const duplicateCheck = await checkForDuplicate(
            data.incidentType,
            data.latitude,
            data.longitude
        );

        // Create the incident
        const incident = await prisma.incident.create({
            data: {
                id,
                incidentType: data.incidentType.toUpperCase(),
                description: duplicateCheck.isDuplicate
                    ? `[POTENTIAL DUPLICATE] ${data.description}`
                    : data.description,
                latitude: data.latitude,
                longitude: data.longitude,
                severity: data.severity as Severity,
                status: duplicateCheck.isDuplicate ? 'FLAGGED' : 'REPORTED',
                mediaUrl,
            },
        });

        // Emit real-time event
        const socketService = getSocketService();
        if (socketService) {
            socketService.emitNewIncident(incident);
        }

        return incident;
    }

    /**
     * Get all incidents with filtering and pagination
     */
    async getIncidents(query: IncidentQueryInput): Promise<{
        incidents: Incident[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const { page, limit, status, incidentType, severity, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Record<string, unknown> = {};

        if (status) {
            where.status = status;
        }

        if (incidentType) {
            where.incidentType = {
                equals: incidentType.toUpperCase(),
            };
        }

        if (severity) {
            where.severity = severity;
        }

        // Geo-filtering with bounding box
        if (query.minLat !== undefined && query.maxLat !== undefined) {
            where.latitude = {
                gte: query.minLat,
                lte: query.maxLat,
            };
        }

        if (query.minLng !== undefined && query.maxLng !== undefined) {
            where.longitude = {
                gte: query.minLng,
                lte: query.maxLng,
            };
        }

        // Execute queries
        const [incidents, total] = await Promise.all([
            prisma.incident.findMany({
                where,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip,
                take: limit,
                include: {
                    _count: {
                        select: { votes: true, adminNotes: true },
                    },
                },
            }),
            prisma.incident.count({ where }),
        ]);

        return {
            incidents,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get a single incident by ID
     */
    async getIncidentById(id: string): Promise<Incident | null> {
        return prisma.incident.findUnique({
            where: { id },
            include: {
                votes: {
                    select: {
                        id: true,
                        userId: true,
                        createdAt: true,
                    },
                },
                adminNotes: {
                    include: {
                        user: {
                            select: { name: true, email: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: { votes: true },
                },
            },
        });
    }

    /**
     * Update incident status (Admin only)
     */
    async updateIncidentStatus(
        id: string,
        status: IncidentStatus,
        adminId: string,
        note?: string
    ): Promise<Incident> {
        // Update the incident
        const incident = await prisma.incident.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date(),
            },
        });

        // Add admin note if provided
        if (note) {
            await prisma.adminNote.create({
                data: {
                    incidentId: id,
                    userId: adminId,
                    note: `Status changed to ${status}: ${note}`,
                },
            });
        }

        // Emit real-time event
        const socketService = getSocketService();
        if (socketService) {
            socketService.emitIncidentUpdate(incident);
        }

        return incident;
    }

    /**
     * Add admin note to incident
     */
    async addAdminNote(
        incidentId: string,
        adminId: string,
        note: string
    ): Promise<Incident> {
        await prisma.adminNote.create({
            data: {
                incidentId,
                userId: adminId,
                note,
            },
        });

        // Return the updated incident with notes
        const incident = await this.getIncidentById(incidentId);
        if (!incident) {
            throw new Error('Incident not found after adding note');
        }
        return incident;
    }

    /**
     * Update incident severity
     */
    async updateSeverity(
        incidentId: string,
        severity: Severity
    ): Promise<Incident> {
        const incident = await prisma.incident.update({
            where: { id: incidentId },
            data: {
                severity,
                updatedAt: new Date(),
            },
        });

        const socketService = getSocketService();
        if (socketService) {
            socketService.emitIncidentUpdate(incident);
        }

        return incident;
    }

    /**
     * Delete an incident
     */
    async deleteIncident(id: string): Promise<void> {
        // Check if exists
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new Error('Incident not found');

        // Delete (Cascade handles notes)
        await prisma.incident.delete({ where: { id } });
    }

    /**
     * Upvote an incident
     * Handles verification threshold logic
     */
    async upvoteIncident(
        incidentId: string,
        userId: string
    ): Promise<{ incident: Incident; alreadyVoted: boolean }> {
        // For anonymous votes, skip the Vote record and just increment
        if (userId === 'anonymous') {
            const incident = await prisma.incident.update({
                where: { id: incidentId },
                data: {
                    upvoteCount: { increment: 1 },
                },
            });
            return { incident, alreadyVoted: false };
        }

        // Check if user already voted
        const existingVote = await prisma.vote.findUnique({
            where: {
                userId_incidentId: {
                    userId,
                    incidentId,
                },
            },
        });

        if (existingVote) {
            const incident = await prisma.incident.findUnique({
                where: { id: incidentId },
            });
            return { incident: incident!, alreadyVoted: true };
        }

        // Create vote and update count in a transaction
        const [, incident] = await prisma.$transaction([
            prisma.vote.create({
                data: {
                    userId,
                    incidentId,
                },
            }),
            prisma.incident.update({
                where: { id: incidentId },
                data: {
                    upvoteCount: { increment: 1 },
                },
            }),
        ]);

        // Check verification threshold
        if (
            incident.status === 'REPORTED' &&
            incident.upvoteCount >= env.VERIFICATION_THRESHOLD
        ) {
            const verifiedIncident = await prisma.incident.update({
                where: { id: incidentId },
                data: { status: 'VERIFIED' },
            });

            // Emit real-time event
            const socketService = getSocketService();
            if (socketService) {
                socketService.emitIncidentUpdate(verifiedIncident);
            }

            return { incident: verifiedIncident, alreadyVoted: false };
        }

        return { incident, alreadyVoted: false };
    }

    /**
     * Get incident statistics
     */
    async getStats(): Promise<any> {
        const [total, pending, active, resolved] = await Promise.all([
            prisma.incident.count(),
            prisma.incident.count({ where: { status: 'REPORTED' } }),
            prisma.incident.count({ where: { status: 'IN_PROGRESS' } }),
            prisma.incident.count({ where: { status: 'RESOLVED' } }),
        ]);

        return {
            total,
            pending,
            active,
            resolved
        };
    }
}

// Singleton instance
export const incidentService = new IncidentService();
