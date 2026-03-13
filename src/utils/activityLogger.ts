import { Request } from 'express';
import Activity, { ActivityAction } from '../models/Activity';
import { IUser } from '../models/User';

export interface LogActivityParams {
  user: IUser;
  action: ActivityAction;
  details?: string;
  linkTitle?: string;
  req: Request;
}

/**
 * Extracts the real client IP address from request headers.
 * Handles reverse proxies and Vercel edge network.
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'Unknown';
};

/**
 * Creates an activity log entry asynchronously.
 * Errors are caught silently to avoid disrupting the main request flow.
 */
export const logActivity = async ({
  user,
  action,
  details = '',
  linkTitle,
  req,
}: LogActivityParams): Promise<void> => {
  try {
    await Activity.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action,
      details,
      linkTitle,
      ipAddress: getClientIp(req),
      timestamp: new Date(),
    });
  } catch (err) {
    // Log silently – never let activity logging break the main request
    console.error('Activity log error:', err);
  }
};
