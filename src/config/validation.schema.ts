import * as Joi from "joi";

export const validationSchema = Joi.object({
  // Service
  NODE_ENV: Joi.string()
    .valid("development", "qa", "production")
    .default("development"),
  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "debug")
    .default("info"),
  PORT: Joi.number().default(3010),

  // Redis
  CODING_REDIS_HOST: Joi.string().default("redis"),
  CODING_REDIS_PORT: Joi.number().default(6379),
  CODING_REDIS_URL: Joi.string().optional(),

  // Git
  GIT_BASE_REPOS_PATH: Joi.string().default("/tmp/base-repos"),
  GIT_WORKTREES_PATH: Joi.string().default("/tmp/worktrees"),

  // Coding Service
  CODING_MODEL: Joi.string().default("claude-sonnet-4-5-20250929"),
  CODING_TIMEOUT: Joi.number().default(900000),

  // Auth
  COMMON_INTERNAL_JWT_SECRET: Joi.string().required(),

  // External Services
  EXTERNAL_API_URL: Joi.string().required(),

  // Anthropic
  ANTHROPIC_API_KEY: Joi.string().required(),
});
