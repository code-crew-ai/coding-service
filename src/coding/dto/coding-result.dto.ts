import { IsString, IsBoolean, IsArray, IsNumber, IsOptional } from 'class-validator';

export class CodingResultDto {
  @IsString()
  taskId: string;

  @IsBoolean()
  success: boolean;

  @IsArray()
  @IsOptional()
  filesChanged?: string[];

  @IsString()
  @IsOptional()
  commitMessage?: string;

  @IsString()
  @IsOptional()
  prUrl?: string;

  @IsArray()
  @IsOptional()
  prUrls?: string[];

  @IsString()
  @IsOptional()
  commitSha?: string;

  @IsString()
  @IsOptional()
  error?: string;

  @IsNumber()
  @IsOptional()
  executionTime?: number;
}
