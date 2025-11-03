export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  port: parseInt(process.env.PORT, 10) || 3010,

  redis: {
    host: process.env.CODING_REDIS_HOST || 'redis',
    port: parseInt(process.env.CODING_REDIS_PORT, 10) || 6379,
    url: process.env.CODING_REDIS_URL,
  },

  git: {
    baseReposPath: process.env.GIT_BASE_REPOS_PATH || '/tmp/base-repos',
    worktreesPath: process.env.GIT_WORKTREES_PATH || '/tmp/worktrees',
  },

  coding: {
    model: process.env.CODING_MODEL || 'claude-sonnet-4-5-20250929',
    timeout: parseInt(process.env.CODING_TIMEOUT, 10) || 900000,
  },

  auth: {
    jwtSecret: process.env.COMMON_INTERNAL_JWT_SECRET,
  },

  externalApi: {
    baseUrl: process.env.EXTERNAL_API_URL || 'http://external-services-api:3000',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
});
