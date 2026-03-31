# Validation Layers

## HTTP Request Validation

All HTTP routes validate input with Zod:

```typescript
const PromptRequestSchema = z.object({
  sessionId: z.string(),
  text: z.string(),
  agent: z.string().optional(),
  model: z.object({
    providerID: z.string(),
    modelID: z.string(),
  }).optional(),
  format: z.unknown().optional(),
  parts: z.array(MessagePartSchema).optional(),
})

app.post('/session/:id/prompt', async (c) => {
  const body = await c.req.json()
  const parsed = PromptRequestSchema.parse(body)
  // ...
})
```

## Tool Input Validation

Tools validate input before execution:

```typescript
const tool = {
  name: 'read',
  input: z.object({
    path: z.string(),
    start: z.number().optional(),
    end: z.number().optional(),
  }),
  execute: async (ctx, input) => {
    // input already validated
  }
}
```

## Provider Output Validation

Structured outputs validated against schema.
