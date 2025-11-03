# Coding Service

AI-powered code generation microservice using Claude Agent SDK.

## Architecture

This is a NestJS microservice that replaces the Python-based aider-service. It uses the Node.js Claude Agent SDK to execute Claude Code in isolated git worktrees.

**Communication Pattern:** NestJS request/response (Pattern 1) - same as agents. Uses Redis transport with automatic response handling via NestJS microservices.

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
- PR creation via GitHub CLI
- Modified repository detection

**ExternalApiModule:**
- GitHub App installation token retrieval
- Communication with external-services-api
- HTTP client configuration with retry logic

**CodingModule:**
- **CodingController**: Redis microservice controller listening on `coding-tasks`
- **CodingService**: Orchestrates 9-step workflow (JWT verification → GitHub token → workspace setup → execution → PR creation)
- **ExecutorService**: Agent SDK execution wrapper with system prompt augmentation
- Error handling and logging

**HealthModule:**
- HTTP health endpoint (GET /health)
- Redis connectivity check
- Service status reporting

## Workflow

### Request/Response Pattern

Agents send tasks using NestJS `ClientProxy.send()`:

```typescript
// Agent sends request
const result = await client.send<CodingResult>('coding-tasks', taskData);

// Coding-service controller handles and returns result
@EventPattern('coding-tasks')
async handleCodingTask(data: CodingTaskDto): Promise<CodingResultDto> {
  return await this.codingService.executeTask(data);
}
```

NestJS automatically handles the response via Redis transport.

### Orchestration Workflow (CodingService)

1. **JWT Verification** - Validate task authentication
2. **GitHub Token Retrieval** - Get installation token from external-services-api
3. **Workspace Setup** - Multi-repo workspace with git worktrees
4. **Branch Creation** - Create `task/{taskId}` branches
5. **Claude Code Execution** - Execute via Agent SDK with augmented system prompt
6. **Modified Repo Detection** - Identify repositories with changes
7. **Commit/Push/PR** - Process each modified repo (fallback commit if needed)
8. **Cleanup** - Remove workspace directory
9. **Result Return** - Structured result with PR URLs

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
