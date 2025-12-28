import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post(
    '/login',
    authRateLimiter,
    authController.login.bind(authController)
);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
    '/register',
    authRateLimiter,
    authController.register.bind(authController)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
    '/me',
    authenticate,
    authController.getProfile.bind(authController)
);

/**
 * @route   GET /api/auth/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get(
    '/users',
    authenticate,
    isAdmin,
    authController.getUsers.bind(authController)
);

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Delete a user
 * @access  Private (Admin only)
 */
router.delete(
    '/users/:id',
    authenticate,
    isAdmin,
    authController.deleteUser.bind(authController)
);

export default router;
