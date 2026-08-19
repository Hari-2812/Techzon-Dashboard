import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentCRRelationship extends Document {
  studentId: mongoose.Types.ObjectId;
  crId: mongoose.Types.ObjectId;
  source: 'Student Claimed' | 'Student Referred' | 'Admin Assigned';
  identifiedAt: Date;
}

const StudentCRRelationshipSchema: Schema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  crId: { type: Schema.Types.ObjectId, ref: 'CRProfile', required: true, index: true },
  source: { type: String, enum: ['Student Claimed', 'Student Referred', 'Admin Assigned'], required: true },
  identifiedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IStudentCRRelationship>('StudentCRRelationship', StudentCRRelationshipSchema);
