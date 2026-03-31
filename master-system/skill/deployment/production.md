# Production Deployment

## Containers

```dockerfile
# Server
FROM oven/bun:1
WORKDIR /app
COPY packages/opencode ./packages/opencode
RUN bun install --prod
EXPOSE 4096
CMD ["bun", "run", "src/index.ts", "serve"]

# Web
FROM oven/bun:1
WORKDIR /app
COPY packages/app ./packages/app
RUN bun install && bun run build
EXPOSE 5173
CMD ["bun", "x", "serve", "dist"]
```

## Deployment Steps

1. Build images
2. Run database backup
3. Stop writes
4. Replace server container
5. Run migrations
6. Start server
7. Shift traffic
8. Deploy web container
