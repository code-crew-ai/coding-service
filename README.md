# Coding Service

AI-powered code generation microservice using Claude Agent SDK.

## Architecture

- NestJS microservice with Redis transport
- Executes Claude Code in isolated git worktrees
- Multi-repository context support
- Creates pull requests for code changes

## Key Features

- JWT-based task authentication
- Multi-repo workspace management
- Automatic commit detection
- PR creation for modified repositories
- Health check endpoint
- Enhanced logging with correlation IDs

## Environment Variables

See `.env.example` for configuration options.

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

## Production

Built and deployed via Docker Compose.
