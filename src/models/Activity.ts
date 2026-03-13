import mongoose, { Document, Schema } from 'mongoose';

export type ActivityAction =
  | 'Login'
  | 'Logout'
  | 'Link Clicked'
  | 'Link Created'
  | 'Link Updated'
  | 'Link Deleted'
  | 'User Created'
  | 'User Updated'
  | 'User Deleted'
  | 'Password Reset';

export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  action: ActivityAction;
  details: string;
  linkTitle?: string;
  ipAddress: string;
  timestamp: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true },
    action: {
      type: String,
      enum: [
        'Login',
        'Logout',
        'Link Clicked',
        'Link Created',
        'Link Updated',
        'Link Deleted',
        'User Created',
        'User Updated',
        'User Deleted',
        'Password Reset',
      ],
      required: true,
    },
    details: { type: String, default: '', trim: true },
    linkTitle: { type: String, trim: true },
    ipAddress: { type: String, default: 'Unknown' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Index for efficient queries
ActivitySchema.index({ timestamp: -1 });
ActivitySchema.index({ userId: 1 });
ActivitySchema.index({ action: 1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);
