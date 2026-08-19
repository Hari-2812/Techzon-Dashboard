import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppGroup extends Document {
  crId: mongoose.Types.ObjectId;
  assignedEmployeeId: mongoose.Types.ObjectId; // Current owner
  college: string;
  department: string;
  year: string;
  section?: string;
  groupName: string;
  groupLink?: string;
  status: 'Not Created' | 'Creation Pending' | 'Created' | 'Students Joining' | 'Completed';
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppGroupSchema: Schema = new Schema({
  crId: { type: Schema.Types.ObjectId, ref: 'CRProfile', required: true, index: true },
  assignedEmployeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  college: { type: String, required: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  section: { type: String },
  groupName: { type: String, required: true },
  groupLink: { type: String },
  status: {
    type: String,
    enum: ['Not Created', 'Creation Pending', 'Created', 'Students Joining', 'Completed'],
    default: 'Not Created',
    index: true
  }
}, { timestamps: true });

export default mongoose.model<IWhatsAppGroup>('WhatsAppGroup', WhatsAppGroupSchema);
