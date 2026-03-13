import { Request, Response } from 'express';
import Activity from '../models/Activity';
import { AuthRequest } from '../middleware/auth';
import { logActivity, getClientIp } from '../utils/activityLogger';

export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    const search = (req.query.search as string)?.trim();
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
      ];
    }

    const action = (req.query.action as string)?.trim();
    if (action && action !== 'all') {
      filter.action = action;
    }

    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    const [activities, total] = await Promise.all([
      Activity.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      Activity.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const exportActivitiesCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    const search = (req.query.search as string)?.trim();
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
      ];
    }

    const action = (req.query.action as string)?.trim();
    if (action && action !== 'all') filter.action = action;

    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    const activities = await Activity.find(filter).sort({ timestamp: -1 }).limit(5000).lean();

    const header = 'Timestamp,User,Email,Action,Details,IP Address\n';
    const rows = activities
      .map((a) => {
        const ts = new Date(a.timestamp).toISOString();
        const escape = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`;
        return [
          ts,
          escape(a.userName),
          escape(a.userEmail),
          escape(a.action),
          escape(a.details),
          escape(a.ipAddress),
        ].join(',');
      })
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="activity-log-${Date.now()}.csv"`
    );
    res.status(200).send(header + rows);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/** Log when a user clicks "Open Link" from the dashboard */
export const logLinkClick = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { linkTitle, linkType, linkId } = req.body;
    if (req.user) {
      const typeLabel = linkType ? ` (${linkType})` : '';
      await logActivity({
        user: req.user,
        action: 'Link Clicked',
        details: `Clicked link: ${linkTitle || linkId || 'Unknown'}${typeLabel}`,
        linkTitle: linkTitle,
        req,
      });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Log link click error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/** Return the caller's IP address — used by the login page security warning */
export const getClientIpAddress = (req: Request, res: Response): void => {
  res.status(200).json({ success: true, data: { ip: getClientIp(req) } });
};
