import mongoose, { Schema } from 'mongoose';

export interface IAIProfile {
  userId: mongoose.Types.ObjectId;
  name: string;
  systemPrompt?: string;
  avatarUrl?: string;
  voiceSettings?: any;
  model?: string;
}

const aiProfileSchema = new Schema<IAIProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  systemPrompt: { type: String },
  avatarUrl: { type: String },
  voiceSettings: { type: Schema.Types.Mixed },
  model: { type: String }
}, { timestamps: true });

export const AIProfile = mongoose.model<IAIProfile>('AIProfile', aiProfileSchema);
