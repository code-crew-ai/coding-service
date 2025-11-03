import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  /**
   * Get GitHub App installation token for repositories
   */
  async getInstallationToken(
    orgId: string,
    userId: string,
    taskId: string,
    owner: string,
    repos: string[],
    jwt: string,
  ): Promise<string> {
    const baseUrl = this.configService.get<string>('externalApi.baseUrl');
    const url = `${baseUrl}/api/v1/github/installation-token`;

    this.logger.debug(`Fetching installation token for ${owner} repos: ${repos.join(', ')}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { orgId, userId, taskId, owner, repos },
          {
            headers: { Authorization: `Bearer ${jwt}` },
          },
        ),
      );

      this.logger.debug(`Installation token retrieved successfully`);

      return response.data.token;
    } catch (error) {
      this.logger.error(`Failed to get installation token: ${error.message}`);

      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }

      throw new InternalServerErrorException('Failed to fetch GitHub token');
    }
  }
}
