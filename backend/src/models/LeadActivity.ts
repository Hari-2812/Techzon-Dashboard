import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadActivity extends Document {
  leadId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId; // The actual person who performed this activity
  activityType: string;
  description: string;
  metadata?: any;
  timestamp: Date;
}

const LeadActivitySchema: Schema = new Schema({
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  activityType: { type: String, required: true },
  description: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true }
});

export default mongoose.model<ILeadActivity>('LeadActivity', LeadActivitySchema);
