import { z } from 'zod';

/**
 * Incident type enum values
 */
export const incidentTypes = [
    'FIRE',
    'FLOOD',
    'EARTHQUAKE',
    'ACCIDENT',
    'MEDICAL',
    'CRIME',
    'INFRASTRUCTURE',
    'ENVIRONMENTAL',
    'OTHER',
] as const;

/**
 * Severity levels
 */
export const severityLevels = ['LOW', 'MEDIUM', 'HIGH'] as const;

/**
 * Incident status values
 */
export const incidentStatuses = [
    'REPORTED',
    'VERIFIED',
    'IN_PROGRESS',
    'RESOLVED',
    'FLAGGED',
] as const;

/**
 * Create incident validation schema
 */
export const createIncidentSchema = z.object({
    incidentType: z
        .string()
        .min(1, 'Incident type is required')
        .max(50, 'Incident type is too long')
        .refine(
            (val) => incidentTypes.includes(val.toUpperCase() as (typeof incidentTypes)[number]),
            { message: `Incident type must be one of: ${incidentTypes.join(', ')}` }
        ),
    description: z
        .string()
        .min(10, 'Description must be at least 10 characters')
        .max(2000, 'Description is too long'),
    latitude: z
        .union([z.number(), z.string()])
        .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
        .refine((val) => !isNaN(val) && val >= -90 && val <= 90, {
            message: 'Latitude must be a valid number between -90 and 90',
        }),
    longitude: z
        .union([z.number(), z.string()])
        .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
        .refine((val) => !isNaN(val) && val >= -180 && val <= 180, {
            message: 'Longitude must be a valid number between -180 and 180',
        }),
    severity: z
        .enum(severityLevels)
        .default('MEDIUM'),
});

/**
 * Update incident status validation schema (Admin only)
 */
export const updateStatusSchema = z.object({
    status: z.enum(incidentStatuses, {
        errorMap: () => ({
            message: `Status must be one of: ${incidentStatuses.join(', ')}`,
        }),
    }),
    note: z
        .string()
        .max(1000, 'Note is too long')
        .optional(),
});

/**
 * Query params validation schema for listing incidents
 */
export const incidentQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .pipe(z.number().min(1)),
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 20))
        .pipe(z.number().min(1).max(100)),
    status: z
        .enum(incidentStatuses)
        .optional(),
    incidentType: z
        .string()
        .optional(),
    severity: z
        .enum(severityLevels)
        .optional(),
    sortBy: z
        .enum(['createdAt', 'updatedAt', 'severity', 'upvoteCount'])
        .optional()
        .default('createdAt'),
    sortOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc'),
    // Bounding box for geo-filtering
    minLat: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined)),
    maxLat: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined)),
    minLng: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined)),
    maxLng: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined)),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type IncidentQueryInput = z.infer<typeof incidentQuerySchema>;
