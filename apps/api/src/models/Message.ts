import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  text?: string;
  url?: string;
  fileName?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  id: string;
  tokenCount?: number;
  isArchived?: boolean;
}

const MessageSchema: Schema<IMessage> = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    text: { type: String },
    url: { type: String },
    fileName: { type: String },
    deletedAt: { type: Date, default: null },
    tokenCount: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ deletedAt: 1 });

export const Message: Model<IMessage> = mongoose.model<IMessage>("Message", MessageSchema);
