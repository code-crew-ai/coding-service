import { Controller, Inject } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import {
  LoggingClient,
  WINSTON_MODULE_NEST_PROVIDER,
} from "@code-crew-ai/server";
import { CodingService } from "./coding.service";
import { CodingTaskDto } from "./dto/coding-task.dto";
import { CodingResultDto } from "./dto/coding-result.dto";

/**
 * Controller for handling coding task messages from Redis
 *
 * Uses NestJS request/response pattern - just returns the result.
 * NestJS automatically sends the response back via Redis transport.
 */
@Controller()
export class CodingController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggingClient,
    private codingService: CodingService,
  ) {}

  /**
   * Handle incoming coding tasks from Redis queue
   *
   * Pattern: 'coding-tasks'
   * Returns: CodingResultDto (automatically sent back via NestJS microservices)
   */
  @EventPattern("coding-tasks")
  async handleCodingTask(
    @Payload() data: CodingTaskDto,
  ): Promise<CodingResultDto> {
    const startTime = Date.now();

    this.logger.log(`Received coding task: ${data.taskId}`);

    try {
      // Execute task
      const result = await this.codingService.executeTask(data);

      // Calculate execution time
      result.executionTime = Date.now() - startTime;

      this.logger.log(
        `Task ${data.taskId} completed in ${result.executionTime}ms`,
      );

      return result;
    } catch (error) {
      // Return error result
      const errorResult: CodingResultDto = {
        taskId: data.taskId,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };

      this.logger.error(`Task ${data.taskId} failed: ${error.message}`);

      return errorResult;
    }
  }
}
