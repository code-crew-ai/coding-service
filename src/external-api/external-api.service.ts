import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { LoggingClient } from '@code-crew-ai/server';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExternalApiService {
  private readonly logger: LoggingClient;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.logger = new LoggingClient('ExternalApiService');
  }

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
  ): Promise<{ token: string }> {
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

      return { token: response.data.token };
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
