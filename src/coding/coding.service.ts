import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  LoggingClient,
  WINSTON_MODULE_NEST_PROVIDER,
} from "@code-crew-ai/server";
import { JwtVerifierService } from "../auth/jwt-verifier.service";
import { ExternalApiService } from "../external-api/external-api.service";
import { GitService } from "../git/git.service";
import { ExecutorService } from "./executor.service";
import { CodingTaskDto } from "./dto/coding-task.dto";
import { CodingResultDto } from "./dto/coding-result.dto";

/**
 * Service for orchestrating coding task execution
 *
 * Implements the full workflow:
 * 1. JWT verification
 * 2. GitHub token retrieval
 * 3. Multi-repo workspace setup
 * 4. Branch creation in each repository
 * 5. Claude Code execution
 * 6. Detect modified repositories
 * 7. Process each modified repo (commits, push, PR creation)
 * 8. Cleanup workspace
 * 9. Return structured result
 */
@Injectable()
export class CodingService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggingClient,
    private jwtVerifier: JwtVerifierService,
    private externalApi: ExternalApiService,
    private gitService: GitService,
    private executor: ExecutorService,
    private configService: ConfigService,
  ) {}

  async executeTask(task: CodingTaskDto): Promise<CodingResultDto> {
    const { taskId, orgId, userId, repositories, prompt, jwt } = task;

    try {
      // 1. Verify JWT
      this.logger.debug(`Verifying JWT for task ${taskId}`);
      this.jwtVerifier.verifyTaskToken(jwt, taskId, orgId, userId);

      // 2. Get GitHub installation token
      this.logger.debug(`Fetching GitHub token for task ${taskId}`);
      const owner = repositories[0].owner;
      const repoNames = repositories.map((r) => r.name);
      const githubTokenResponse = await this.externalApi.getInstallationToken(
        orgId,
        userId,
        taskId,
        owner,
        repoNames,
        jwt,
      );
      const githubToken = githubTokenResponse.token;

      // 3. Setup multi-repo workspace
      this.logger.debug(`Setting up workspace for task ${taskId}`);
      const workspace = await this.gitService.setupWorkspace(
        orgId,
        taskId,
        repositories,
        githubToken,
      );

      // 4. Create branches in each repository (already done by setupWorkspace)
      // The branch name is `task/${taskId}` and is created in setupWorkspace
      const branchName = task.branchName || `task/${taskId}`;

      // 5. Execute Claude Code
      this.logger.log(`Executing Claude Code for task ${taskId}`);
      const model =
        task.model ||
        this.configService.get("coding.model", "claude-sonnet-4-5-20250929");
      const executionResult = await this.executor.execute(
        taskId,
        orgId,
        workspace.workspacePath,
        workspace.repositories,
        prompt,
        task.systemPrompt || "",
        task.files || [],
        model,
      );

      if (!executionResult.success) {
        throw new Error(executionResult.error);
      }

      // 6. Detect modified repositories
      const modifiedRepos = await this.gitService.getModifiedRepositories(
        workspace.workspacePath,
        repositories,
      );

      if (modifiedRepos.length === 0) {
        this.logger.warn(`No changes detected for task ${taskId}`);
        await this.gitService.cleanupWorkspace(workspace.workspacePath);
        return {
          taskId,
          success: false,
          error: "No changes were made",
        };
      }

      // 7. Process each modified repository
      const prUrls: string[] = [];
      const allFilesChanged: string[] = [];
      let commitMessage = "";
      let commitSha = "";

      for (const repoName of modifiedRepos) {
        const repoPath = workspace.repositories.get(repoName);
        const repo = repositories.find((r) => r.name === repoName);

        // Check if Claude already created commits
        const hasCommits = await this.gitService.hasCommits(
          repoPath,
          repo.branch,
        );
        const hasUncommitted =
          await this.gitService.hasUncommittedChanges(repoPath);

        // Create commit if Claude didn't
        if (!hasCommits && hasUncommitted) {
          this.logger.debug(`Creating fallback commit for ${repoName}`);
          const commit = await this.gitService.createCommit(
            repoPath,
            task.prTitle || `Task ${taskId}`,
          );
          commitMessage = commit.message;
          commitSha = commit.sha;
          allFilesChanged.push(...commit.filesChanged);
        }

        // Check if branch was pushed
        const remoteBranchExists = await this.gitService.remoteBranchExists(
          repoPath,
          branchName,
        );

        // Push if Claude didn't
        if (!remoteBranchExists) {
          this.logger.debug(`Pushing branch for ${repoName}`);
          await this.gitService.pushBranch(repoPath, branchName, githubToken);
        }

        // Create PR
        this.logger.debug(`Creating PR for ${repoName}`);
        const prUrl = await this.gitService.createPullRequest(
          repoPath,
          task.prTitle || `Task ${taskId}`,
          task.agentName ? `Automated changes by ${task.agentName}` : "",
        );
        prUrls.push(prUrl);
      }

      // 8. Cleanup workspace
      await this.gitService.cleanupWorkspace(workspace.workspacePath);

      // 9. Return result
      return {
        taskId,
        success: true,
        filesChanged: allFilesChanged,
        commitMessage,
        commitSha,
        prUrl: prUrls[0],
        prUrls,
      };
    } catch (error) {
      this.logger.error(`Task ${taskId} failed: ${error.message}`, error.stack);

      // Cleanup on error
      try {
        const workspacePath = `/tmp/worktrees/${orgId}/${taskId}`;
        await this.gitService.cleanupWorkspace(workspacePath);
      } catch (cleanupError) {
        this.logger.warn(`Cleanup failed: ${cleanupError.message}`);
      }

      return {
        taskId,
        success: false,
        error: error.message,
      };
    }
  }
}
