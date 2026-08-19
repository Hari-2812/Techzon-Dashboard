import mongoose, { Schema, Document } from 'mongoose';

export interface ICRActivity extends Document {
  crId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId; // The actual person who performed this activity
  activityType: string;
  description: string;
  metadata?: any;
  timestamp: Date;
}

const CRActivitySchema: Schema = new Schema({
  crId: { type: Schema.Types.ObjectId, ref: 'CRProfile', required: true, index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  activityType: { type: String, required: true },
  description: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true }
});

export default mongoose.model<ICRActivity>('CRActivity', CRActivitySchema);
