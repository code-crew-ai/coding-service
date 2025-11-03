import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingClient, WINSTON_MODULE_NEST_PROVIDER } from '@code-crew-ai/server';
import * as fs from 'fs/promises';
import { query } from '@anthropic-ai/claude-agent-sdk';

/**
 * Service for executing Claude Code using Agent SDK
 */
@Injectable()
export class ExecutorService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggingClient,
    private configService: ConfigService,
  ) {}

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
      // Setup log file handle
      const logHandle = await fs.open(logFile, 'w');
      await logHandle.write(`=== Claude Code Execution Log ===\n`);
      await logHandle.write(`Task ID: ${taskId}\n`);
      await logHandle.write(`Organization: ${orgId}\n`);
      await logHandle.write(`Workspace: ${workspacePath}\n`);
      await logHandle.write(`Repositories: ${repositories.size}\n`);
      for (const [name, path] of repositories.entries()) {
        await logHandle.write(`  - ${name}: ${path}\n`);
      }
      await logHandle.write(`Model: ${model}\n`);
      await logHandle.write(`Prompt: ${prompt.substring(0, 200)}...\n`);
      await logHandle.write(`===================\n\n`);

      // Build multi-repo context prompt
      const repoList = Array.from(repositories.entries())
        .map(([name]) => `- ${name} (at ./${name}/)`)
        .join('\n');

      const fullPrompt = `You have access to the following organization repositories in this workspace:
${repoList}

Each repository is available in the current workspace directory. You can read any files from any repository to understand patterns, shared code, and context.

When you make changes, work in the appropriate repository directory. Your changes will be committed and a pull request will be created in the repository you modify.

**Task:**
${prompt}
`;

      if (files && files.length > 0) {
        await logHandle.write(`Files: ${files.join(', ')}\n`);
      }

      this.logger.log(
        `Executing Claude Code for task ${taskId} with model ${model}`,
      );

      // Execute Claude Code via Agent SDK
      const sdkResult = query({
        prompt: fullPrompt,
        options: {
          model,
          cwd: workspacePath,
          allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
          permissionMode: 'bypassPermissions',
          maxTurns: 50,
          // Use Claude Code preset + append custom system prompt
          systemPrompt: {
            type: 'preset',
            preset: 'claude_code',
            append: augmentedPrompt,
          },
        },
      });

      let messageCount = 0;
      for await (const message of sdkResult) {
        messageCount++;
        await logHandle.write(`[MESSAGE #${messageCount}] ${message.type || 'unknown'}\n`);

        // Log message content if available
        if ('content' in message && Array.isArray(message.content)) {
          for (const block of message.content) {
            if (block.type === 'text' && 'text' in block) {
              this.logger.debug(`Claude response: ${block.text.substring(0, 100)}...`);
              await logHandle.write(`[RESPONSE] ${block.text}\n`);
            }
          }
        }
      }

      await logHandle.write(`\n[INFO] Execution completed after ${messageCount} messages\n`);
      await logHandle.close();

      this.logger.log(
        `Claude Code execution completed for task ${taskId} (${messageCount} messages)`,
      );

      return { success: true, logFile };
    } catch (error) {
      this.logger.error(`Claude Code execution failed: ${error.message}`, error.stack);

      // Try to log the error to file
      try {
        await fs.appendFile(logFile, `\n[ERROR] ${error.message}\n${error.stack}\n`);
      } catch (logError) {
        this.logger.error(`Failed to write error to log file: ${logError.message}`);
      }

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
