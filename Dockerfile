FROM node:20-alpine

# Install git, curl, and GitHub CLI
RUN apk add --no-cache git curl bash && \
    wget -O /tmp/gh.tar.gz https://github.com/cli/cli/releases/download/v2.40.0/gh_2.40.0_linux_amd64.tar.gz && \
    tar -xzf /tmp/gh.tar.gz -C /tmp && \
    mv /tmp/gh_2.40.0_linux_amd64/bin/gh /usr/local/bin/ && \
    rm -rf /tmp/gh*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create app directory
WORKDIR /app

# Copy package files and .npmrc
COPY package*.json .npmrc ./

# Accept build arg for GitHub token
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

# Create workspace directories
RUN mkdir -p /tmp/base-repos /tmp/worktrees && \
    chown -R appuser:appuser /tmp/base-repos /tmp/worktrees

USER appuser

# Expose health check port
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3010/health || exit 1

CMD ["node", "dist/main"]
