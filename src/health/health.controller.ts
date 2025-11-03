import { Controller, Get, Logger } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get()
  async checkHealth(): Promise<{
    status: string;
    timestamp: string;
    service: string;
  }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'coding-service',
    };
  }
}
