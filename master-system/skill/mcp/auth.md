# MCP OAuth Authentication

## Overview

MCP servers can require OAuth authentication. The system handles the OAuth flow with PKCE for secure authorization.

## OAuth Configuration

```typescript
interface McpOAuthConfig {
  serverUrl: string
  clientId: string
  clientSecret?: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
}

interface McpAuthState {
  serverUrl: string
  clientId: string
  clientSecret?: string
  accessToken?: string
  refreshToken?: string
  expiry?: number
  pkceVerifier?: string
  pendingState?: string
  createdAt: number
  updatedAt: number
}
```

## OAuth Flow

### 1. Auth Required Detection

```typescript
async function connectWithAuth(
  ctx: ProjectInstance,
  config: McpServerConfig
): Promise<void> {
  try {
    // Try to connect
    await doConnect(ctx, config)
  } catch (error) {
    if (error.code === 'AUTH_REQUIRED' && config.auth?.type === 'oauth') {
      // Start OAuth flow
      await startOAuthFlow(ctx, config)
    } else {
      throw error
    }
  }
}
```

### 2. Start OAuth Flow

```typescript
async function startOAuthFlow(
  ctx: ProjectInstance,
  config: McpServerConfig
): Promise<string> {
  // Load existing auth or create new registration
  let auth = await loadMcpAuth(ctx, config.name)
  
  if (!auth) {
    // Create client registration
    auth = await createClientRegistration(ctx, config)
    await saveMcpAuth(ctx, config.name, auth)
  }
  
  // Generate PKCE verifier and state
  const verifier = generateCodeVerifier()
  const state = generateState()
  
  // Store for callback verification
  auth.pendingState = state
  auth.pkceVerifier = verifier
  await saveMcpAuth(ctx, config.name, auth)
  
  // Build authorization URL
  const authUrl = new URL(config.auth.authUrl)
  authUrl.searchParams.set('client_id', auth.clientId)
  authUrl.searchParams.set('redirect_uri', getCallbackUrl())
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', await generateCodeChallenge(verifier))
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('scope', config.auth.scopes?.join(' ') || 'read')
  
  // Open browser for user authorization
  openBrowser(authUrl.toString())
  
  // Start callback server
  const authCode = await waitForCallback(ctx, config.name, state)
  
  // Exchange code for tokens
  await exchangeCodeForTokens(ctx, config, authCode, verifier)
  
  // Retry connection
  await connectMcpServer(ctx, config)
}
```

### 3. Token Exchange

```typescript
async function exchangeCodeForTokens(
  ctx: ProjectInstance,
  config: McpServerConfig,
  code: string,
  verifier: string
): Promise<void> {
  const auth = await loadMcpAuth(ctx, config.name)
  
  const response = await fetch(config.auth.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: auth.clientId,
      client_secret: auth.clientSecret || '',
      code,
      code_verifier: verifier,
      redirect_uri: getCallbackUrl(),
    }),
  })
  
  if (!response.ok) {
    throw new Error('Token exchange failed')
  }
  
  const tokens = await response.json()
  
  // Update stored auth
  auth.accessToken = tokens.access_token
  auth.refreshToken = tokens.refresh_token
  auth.expiry = Date.now() + (tokens.expires_in * 1000)
  auth.pendingState = undefined
  auth.pkceVerifier = undefined
  await saveMcpAuth(ctx, config.name, auth)
}
```

### 4. Token Refresh

```typescript
async function refreshTokenIfNeeded(
  ctx: ProjectInstance,
  config: McpServerConfig
): Promise<string> {
  const auth = await loadMcpAuth(ctx, config.name)
  
  if (!auth.refreshToken) {
    throw new Error('No refresh token available')
  }
  
  // Refresh if expiring within 5 minutes
  if (auth.expiry && auth.expiry > Date.now() + 5 * 60 * 1000) {
    return auth.accessToken!
  }
  
  // Refresh token
  const response = await fetch(config.auth.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: auth.clientId,
      client_secret: auth.clientSecret || '',
      refresh_token: auth.refreshToken,
    }),
  })
  
  if (!response.ok) {
    throw new Error('Token refresh failed')
  }
  
  const tokens = await response.json()
  
  // Update stored tokens
  auth.accessToken = tokens.access_token
  if (tokens.refresh_token) {
    auth.refreshToken = tokens.refresh_token
  }
  auth.expiry = Date.now() + (tokens.expires_in * 1000)
  await saveMcpAuth(ctx, config.name, auth)
  
  return auth.accessToken!
}
```

### 5. Callback Handling

```typescript
// Callback server receives the OAuth redirect
async function handleOAuthCallback(
  code: string,
  state: string
): Promise<void> {
  // Find pending auth by state
  const pending = await findPendingAuth(state)
  
  if (!pending) {
    throw new Error('Invalid OAuth state')
  }
  
  // Verify state matches
  if (pending.pendingState !== state) {
    throw new Error('OAuth state mismatch')
  }
  
  // Complete the flow
  const config = await getMcpServerConfig(pending.serverName)
  await exchangeCodeForTokens(pending.ctx, config, code, pending.pkceVerifier)
}
```

## Auth State Persistence

```typescript
// Store auth state in mcp-auth.json
const authFilePath = path.join(dataDir, 'mcp-auth.json')

interface StoredMcpAuth {
  [serverName: string]: McpAuthState
}

async function loadMcpAuth(
  ctx: ProjectInstance,
  serverName: string
): Promise<McpAuthState | null> {
  const storage = await readAuthStorage()
  return storage[serverName] || null
}

async function saveMcpAuth(
  ctx: ProjectInstance,
  serverName: string,
  auth: McpAuthState
): Promise<void> {
  const storage = await readAuthStorage()
  storage[serverName] = auth
  await writeAuthStorage(storage)
}
```

## Timeout Handling

The pending auth flow times out after 5 minutes:

```typescript
const AUTH_TIMEOUT_MS = 5 * 60 * 1000

async function waitForCallback(
  ctx: ProjectInstance,
  serverName: string,
  state: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('OAuth timeout'))
    }, AUTH_TIMEOUT_MS)
    
    // Register callback handler
    onOAuthCallback(serverName, (code) => {
      clearTimeout(timeout)
      resolve(code)
    })
  })
}
```

## Auth Failure Recovery

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Invalid code | Token exchange error | Restart OAuth flow |
| Expired refresh token | 401 on refresh | Re-prompt for auth |
| State mismatch | Callback state != pending | Reject, clear pending |
| Server unavailable | Connection error | Retry with backoff |
| User denied | Callback with error | Notify user, clear pending |
