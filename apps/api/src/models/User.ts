import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProvider {
  name: 'google' | 'github';
  providerId: string;
  email: string;
  avatar?: string;
  linkedAt: Date;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password?: string;
  avatar?: string;
  providers: IProvider[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  id: string;
}

const ProviderSchema = new Schema<IProvider>(
  {
    name: { type: String, enum: ['google', 'github'], required: true },
    providerId: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String },
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema: Schema<IUser> = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    avatar: { type: String },
    providers: { type: [ProviderSchema], default: [] },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for soft delete queries
UserSchema.index({ deletedAt: 1 });

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
