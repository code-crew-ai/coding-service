import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingClient } from '@code-crew-ai/server';
import { ClaudeAgentSDK } from '@code-crew-ai/agent-sdk';
import { GitService } from '../git/git.service';
import { ExternalApiService } from '../external-api/external-api.service';
import { CodingTaskDto } from './dto/coding-task.dto';
import { CodingResultDto } from './dto/coding-result.dto';
import * as fs from 'fs/promises';

/**
 * Handler for coding tasks
 *
 * Orchestrates the execution of Claude Code using the Agent SDK.
 * Manages git operations, workspace setup, and task execution.
 */
@Injectable()
export class CodingHandler {
  private readonly logger: LoggingClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly gitService: GitService,
    private readonly externalApiService: ExternalApiService,
  ) {
    this.logger = new LoggingClient('CodingHandler');
  }

  /**
   * Handle a coding task
   */
  async handleTask(task: CodingTaskDto): Promise<CodingResultDto> {
    const startTime = Date.now();
    this.logger.log(`Processing task ${task.taskId} for org ${task.orgId}`);

    try {
      // 1. Setup workspace and clone repositories
      const workspacePath = await this.setupWorkspace(task);

      // 2. Get installation token for GitHub operations
      const installationToken = await this.getInstallationToken(task);

      // 3. Clone repositories
      const repositoryPaths = await this.cloneRepositories(
        task,
        workspacePath,
        installationToken,
      );

      // 4. Execute Claude Code with Agent SDK
      const result = await this.executeClaudeCode(
        task,
        workspacePath,
        repositoryPaths,
      );

      // 5. Create pull requests for modified repositories
      const prUrls = await this.createPullRequests(
        task,
        repositoryPaths,
        installationToken,
      );

      // 6. Cleanup workspace
      await this.cleanup(workspacePath);

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Task ${task.taskId} completed in ${executionTime}ms with ${prUrls.length} PRs`,
      );

      return {
        taskId: task.taskId,
        success: result.success,
        prUrls,
        filesChanged: result.filesChanged,
        executionTime,
      };
    } catch (error) {
      this.logger.error(`Task ${task.taskId} failed: ${error.message}`);
      return {
        taskId: task.taskId,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Setup workspace directory for the task
   */
  private async setupWorkspace(task: CodingTaskDto): Promise<string> {
    const baseWorkspacePath = this.configService.get<string>(
      'WORKTREE_BASE_PATH',
      '/tmp/worktrees',
    );
    const workspacePath = `${baseWorkspacePath}/${task.orgId}/${task.taskId}`;

    await fs.mkdir(workspacePath, { recursive: true });
    this.logger.debug(`Created workspace at ${workspacePath}`);

    return workspacePath;
  }

  /**
   * Get GitHub installation token for the organization
   */
  private async getInstallationToken(task: CodingTaskDto): Promise<string> {
    try {
      // Extract owner and repos from task repositories
      const owners = [...new Set(task.repositories.map((r) => r.owner))];
      const repos = task.repositories.map((r) => r.name);

      // For simplicity, use the first owner (in practice, all repos should be from same org)
      const owner = owners[0];

      const response = await this.externalApiService.getInstallationToken(
        task.orgId,
        task.userId,
        task.taskId,
        owner,
        repos,
        task.jwt,
      );
      return response.token;
    } catch (error) {
      this.logger.error(
        `Failed to get installation token: ${error.message}`,
      );
      throw new Error('GitHub not connected. Please connect GitHub in settings.');
    }
  }

  /**
   * Clone repositories into the workspace
   */
  private async cloneRepositories(
    task: CodingTaskDto,
    workspacePath: string,
    installationToken: string,
  ): Promise<Map<string, string>> {
    const repositoryPaths = new Map<string, string>();

    for (const repo of task.repositories) {
      const repoPath = `${workspacePath}/${repo.name}`;
      const cloneUrl = `https://x-access-token:${installationToken}@github.com/${repo.owner}/${repo.name}.git`;

      await this.gitService.clone(cloneUrl, repoPath, repo.branch);
      repositoryPaths.set(repo.name, repoPath);

      this.logger.debug(`Cloned ${repo.owner}/${repo.name} to ${repoPath}`);
    }

    return repositoryPaths;
  }

  /**
   * Execute Claude Code using the Agent SDK
   */
  private async executeClaudeCode(
    task: CodingTaskDto,
    workspacePath: string,
    repositoryPaths: Map<string, string>,
  ): Promise<{ success: boolean; filesChanged: string[] }> {
    const model = task.model || 'claude-sonnet-4.5';
    const systemPrompt = this.buildSystemPrompt(task);

    this.logger.log(`Executing Claude Code with model ${model}`);

    // TODO: Integrate with Agent SDK to execute Claude Code
    // For now, this is a placeholder
    // const sdk = new ClaudeAgentSDK();
    // const result = await sdk.executeTask({
    //   workspacePath,
    //   prompt: task.prompt,
    //   systemPrompt,
    //   model,
    //   files: task.files,
    //   timeout: this.configService.get<number>('CODING_TIMEOUT', 900000),
    // });

    this.logger.debug(`Workspace: ${workspacePath}`);
    this.logger.debug(`Model: ${model}`);
    this.logger.debug(`Repositories: ${Array.from(repositoryPaths.keys()).join(', ')}`);

    return {
      success: true,
      filesChanged: [],
    };
  }

  /**
   * Build system prompt with coding instructions
   */
  private buildSystemPrompt(task: CodingTaskDto): string {
    const basePrompt = task.systemPrompt || this.getDefaultSystemPrompt();

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

  /**
   * Get default system prompt if none provided
   */
  private getDefaultSystemPrompt(): string {
    return `You are an expert software engineer working on a coding task.

Your goal is to:
1. Understand the requirements from the task description
2. Navigate the codebase to find relevant files
3. Make necessary changes following best practices
4. Ensure code quality (linting, type-checking, testing)
5. Commit your changes with clear, descriptive messages

Always prioritize:
- Code quality and maintainability
- Following existing patterns and conventions
- Writing clear, self-documenting code
- Including proper error handling
- Adding comments where logic is complex
`;
  }

  /**
   * Create pull requests for modified repositories
   */
  private async createPullRequests(
    task: CodingTaskDto,
    repositoryPaths: Map<string, string>,
    installationToken: string,
  ): Promise<string[]> {
    const prUrls: string[] = [];

    for (const [repoName, repoPath] of repositoryPaths.entries()) {
      // Check if repository has changes
      const hasChanges = await this.gitService.hasChanges(repoPath);

      if (!hasChanges) {
        this.logger.debug(`No changes in ${repoName}, skipping PR creation`);
        continue;
      }

      // Create branch name
      const branchName = task.branchName || `task/${task.taskId}`;

      // Get repo info
      const repo = task.repositories.find((r) => r.name === repoName);
      if (!repo) continue;

      // Create pull request
      const prUrl = await this.gitService.createPullRequest(
        repoPath,
        repo.owner,
        repo.name,
        branchName,
        task.prTitle || `Task ${task.taskId}`,
        task.prompt,
        installationToken,
      );

      prUrls.push(prUrl);
      this.logger.log(`Created PR for ${repoName}: ${prUrl}`);
    }

    return prUrls;
  }

  /**
   * Cleanup workspace after task completion
   */
  private async cleanup(workspacePath: string): Promise<void> {
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
      this.logger.debug(`Cleaned up workspace at ${workspacePath}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup workspace: ${error.message}`);
    }
  }
}
