import { ConversationDto, ConversationType } from "@turbo-chat/types";

export const ApplicationFileType: string[] = [
  "docx",
  "xlsx",
  "pdf",
  "vnd.openxmlformats-officedocument.wordprocessingml.document",
  "vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const ConversationsData: ConversationDto[] = [
  {
    id: "1",
    name: "chat-room-1",
    type: ConversationType.GROUP,
    ownerId: "1",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    name: "chat-room-2",
    type: ConversationType.GROUP,
    ownerId: "1",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "3",
    name: "study-chat-1",
    type: ConversationType.GROUP,
    ownerId: "1",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "4",
    name: "study-chat-2",
    type: ConversationType.GROUP,
    ownerId: "1",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "5",
    name: "coding-challenge-1",
    type: ConversationType.GROUP,
    ownerId: "1",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "6",
    name: "coding-challenge-2",
    type: ConversationType.GROUP,
    ownerId: "1",
    createdAt: new Date("2024-01-01"),
  },
];
