# Hono Server Setup

## Server Creation

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { compress } from 'hono/compress'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', compress())
app.use('*', logger())

// Routes
app.get('/health', c => c.json({ healthy: true }))
app.get('/ready', c => c.json({ ready: true }))
app.route('/', router)

serve({
  fetch: app.fetch,
  port: 4096,
  hostname: '127.0.0.1',
})
```

## Route Groups

- `/global` - Config, logs, docs
- `/project` - Project CRUD
- `/session` - Session CRUD, prompt
- `/message` - Message CRUD
- `/permission` - Permission requests
- `/question` - Question requests
- `/provider` - Provider config
- `/mcp` - MCP management
- `/pty` - Terminal sessions
