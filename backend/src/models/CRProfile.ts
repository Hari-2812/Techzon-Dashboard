import mongoose, { Schema, Document } from 'mongoose';

export interface ICRProfile extends Document {
  crName: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  section?: string;
  assignedEmployeeId: mongoose.Types.ObjectId; // Current owner
  status: 'Pending Contact' | 'Contacted' | 'Interested' | 'Follow-up' | 'Agreed' | 'Group Pending' | 'Group Created' | 'Students Joining' | 'Completed' | 'Not Interested' | 'No Response';
  createdAt: Date;
  updatedAt: Date;
}

const CRProfileSchema: Schema = new Schema({
  crName: { type: String, required: true },
  phone: { type: String, required: true, index: true },
  college: { type: String, required: true, index: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  section: { type: String },
  assignedEmployeeId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  status: {
    type: String,
    enum: ['Pending Contact', 'Contacted', 'Interested', 'Follow-up', 'Agreed', 'Group Pending', 'Group Created', 'Students Joining', 'Completed', 'Not Interested', 'No Response'],
    default: 'Pending Contact',
    index: true
  }
}, { timestamps: true });

export default mongoose.model<ICRProfile>('CRProfile', CRProfileSchema);
