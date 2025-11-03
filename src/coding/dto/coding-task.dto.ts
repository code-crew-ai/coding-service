import { IsString, IsArray, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { RepositoryDto } from "./repository.dto";

export class CodingTaskDto {
  @IsString()
  taskId: string;

  @IsString()
  orgId: string;

  @IsString()
  userId: string;

  @ValidateNested({ each: true })
  @Type(() => RepositoryDto)
  repositories: RepositoryDto[];

  @IsString()
  prompt: string;

  @IsString()
  jwt: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsArray()
  @IsOptional()
  files?: string[];

  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsString()
  @IsOptional()
  agentName?: string;

  @IsString()
  @IsOptional()
  prTitle?: string;

  @IsString()
  @IsOptional()
  branchName?: string;
}
