import { IsString } from 'class-validator';

export class RepositoryDto {
  @IsString()
  owner: string;

  @IsString()
  name: string;

  @IsString()
  branch: string;
}
