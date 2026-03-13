import { Request, Response } from 'express';
import Link, { LINK_TYPES } from '../models/Link';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activityLogger';

const URL_REGEX = /^https?:\/\/.+/i;

export const getAllLinks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const links = await Link.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { links } });
  } catch (error) {
    console.error('Get all links error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getActiveLinks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const links = await Link.find({ status: 'active' })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { links } });
  } catch (error) {
    console.error('Get active links error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const link = await Link.findById(req.params.id).populate('createdBy', 'name email');
    if (!link) {
      res.status(404).json({ success: false, message: 'Link not found.' });
      return;
    }
    res.status(200).json({ success: true, data: { link } });
  } catch (error) {
    console.error('Get link error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const createLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, url, category, type, status } = req.body;

    if (!title || !url) {
      res.status(400).json({ success: false, message: 'Title and URL are required.' });
      return;
    }
    if (!URL_REGEX.test(url)) {
      res.status(400).json({ success: false, message: 'Please provide a valid URL starting with http:// or https://.' });
      return;
    }
    const linkType = type && LINK_TYPES.includes(type) ? type : 'Other';

    const link = await Link.create({
      title,
      description: description || '',
      url,
      category: category || 'General',
      type: linkType,
      status: status || 'active',
      createdBy: req.user?._id,
    });

    if (req.user) {
      void logActivity({
        user: req.user,
        action: 'Link Created',
        details: `Created link: "${title}" (${linkType})`,
        linkTitle: title,
        req,
      });
    }

    res.status(201).json({ success: true, message: 'Link created successfully.', data: { link } });
  } catch (error) {
    console.error('Create link error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const updateLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, url, category, type, status } = req.body;

    if (url && !URL_REGEX.test(url)) {
      res.status(400).json({ success: false, message: 'Please provide a valid URL starting with http:// or https://.' });
      return;
    }
    const linkType = type && LINK_TYPES.includes(type) ? type : undefined;

    const link = await Link.findByIdAndUpdate(
      req.params.id,
      { title, description, url, category, ...(linkType ? { type: linkType } : {}), status },
      { new: true, runValidators: true }
    );
    if (!link) {
      res.status(404).json({ success: false, message: 'Link not found.' });
      return;
    }

    if (req.user) {
      void logActivity({
        user: req.user,
        action: 'Link Updated',
        details: `Updated link: "${link.title}" (${link.type})`,
        linkTitle: link.title,
        req,
      });
    }

    res.status(200).json({ success: true, message: 'Link updated successfully.', data: { link } });
  } catch (error) {
    console.error('Update link error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const deleteLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const link = await Link.findByIdAndDelete(req.params.id);
    if (!link) {
      res.status(404).json({ success: false, message: 'Link not found.' });
      return;
    }

    if (req.user) {
      void logActivity({
        user: req.user,
        action: 'Link Deleted',
        details: `Deleted link: "${link.title}" (${link.type})`,
        linkTitle: link.title,
        req,
      });
    }

    res.status(200).json({ success: true, message: 'Link deleted successfully.' });
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
