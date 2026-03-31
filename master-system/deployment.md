# DEPLOYMENT SPECIFICATION

This document defines the deployment for the agent platform.

---

## 1. LOCAL DEVELOPMENT

### Prerequisites

- Bun runtime (latest)
- Node.js 18+ (for some native dependencies)
- SQLite (bundled with Bun)

### Start Development Servers

```bash
# Terminal 1: Start API server
bun run --cwd packages/opencode src/index.ts serve

# Terminal 2: Start web client
bun run --cwd packages/app dev
```

### Verify Installation

```bash
# Check health
curl http://127.0.0.1:4096/health

# Check readiness
curl http://127.0.0.1:4096/ready

# List projects
curl http://127.0.0.1:4096/project
```

---

## 2. PRODUCTION BUILD

### Build All Packages

```bash
bun run build
```

### Build Individual Packages

```bash
# CLI/server
bun run --cwd packages/opencode build

# Web client
bun run --cwd packages/app build

# SDK
bun run sdk:build
```

### TypeCheck and Test

```bash
bun run typecheck
bun run test
```

---

## 3. DOCKER DEPLOYMENT

### Dockerfile

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb ./
COPY packages/opencode ./packages/opencode
COPY packages/app ./packages/app

RUN bun install --frozen-lockfile

RUN bun run build

EXPOSE 4096 5173

CMD ["bun", "run", "packages/opencode/dist/index.js", "serve"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  opencode:
    build: .
    ports:
      - "4096:4096"
      - "5173:5173"
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

---

## 4. ENVIRONMENT CONFIGURATION

### Development (.env)

```dotenv
OPENCODE_HOST=127.0.0.1
OPENCODE_PORT=4096
OPENCODE_BASE_URL=http://127.0.0.1:4096
OPENCODE_WEB_URL=http://127.0.0.1:5173
```

### Production (.env.production)

```dotenv
OPENCODE_HOST=0.0.0.0
OPENCODE_PORT=4096
OPENCODE_BASE_URL=https://your-domain.com
OPENCODE_WEB_URL=https://your-domain.com
OPENCODE_DATA_DIR=/data
OPENCODE_CONFIG_DIR=/config
OPENCODE_DISABLE_MDNS=1
```

---

## 5. SECURITY

- Never commit API keys
- Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- Enable CORS with specific origins in production
- Use HTTPS in production
- Implement rate limiting for API endpoints

---

## 6. SCALING

### Horizontal Scaling

The server is stateless:
- Use load balancer (nginx, HAProxy, cloud LB)
- Share SQLite across instances OR use PostgreSQL
- Use Redis for session state in multi-instance deployments

### Resource Recommendations

| Instance Count | Use Case |
|---------------|----------|
| 1 | Development, small teams |
| 2-5 | Medium teams, moderate load |
| 5+ | Large teams, high load |

### Performance Optimization

- Enable WAL mode for SQLite
- Use connection pooling
- Implement caching (Redis)
- Monitor and optimize slow queries

---

## 7. HEALTH CHECKS

```bash
# Server health
curl http://127.0.0.1:4096/health

# Readiness
curl http://127.0.0.1:4096/ready
```

---

## 8. MONITORING

### Recommended Metrics

- Request latency (p50, p95, p99)
- Error rates by type
- Token usage
- Active session count
- Tool execution times
- MCP connection status

### Logging

- Use structured JSON logs
- Include correlation IDs
- Log at appropriate levels (debug, info, warn, error)

---

## 9. BACKUP

- Regular SQLite backups (daily)
- Export session transcripts
- Backup configuration files
- Test restore procedures

---

This deployment specification is COMPLETE and DETERMINISTIC.