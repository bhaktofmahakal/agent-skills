# Agent Skills

Reusable skills for coding agents (Codex, Claude Code, Copilot-style setups).

## Quick Install

Install from GitHub (public repo):

```bash
npx skills add bhaktofmahakal/agent-skills
```

## Direct `skills.sh` Install

Install all skills globally:

```bash
curl -fsSL https://raw.githubusercontent.com/bhaktofmahakal/agent-skills/main/skills.sh | bash -s -- install --mode global --all
```

Install selected skills into the current project:

```bash
curl -fsSL https://raw.githubusercontent.com/bhaktofmahakal/agent-skills/main/skills.sh | bash -s -- install --mode project --skills landing-design,workflow-platform-core
```

Use local clone (recommended for private/confidential repos):

```bash
git clone https://github.com/bhaktofmahakal/agent-skills.git
cd agent-skills
bash skills.sh install --mode global --all
```

## Available Skills

### Career and Positioning

1. `us-startup-hiring-coach`
2. `social-presence-optimizer`
3. `applied-ai-project-coach`

### Platform Skill Stack (Phase 1-5)

1. `landing-design`
2. `workflow-platform-core`
3. `workflow-engine-runtime`
4. `builder-workspace`
5. `platform-production-hardening`

## `skills.sh` Usage

List skills from repo:

```bash
bash skills.sh list
```

Install all skills:

```bash
bash skills.sh install --mode global --all
```

Install specific skills:

```bash
bash skills.sh install --mode project --skills landing-design,builder-workspace
```

Overwrite existing installs:

```bash
bash skills.sh install --mode global --all --force
```

## Confidentiality Guidance

- If skills contain proprietary architecture, prompts, or business logic, keep the repo **private**.
- Public GitHub is fine only for non-sensitive/open-source skill packs.
- For private repos, prefer local clone + `skills.sh`, or authenticated installs with token/SSH.
