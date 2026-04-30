import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  fingerprint?: string;
  expiresAt: Date;
  createdAt: Date;
  id: string;
  isExpired(): boolean;
}

const SessionSchema: Schema<ISession> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshToken: { type: String, required: true, unique: true },
    fingerprint: { type: String },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Instance method to check if session is expired
SessionSchema.method("isExpired", function (): boolean {
  return this.expiresAt < new Date();
});

export const Session: Model<ISession> = mongoose.model<ISession>("Session", SessionSchema);
