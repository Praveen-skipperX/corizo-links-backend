import { Router } from 'express';
import {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} from '../controllers/userController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

router.use(protect, restrictTo('admin'));

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);
router.patch('/:id/reset-password', resetUserPassword);

export default router;
