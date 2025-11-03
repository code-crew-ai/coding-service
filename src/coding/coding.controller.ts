import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RedisContext } from '@nestjs/microservices';
import { LoggingClient } from '@code-crew-ai/server';
import Redis from 'ioredis';
import { CodingService } from './coding.service';
import { CodingTaskDto } from './dto/coding-task.dto';
import { CodingResultDto } from './dto/coding-result.dto';

/**
 * Controller for handling coding task messages from Redis
 *
 * Listens to 'coding-tasks' channel and publishes results to 'coding-results:{taskId}'
 */
@Controller()
export class CodingController {
  private readonly logger: LoggingClient;

  constructor(
    private codingService: CodingService,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
  ) {
    this.logger = new LoggingClient('CodingController');
  }

  /**
   * Handle incoming coding tasks from Redis queue
   *
   * Pattern: 'coding-tasks'
   * Publishes result to: 'coding-results:{taskId}'
   */
  @EventPattern('coding-tasks')
  async handleCodingTask(
    @Payload() data: CodingTaskDto,
    @Ctx() context: RedisContext,
  ): Promise<void> {
    const startTime = Date.now();

    this.logger.log(`Received coding task: ${data.taskId}`);

    try {
      // Execute task
      const result = await this.codingService.executeTask(data);

      // Calculate execution time
      result.executionTime = Date.now() - startTime;

      // Publish result to task-specific channel
      await this.redisClient.publish(
        `coding-results:${data.taskId}`,
        JSON.stringify(result),
      );

      this.logger.log(
        `Task ${data.taskId} completed in ${result.executionTime}ms`,
      );
    } catch (error) {
      // Always return a result, even on error
      const errorResult: CodingResultDto = {
        taskId: data.taskId,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };

      await this.redisClient.publish(
        `coding-results:${data.taskId}`,
        JSON.stringify(errorResult),
      );

      this.logger.error(`Task ${data.taskId} failed: ${error.message}`);
    }
  }
}
