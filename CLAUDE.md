# Coding Service

AI-powered code generation microservice using Claude Agent SDK.

## Architecture

This is a NestJS microservice that replaces the Python-based aider-service. It uses the Node.js Claude Agent SDK to execute Claude Code in isolated git worktrees.

### Key Components

**ConfigModule:**
- Load and validate environment variables
- Provide typed configuration objects (RedisConfig, GitConfig, etc.)
- Schema validation with Joi

**AuthModule:**
- JWT token verification (signature, expiration, claims)
- JWT generation for internal service calls
- Shared secret validation

**GitModule:**
- Base repository caching and updates
- Multi-repo workspace creation
- Worktree operations (create, cleanup)
- Git identity configuration
- Commit, push, and branch operations
- PR creation via GitHub CLI or REST API
- Modified repository detection

**ExternalApiModule:**
- GitHub App installation token retrieval
- Communication with external-services-api
- HTTP client configuration with retry logic

**CodingModule:**
- Redis microservice controller (message handler)
- Task orchestration and workflow
- Agent SDK execution wrapper
- Result publishing
- Error handling and logging

**HealthModule:**
- HTTP health endpoint (GET /health)
- Redis connectivity check
- Service status reporting

## Redis Channels

**Input:** `coding-tasks`
- Receives task requests from agents

**Output:** `coding-results:{taskId}`
- Publishes task results back to requesting agent

## Development

```bash
npm install
npm run start:dev
```

## Testing

```bash
npm run test
npm run test:e2e
```

## Docker

```bash
docker build -t coding-service .
docker run -p 3010:3010 coding-service
```

Health endpoint: http://localhost:3010/health
