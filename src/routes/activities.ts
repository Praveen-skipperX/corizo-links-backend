import { Router } from 'express';
import {
  getActivities,
  exportActivitiesCSV,
  logLinkClick,
  getClientIpAddress,
} from '../controllers/activityController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// Public — no auth required (used by login page security warning)
router.get('/my-ip', getClientIpAddress);

// All routes below require authentication
router.use(protect);

// Log a link click (all authenticated users)
router.post('/log-click', logLinkClick);

// Admin-only
router.get('/', restrictTo('admin'), getActivities);
router.get('/export/csv', restrictTo('admin'), exportActivitiesCSV);

export default router;
