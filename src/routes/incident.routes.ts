import { Router } from 'express';
import multer from 'multer';
import { incidentController } from '../controllers/incident.controller';
import { authenticate, optionalAuth, isAdmin } from '../middleware/auth.middleware';
import { incidentCreationLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * Configure multer for file uploads
 * Store in memory for Cloudinary upload
 */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (_req, file, cb) => {
        // Allow images and videos
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'video/mp4',
            'video/webm',
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and videos are allowed.'));
        }
    },
});

/**
 * @route   POST /api/incidents
 * @desc    Create a new incident report
 * @access  Public (rate limited)
 */
router.post(
    '/',
    incidentCreationLimiter,
    upload.single('media'),
    incidentController.createIncident.bind(incidentController)
);

/**
 * @route   GET /api/incidents
 * @desc    Get all incidents with filtering and pagination
 * @access  Public
 */
router.get(
    '/',
    optionalAuth,
    incidentController.getIncidents.bind(incidentController)
);

/**
 * @route   GET /api/incidents/:id
 * @desc    Get a single incident by ID
 * @access  Public
 */
router.get(
    '/:id',
    optionalAuth,
    incidentController.getIncidentById.bind(incidentController)
);

/**
 * @route   PATCH /api/incidents/:id/status
 * @desc    Update incident status
 * @access  Private (Admin only)
 */
router.patch(
    '/:id/status',
    authenticate,
    isAdmin,
    incidentController.updateStatus.bind(incidentController)
);

/**
 * @route   POST /api/incidents/:id/upvote
 * @desc    Upvote an incident
 * @access  Private (Authenticated users)
 */
router.post(
    '/:id/upvote',
    optionalAuth,
    incidentController.upvoteIncident.bind(incidentController)
);

/**
 * @route   GET /api/incidents/stats
 * @desc    Get incident statistics
 * @access  Public
 */
router.get(
    '/stats',
    incidentController.getStats.bind(incidentController)
);

/**
 * @route   POST /api/incidents/broadcast
 * @desc    Initiate wide broadcast
 * @access  Private (Admin only)
 */
router.post(
    '/broadcast',
    authenticate,
    isAdmin,
    incidentController.broadcast.bind(incidentController)
);

export default router;
