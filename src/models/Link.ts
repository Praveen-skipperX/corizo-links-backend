import mongoose, { Document, Schema } from 'mongoose';

export type LinkStatus = 'active' | 'inactive';

export const LINK_TYPES = [
  'Google Sheets',
  'Google Docs',
  'Google Forms',
  'Microsoft Forms',
  'Microsoft Excel',
  'Microsoft Word',
  'Other',
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

export interface ILink extends Document {
  title: string;
  description: string;
  url: string;
  category: string;
  type: LinkType;
  status: LinkStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LinkSchema = new Schema<ILink>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
      default: 'General',
    },
    type: {
      type: String,
      enum: LINK_TYPES,
      required: [true, 'Link type is required'],
      default: 'Other',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILink>('Link', LinkSchema);
