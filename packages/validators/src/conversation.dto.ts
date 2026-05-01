import { IsString, IsEnum, IsArray, IsOptional } from "class-validator";
import { ConversationType } from "@turbo-chat/types";
import { IsMongoDbId } from "./decorators";

export class CreateConversationRequestDto {
  @IsString()
  @IsOptional()
  name!: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsEnum(ConversationType)
  type!: ConversationType;

  @IsArray()
  @IsString({ each: true })
  @IsMongoDbId({ each: true })
  userIds!: string[];
}

export class UpdateConversationRequestDto {
  @IsString()
  name!: string;

  @IsString()
  avatar?: string;
}

export class ConversationMembershipRequest {
  @IsMongoDbId()
  userId!: string;
}
