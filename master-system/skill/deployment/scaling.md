# Scaling Rules

## Web Tier

- Scale horizontally without shared state
- Stateless instances behind load balancer

## Server Tier

- One writer per SQLite volume
- SSE connections sticky to server

## Multi-Workspace

- Assign each workspace to one writer node
- Route instance-scoped requests to correct node
