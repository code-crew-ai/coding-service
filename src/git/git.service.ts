import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Repository, WorkspaceSetup, CommitInfo } from './interfaces/git.interface';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);
  private readonly baseReposPath: string;
  private readonly worktreesPath: string;

  constructor(private configService: ConfigService) {
    this.baseReposPath = this.configService.get<string>('git.baseReposPath');
    this.worktreesPath = this.configService.get<string>('git.worktreesPath');
  }

  /**
   * Setup multi-repository workspace for a task
   */
  async setupWorkspace(
    orgId: string,
    taskId: string,
    repositories: Repository[],
    token: string,
  ): Promise<WorkspaceSetup> {
    const workspacePath = path.join(this.worktreesPath, orgId, taskId);

    this.logger.log(`Setting up workspace at ${workspacePath}`);

    // Create workspace directory
    await fs.mkdir(workspacePath, { recursive: true });

    const repoMap = new Map<string, string>();

    for (const repo of repositories) {
      const repoPath = path.join(workspacePath, repo.name);
      repoMap.set(repo.name, repoPath);

      // Ensure base repo is cached
      const baseRepoPath = await this.ensureBaseRepo(repo.owner, repo.name, token);

      // Create worktree for this repo
      await this.createWorktree(baseRepoPath, repoPath, `task/${taskId}`, repo.branch);

      // Configure git identity
      await this.configureGitIdentity(repoPath);
    }

    return {
      workspacePath,
      repositories: repoMap,
    };
  }

  /**
   * Ensure base repository is cached and up-to-date
   */
  async ensureBaseRepo(owner: string, repo: string, token: string): Promise<string> {
    const repoPath = path.join(this.baseReposPath, owner, repo);

    try {
      // Check if repo already exists
      await fs.access(repoPath);

      this.logger.debug(`Base repo exists at ${repoPath}, fetching latest`);

      const git = simpleGit(repoPath);
      await git.fetch(['--all', '--prune']);

      return repoPath;
    } catch (error) {
      // Repo doesn't exist, clone it
      this.logger.log(`Cloning base repo ${owner}/${repo} to ${repoPath}`);

      await fs.mkdir(path.dirname(repoPath), { recursive: true });

      const repoUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
      const git = simpleGit();

      await git.clone(repoUrl, repoPath, ['--bare']);

      return repoPath;
    }
  }

  /**
   * Create worktree for a task
   */
  async createWorktree(
    baseRepoPath: string,
    workspacePath: string,
    branchName: string,
    baseBranch: string,
  ): Promise<void> {
    this.logger.debug(`Creating worktree at ${workspacePath} from branch ${baseBranch}`);

    const git = simpleGit(baseRepoPath);

    try {
      // Create worktree with new branch
      await git.raw(['worktree', 'add', '-b', branchName, workspacePath, `origin/${baseBranch}`]);

      this.logger.debug(`Worktree created successfully`);
    } catch (error) {
      this.logger.error(`Failed to create worktree: ${error.message}`);
      throw new InternalServerErrorException('Failed to create git worktree');
    }
  }

  /**
   * Configure git identity in workspace
   */
  async configureGitIdentity(workspacePath: string): Promise<void> {
    const git = simpleGit(workspacePath);

    await git.addConfig('user.name', 'Code Crew AI', false);
    await git.addConfig('user.email', 'bot@codecrew.ai', false);

    this.logger.debug(`Configured git identity for ${workspacePath}`);
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasUncommittedChanges(repoPath: string): Promise<boolean> {
    const git = simpleGit(repoPath);
    const status = await git.status();

    return !status.isClean();
  }

  /**
   * Check if commits exist on current branch compared to base
   */
  async hasCommits(repoPath: string, baseBranch: string): Promise<boolean> {
    const git = simpleGit(repoPath);

    try {
      const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
      const log = await git.log([`origin/${baseBranch}..${currentBranch.trim()}`]);

      return log.total > 0;
    } catch (error) {
      this.logger.error(`Error checking commits: ${error.message}`);
      return false;
    }
  }

  /**
   * Create commit with message
   */
  async createCommit(repoPath: string, message: string): Promise<CommitInfo> {
    const git = simpleGit(repoPath);

    // Stage all changes
    await git.add('.');

    // Get list of files that will be committed
    const status = await git.status();
    const filesChanged = [
      ...status.staged,
      ...status.modified,
      ...status.created,
    ];

    // Create commit
    const result = await git.commit(message);

    this.logger.log(`Created commit ${result.commit} in ${repoPath}`);

    return {
      sha: result.commit,
      message,
      filesChanged,
    };
  }

  /**
   * Push branch to remote
   */
  async pushBranch(repoPath: string, branchName: string, token: string): Promise<void> {
    const git = simpleGit(repoPath);

    // Get remote URL and update with token
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');

    if (!origin) {
      throw new InternalServerErrorException('No origin remote found');
    }

    // Update remote URL with token
    const urlWithToken = origin.refs.push.replace(
      'https://github.com',
      `https://x-access-token:${token}@github.com`,
    );

    await git.remote(['set-url', 'origin', urlWithToken]);

    // Push branch
    await git.push('origin', branchName, ['--set-upstream']);

    this.logger.log(`Pushed branch ${branchName} to origin`);
  }

  /**
   * Check if remote branch exists
   */
  async remoteBranchExists(repoPath: string, branchName: string): Promise<boolean> {
    const git = simpleGit(repoPath);

    try {
      const branches = await git.branch(['-r']);
      return branches.all.includes(`origin/${branchName}`);
    } catch (error) {
      this.logger.error(`Error checking remote branch: ${error.message}`);
      return false;
    }
  }

  /**
   * Create pull request via GitHub CLI
   */
  async createPullRequest(
    repoPath: string,
    title: string,
    body: string,
  ): Promise<string> {
    const { execSync } = require('child_process');

    try {
      this.logger.log(`Creating pull request: ${title}`);

      const result = execSync(
        `gh pr create --title "${title}" --body "${body}"`,
        {
          cwd: repoPath,
          encoding: 'utf-8',
        },
      );

      const prUrl = result.trim();
      this.logger.log(`Pull request created: ${prUrl}`);

      return prUrl;
    } catch (error) {
      this.logger.error(`Failed to create pull request: ${error.message}`);
      throw new InternalServerErrorException('Failed to create pull request');
    }
  }

  /**
   * Detect which repositories have modifications
   */
  async getModifiedRepositories(
    workspacePath: string,
    repositories: Repository[],
  ): Promise<string[]> {
    const modified: string[] = [];

    for (const repo of repositories) {
      const repoPath = path.join(workspacePath, repo.name);

      try {
        const hasChanges = await this.hasUncommittedChanges(repoPath);
        const hasNewCommits = await this.hasCommits(repoPath, repo.branch);

        if (hasChanges || hasNewCommits) {
          modified.push(repo.name);
        }
      } catch (error) {
        this.logger.warn(`Error checking ${repo.name}: ${error.message}`);
      }
    }

    return modified;
  }

  /**
   * Cleanup workspace directory
   */
  async cleanupWorkspace(workspacePath: string): Promise<void> {
    try {
      this.logger.log(`Cleaning up workspace at ${workspacePath}`);
      await fs.rm(workspacePath, { recursive: true, force: true });
      this.logger.debug(`Workspace cleaned up successfully`);
    } catch (error) {
      this.logger.error(`Failed to cleanup workspace: ${error.message}`);
      // Don't throw - cleanup is best effort
    }
  }
}
