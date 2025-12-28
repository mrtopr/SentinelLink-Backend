import { Incident } from '@prisma/client';
import { isWithinDistance } from './distance';
import { env } from '../config/env';
import prisma from '../prisma';

/**
 * Result of duplicate detection
 */
export interface DuplicateCheckResult {
    isDuplicate: boolean;
    duplicateOf?: string; // ID of the original incident
    reason?: string;
}

/**
 * Check if a new incident is a potential duplicate of existing incidents
 * 
 * Criteria for duplicate detection:
 * 1. Same incident type
 * 2. Within configured distance (default 200m)
 * 3. Within configured time window (default 10 minutes)
 * 
 * @param incidentType - Type of the incident
 * @param latitude - Latitude of the incident location
 * @param longitude - Longitude of the incident location
 * @returns DuplicateCheckResult indicating if duplicate was found
 */
export async function checkForDuplicate(
    incidentType: string,
    latitude: number,
    longitude: number
): Promise<DuplicateCheckResult> {
    const timeWindowStart = new Date(
        Date.now() - env.DUPLICATE_TIME_MINUTES * 60 * 1000
    );

    // Fetch recent incidents of the same type
    // Using a bounding box for initial filtering to reduce computation
    const latDelta = env.DUPLICATE_DISTANCE_METERS / 111000; // Approx degrees per meter
    const lonDelta = latDelta / Math.cos((latitude * Math.PI) / 180);

    const recentIncidents = await prisma.incident.findMany({
        where: {
            incidentType: {
                equals: incidentType,
                mode: 'insensitive',
            },
            createdAt: {
                gte: timeWindowStart,
            },
            latitude: {
                gte: latitude - latDelta,
                lte: latitude + latDelta,
            },
            longitude: {
                gte: longitude - lonDelta,
                lte: longitude + lonDelta,
            },
            status: {
                notIn: ['RESOLVED', 'FLAGGED'],
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 20, // Limit for performance
    });

    // Precise distance check using Haversine formula
    for (const incident of recentIncidents) {
        if (
            isWithinDistance(
                latitude,
                longitude,
                incident.latitude,
                incident.longitude,
                env.DUPLICATE_DISTANCE_METERS
            )
        ) {
            return {
                isDuplicate: true,
                duplicateOf: incident.id,
                reason: `Similar incident reported within ${env.DUPLICATE_DISTANCE_METERS}m and ${env.DUPLICATE_TIME_MINUTES} minutes`,
            };
        }
    }

    return { isDuplicate: false };
}

/**
 * Flag an incident as a potential duplicate
 * 
 * @param incidentId - ID of the incident to flag
 * @param duplicateOf - ID of the original incident
 */
export async function flagAsDuplicate(
    incidentId: string,
    duplicateOf: string
): Promise<Incident> {
    return prisma.incident.update({
        where: { id: incidentId },
        data: {
            status: 'FLAGGED',
            description: prisma.incident
                .findUnique({ where: { id: incidentId } })
                .then((i) =>
                    `[POTENTIAL DUPLICATE of ${duplicateOf}] ${i?.description || ''}`
                ) as unknown as string,
        },
    });
}
