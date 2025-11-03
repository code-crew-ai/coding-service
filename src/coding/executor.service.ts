import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  constructor(private configService: ConfigService) {}

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

    try {
      // Ensure log directory exists
      await fs.mkdir(logDir, { recursive: true });

      // Augment system prompt with commit instructions
      const augmentedPrompt = this.augmentSystemPrompt(systemPrompt);

      // TODO: Integrate with Agent SDK
      // For now, this is a placeholder that would call the agent SDK
      this.logger.log(`Would execute Claude Code for task ${taskId}`);
      this.logger.debug(`Workspace: ${workspacePath}`);
      this.logger.debug(`Model: ${model}`);
      this.logger.debug(`Prompt: ${prompt}`);
      this.logger.debug(`System Prompt: ${augmentedPrompt}`);

      // Placeholder - actual SDK integration would go here
      // await executeAgentTask({
      //   workspacePath,
      //   repositories: Array.from(repositories.entries()).map(([name, path]) => ({ name, path })),
      //   prompt,
      //   systemPrompt: augmentedPrompt,
      //   files,
      //   model,
      //   logFile,
      //   timeout: this.configService.get<number>('coding.timeout'),
      //   bypassPermissions: true,
      // });

      this.logger.log(`Claude Code execution completed for task ${taskId}`);
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
