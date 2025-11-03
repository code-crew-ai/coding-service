export interface Repository {
  owner: string;
  name: string;
  branch: string;
}

export interface WorkspaceSetup {
  workspacePath: string;
  repositories: Map<string, string>; // repo name -> local path
}

export interface CommitInfo {
  sha: string;
  message: string;
  filesChanged: string[];
}
