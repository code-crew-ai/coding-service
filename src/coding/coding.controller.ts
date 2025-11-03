import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { LoggingClient } from '@code-crew-ai/server';
import { CodingHandler } from './coding.handler';
import { CodingTaskDto } from './dto/coding-task.dto';
import { CodingResultDto } from './dto/coding-result.dto';

/**
 * Controller for handling coding task messages from Redis
 *
 * Listens to the 'coding-tasks' event pattern and delegates to CodingHandler.
 */
@Controller()
export class CodingController {
  private readonly logger: LoggingClient;

  constructor(private readonly handler: CodingHandler) {
    this.logger = new LoggingClient('CodingController');
  }

  /**
   * Handle incoming coding tasks from Redis queue
   *
   * Pattern: 'coding-tasks'
   * Payload: CodingTaskDto object
   */
  @EventPattern('coding-tasks')
  async handleCodingTask(
    @Payload() data: CodingTaskDto,
  ): Promise<CodingResultDto> {
    this.logger.log(`Received coding task: ${data.taskId}`);

    try {
      const result = await this.handler.handleTask(data);
      this.logger.log(`Completed coding task: ${data.taskId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing coding task ${data.taskId}: ${error.message}`,
        error.stack,
      );
      return {
        taskId: data.taskId,
        success: false,
        error: error.message,
      };
    }
  }
}
