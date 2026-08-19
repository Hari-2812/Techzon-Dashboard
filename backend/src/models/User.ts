import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'RGS' | 'BDE';
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'RGS', 'BDE'], required: true },
  phone: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
