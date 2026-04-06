import mongoose, { Schema, Document, Model } from "mongoose";
import { ConversationType } from "@raven/types";

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  avatar?: string;
  ownerId: mongoose.Types.ObjectId;
  type: ConversationType;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  id: string;
}

const ConversationSchema: Schema<IConversation> = new Schema(
  {
    name: { type: String, required: true },
    avatar: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: Object.values(ConversationType),
      default: ConversationType.GROUP,
    },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ConversationSchema.index({ ownerId: 1 });
ConversationSchema.index({ deletedAt: 1 });
ConversationSchema.index({ type: 1 });

export const Conversation: Model<IConversation> = mongoose.model<IConversation>("Conversation", ConversationSchema);
