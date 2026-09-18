import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
