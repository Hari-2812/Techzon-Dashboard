import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  studentName: string;
  phone: string;
  email?: string;
  college: string;
  department: string;
  year: string;
  assignedEmployeeId: mongoose.Types.ObjectId;
  crStatus: 'Not Verified' | 'Asked Student' | 'Student Is CR' | 'Student Is Not CR' | 'CR Details Received' | 'CR Confirmed';
  leadStatus: 'New' | 'Assigned' | 'Contact Pending' | 'Contacted' | 'CR Identified' | 'Follow-up' | 'Completed' | 'No Response' | 'Invalid';
  nextFollowUp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema({
  studentName: { type: String, required: true },
  phone: { type: String, required: true, index: true },
  email: { type: String },
  college: { type: String, required: true, index: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  assignedEmployeeId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  crStatus: {
    type: String,
    enum: ['Not Verified', 'Asked Student', 'Student Is CR', 'Student Is Not CR', 'CR Details Received', 'CR Confirmed'],
    default: 'Not Verified',
    index: true
  },
  leadStatus: {
    type: String,
    enum: ['New', 'Assigned', 'Contact Pending', 'Contacted', 'CR Identified', 'Follow-up', 'Completed', 'No Response', 'Invalid'],
    default: 'New',
    index: true
  },
  nextFollowUp: { type: Date, index: true }
}, { timestamps: true });

export default mongoose.model<ILead>('Lead', LeadSchema);
