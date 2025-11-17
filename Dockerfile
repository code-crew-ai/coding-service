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

# Create workspace directories with appropriate permissions
RUN mkdir -p /tmp/base-repos /tmp/worktrees && \
    chmod -R 777 /tmp/base-repos /tmp/worktrees

# Note: Dependencies and built files are mounted from host via docker-compose volumes
CMD ["npm", "run", "start:dev"]
