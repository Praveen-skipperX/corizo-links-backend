import { Router } from 'express';
import {
  getAllLinks,
  getActiveLinks,
  getLink,
  createLink,
  updateLink,
  deleteLink,
} from '../controllers/linkController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/active', getActiveLinks);
router.route('/').get(getAllLinks).post(restrictTo('admin'), createLink);
router
  .route('/:id')
  .get(getLink)
  .patch(restrictTo('admin'), updateLink)
  .delete(restrictTo('admin'), deleteLink);

export default router;
