import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { loginSchema, registerSchema } from '../validations/auth.schema';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';
import prisma from '../prisma';

/**
 * Authentication controller
 */
export class AuthController {
    /**
     * POST /api/auth/login
     * Authenticate user and return JWT token
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate input
            const validatedData = loginSchema.parse(req.body);

            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email: validatedData.email },
            });

            if (!user) {
                throw new AppError('Invalid email or password', 401);
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(
                validatedData.password,
                user.passwordHash
            );

            if (!isPasswordValid) {
                throw new AppError('Invalid email or password', 401);
            }

            // Generate JWT token
            const token = generateToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });

            res.status(200).json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/register
     * Register a new user (primarily for admin seeding)
     */
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate input
            const validatedData = registerSchema.parse(req.body);

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: validatedData.email },
            });

            if (existingUser) {
                throw new AppError('User with this email already exists', 409);
            }

            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

            // Create user
            const user = await prisma.user.create({
                data: {
                    name: validatedData.name,
                    email: validatedData.email,
                    passwordHash,
                    role: validatedData.role,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
            });

            // Generate JWT token
            const token = generateToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });

            res.status(201).json({
                success: true,
                data: {
                    token,
                    user,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/auth/me
     * Get current authenticated user profile
     */
    async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new AppError('Authentication required', 401);
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    _count: {
                        select: { votes: true },
                    },
                },
            });

            if (!user) {
                throw new AppError('User not found', 404);
            }

            res.status(200).json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/auth/users
     * Get all users (Admin only)
     */
    async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            res.status(200).json({
                success: true,
                data: users,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/auth/users/:id
     * Delete a user (Admin only)
     */
    async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            await prisma.user.delete({
                where: { id },
            });

            res.status(200).json({
                success: true,
                message: 'User deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/auth/users/:id/role
     * Update user role (Admin only)
     */
    async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!['ADMIN', 'CITIZEN'].includes(role)) {
                throw new AppError('Invalid role', 400);
            }

            const user = await prisma.user.update({
                where: { id },
                data: { role },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true
                }
            });

            res.status(200).json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/users
     * Create a new user (Admin only)
     */
    async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Reusing register schema for validation
            const validatedData = registerSchema.parse(req.body);

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: validatedData.email },
            });

            if (existingUser) {
                throw new AppError('User with this email already exists', 409);
            }

            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

            // Create user
            const user = await prisma.user.create({
                data: {
                    name: validatedData.name,
                    email: validatedData.email,
                    passwordHash,
                    role: validatedData.role || 'CITIZEN',
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
            });

            res.status(201).json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
