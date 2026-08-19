import mongoose, { Schema, Document } from 'mongoose';

export interface IBreak {
  startAt: Date;
  endAt?: Date;
}

export interface IWorkSession extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  clockInAt: Date;
  clockOutAt?: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'MISSING_CLOCK_OUT' | 'REQUIRES_REVIEW';
  breaks: IBreak[];
}

const WorkSessionSchema: Schema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, index: true },
  clockInAt: { type: Date, required: true },
  clockOutAt: { type: Date },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'MISSING_CLOCK_OUT', 'REQUIRES_REVIEW'],
    default: 'ACTIVE',
    index: true
  },
  breaks: [{
    startAt: { type: Date, required: true },
    endAt: { type: Date }
  }]
}, { timestamps: true });

export default mongoose.model<IWorkSession>('WorkSession', WorkSessionSchema);
