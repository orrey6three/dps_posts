import express from 'express';
import adminController from '../controllers/admin.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/verify', requireAdmin, adminController.verifySession);
router.get('/stats', requireAdmin, adminController.getDashboardStats);

// Posts
router.get('/posts', requireAdmin, adminController.getPosts);
router.post('/posts', requireAdmin, adminController.createPost);
router.put('/posts/:id', requireAdmin, adminController.updatePost);
router.delete('/posts/:id', requireAdmin, adminController.deletePost);
router.get('/posts/:id/stats', requireAdmin, adminController.getPostStats);

// Users
router.get('/users', requireAdmin, adminController.getUsers);
router.delete('/users/:id', requireAdmin, adminController.deleteUser);

export default router;
