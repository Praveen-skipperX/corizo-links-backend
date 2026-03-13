import { Router } from 'express';
import { login, logout, getMe, changePassword } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePassword);

export default router;
