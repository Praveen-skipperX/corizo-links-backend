import { Request, Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activityLogger';

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { users } });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email and password are required.' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'Email is already registered.' });
      return;
    }

    const user = await User.create({ name, email, password, role: role || 'author' });

    if (req.user) {
      void logActivity({
        user: req.user,
        action: 'User Created',
        details: `Created user: "${name}" (${email}) with role: ${role || 'author'}`,
        req,
      });
    }

    res.status(201).json({ success: true, message: 'User created successfully.', data: { user } });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
      { new: true, runValidators: true }
    );
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (req.user) {
      void logActivity({
        user: req.user,
        action: 'User Updated',
        details: `Updated user: "${user.name}" (${user.email})`,
        req,
      });
    }

    res.status(200).json({ success: true, message: 'User updated successfully.', data: { user } });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?._id.toString() === req.params.id) {
      res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
      return;
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (req.user) {
      void logActivity({
        user: req.user,
        action: 'User Deleted',
        details: `Deleted user: "${user.name}" (${user.email})`,
        req,
      });
    }

    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      res
        .status(400)
        .json({ success: false, message: 'New password must be at least 8 characters.' });
      return;
    }
    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    user.password = newPassword;
    await user.save();

    if (req.user) {
      void logActivity({
        user: req.user,
        action: 'Password Reset',
        details: `Reset password for user: "${user.name}" (${user.email})`,
        req,
      });
    }

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
