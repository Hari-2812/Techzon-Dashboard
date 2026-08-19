import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceDaily extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  scheduledMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'PAID_LEAVE' | 'HOLIDAY' | 'WEEK_OFF' | 'EARLY_LEAVE' | 'OVERTIME' | 'REQUIRES_REVIEW';
  correctionStatus?: 'Pending' | 'Approved' | 'Rejected';
  correctionReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  isLocked: boolean;
}

const AttendanceDailySchema: Schema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, index: true },
  scheduledMinutes: { type: Number, default: 0 },
  workedMinutes: { type: Number, default: 0 },
  breakMinutes: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },
  earlyLeaveMinutes: { type: Number, default: 0 },
  overtimeMinutes: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'PAID_LEAVE', 'HOLIDAY', 'WEEK_OFF', 'EARLY_LEAVE', 'OVERTIME', 'REQUIRES_REVIEW'],
    required: true,
    index: true
  },
  correctionStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'] },
  correctionReason: { type: String },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  isLocked: { type: Boolean, default: false }
}, { timestamps: true });

// Compound index for unique daily attendance per employee
AttendanceDailySchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendanceDaily>('AttendanceDaily', AttendanceDailySchema);
