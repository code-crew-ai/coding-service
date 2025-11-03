import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingClient } from '@code-crew-ai/server';
import * as fs from 'fs/promises';

/**
 * Service for executing Claude Code using Agent SDK
 */
@Injectable()
export class ExecutorService {
  private readonly logger: LoggingClient;

  constructor(private configService: ConfigService) {
    this.logger = new LoggingClient('ExecutorService');
  }

  /**
   * Execute Claude Code with Agent SDK
   */
  async execute(
    taskId: string,
    orgId: string,
    workspacePath: string,
    repositories: Map<string, string>,
    prompt: string,
    systemPrompt: string,
    files: string[],
    model: string,
  ): Promise<{
    success: boolean;
    error?: string;
    logFile: string;
  }> {
    const logDir = `/tmp/worktrees/${orgId}/logs`;
    const logFile = `${logDir}/${taskId}.log`;

    // Ensure log directory exists
    await fs.mkdir(logDir, { recursive: true });

    // Augment system prompt with commit instructions
    const augmentedPrompt = this.augmentSystemPrompt(systemPrompt);

    // Prepare Agent SDK options
    const options = {
      workspacePath,
      repositories: Array.from(repositories.entries()).map(([name, path]) => ({
        name,
        path,
      })),
      prompt,
      systemPrompt: augmentedPrompt,
      files,
      model,
      logFile,
      timeout: this.configService.get<number>('coding.timeout', 900000),
      bypassPermissions: true,
    };

    try {
      // TODO: Execute Claude Code via Agent SDK
      // For now, this is a placeholder until Agent SDK integration is complete
      // const { executeAgentTask } = require('@code-crew-ai/agent-sdk');
      // await executeAgentTask(options);

      this.logger.log(
        `Claude Code execution completed for task ${taskId}`,
      );
      this.logger.debug(`Execution options: ${JSON.stringify(options, null, 2)}`);

      return { success: true, logFile };
    } catch (error) {
      this.logger.error(`Claude Code execution failed: ${error.message}`);
      return { success: false, error: error.message, logFile };
    }
  }

  /**
   * Augment system prompt with commit instructions
   */
  private augmentSystemPrompt(basePrompt: string): string {
    const commitInstructions = `

IMPORTANT GIT WORKFLOW INSTRUCTIONS:
- You are working in a multi-repository workspace
- Each organization repository is available in the workspace
- Navigate between repositories using relative paths
- When your work is complete, create git commits for ALL modified files
- Use conventional commit format (feat:, fix:, refactor:, etc.)
- Run quality checks before committing (lint, type-check, tests if applicable)
- Ensure commit messages are descriptive and explain WHY changes were made

Multi-Repository Context:
- You have access to multiple repositories for context and cross-repo understanding
- Read from any repo to understand patterns, conventions, and existing code
- You can modify files in any repository as needed
- Changes in each repository will result in separate pull requests

Quality Standards:
- Run linters and fix issues before committing
- Run type checkers and resolve type errors
- Run tests if they exist and are fast enough
- Follow existing code style and conventions in the repository
`;

    return basePrompt + commitInstructions;
  }
}
