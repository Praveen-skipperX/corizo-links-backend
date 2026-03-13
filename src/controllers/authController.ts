import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activityLogger';

const signToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

const sendTokenCookie = (res: Response, token: string): void => {
  const maxAge =
    parseInt(process.env.JWT_COOKIE_EXPIRES_DAYS || '7', 10) * 24 * 60 * 60 * 1000;
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge,
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide email and password.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id.toString(), user.role);
    sendTokenCookie(res, token);

    // Log login activity (non-blocking)
    void logActivity({
      user,
      action: 'Login',
      details: `Logged in successfully`,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  // Log logout before clearing cookie
  if (req.user) {
    void logActivity({
      user: req.user,
      action: 'Logout',
      details: 'Logged out',
      req,
    });
  }

  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res
        .status(400)
        .json({ success: false, message: 'Please provide current and new password.' });
      return;
    }
    if (newPassword.length < 8) {
      res
        .status(400)
        .json({ success: false, message: 'New password must be at least 8 characters.' });
      return;
    }

    const user = await User.findById(req.user?._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    user.password = newPassword;
    await user.save();

    if (req.user) {
      void logActivity({
        user: req.user,
        action: 'Password Reset',
        details: 'Changed own password',
        req,
      });
    }

    res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
