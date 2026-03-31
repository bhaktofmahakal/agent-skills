# Open Agent Skills Ecosystem

A collection of reusable skills for building AI coding agents.

## Available Skills

- **master-system** - Complete Claude Code / OpenCode platform specification
- **landing-design** - Landing page design system
- **workflow-platform-core** - Workflow platform architecture
- **workflow-engine-runtime** - Workflow execution engine
- **builder-workspace** - Builder workspace UI
- **platform-production-hardening** - Production hardening guide
- **us-startup-hiring-coach** - US startup hiring guidance
- **applied-ai-project-coach** - AI project coaching

## Usage

```bash
# List available skills
bash skills.sh list

# Install all skills globally
bash skills.sh install --mode global --all

# Install specific skill
bash skills.sh install --mode global --skills master-system
```

## Development

To add a new skill:
1. Create a new directory in the root
2. Add a `SKILL.md` file with skill documentation
3. Update this file to include the new skill
4. Commit and push changes