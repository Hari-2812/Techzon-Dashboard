import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupStudent extends Document {
  groupId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  studentName: string;
  phone: string;
  status: 'Pending' | 'Invited' | 'Joined' | 'Not Interested' | 'Invalid Number';
  invitedAt?: Date;
  joinedAt?: Date;
  lastFollowUpAt?: Date;
  followUpCount: number;
  notes?: string;
}

const GroupStudentSchema: Schema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: 'WhatsAppGroup', required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
  studentName: { type: String, required: true },
  phone: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Invited', 'Joined', 'Not Interested', 'Invalid Number'],
    default: 'Pending',
    index: true
  },
  invitedAt: { type: Date },
  joinedAt: { type: Date },
  lastFollowUpAt: { type: Date },
  followUpCount: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model<IGroupStudent>('GroupStudent', GroupStudentSchema);
