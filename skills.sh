#!/usr/bin/env bash
set -euo pipefail

REPO_URL_DEFAULT="https://github.com/bhaktofmahakal/agent-skills.git"
REF_DEFAULT="main"

SCRIPT_PATH="${BASH_SOURCE[0]:-}"
SCRIPT_DIR=""
if [[ -n "$SCRIPT_PATH" && -f "$SCRIPT_PATH" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi

ACTION="${1:-help}"
if [[ $# -gt 0 ]]; then
  shift
fi

MODE="global"
DEST=""
PROJECT_ROOT="${PWD}"
SKILLS_CSV=""
INSTALL_ALL="false"
FORCE="false"
REPO_URL="${REPO_URL_DEFAULT}"
REF="${REF_DEFAULT}"
SOURCE_ROOT=""
TMP_DIR=""

cleanup() {
  if [[ -n "${TMP_DIR:-}" && -d "${TMP_DIR:-}" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

usage() {
  cat <<'EOF'
Usage:
  skills.sh list [--repo-url URL] [--ref BRANCH_OR_TAG]
  skills.sh install [--mode global|project] [--all | --skills s1,s2]
                    [--dest PATH] [--project-root PATH]
                    [--force] [--repo-url URL] [--ref BRANCH_OR_TAG]

Examples:
  skills.sh list
  skills.sh install --mode global --all
  skills.sh install --mode project --skills landing-design,workflow-platform-core
  skills.sh install --mode project --project-root /path/to/app --all

Notes:
  - Global destination defaults to: $CODEX_HOME/skills (or ~/.codex/skills)
  - Project destination defaults to: <project-root>/.codex/skills
EOF
}

err() {
  echo "Error: $*" >&2
  exit 1
}

parse_common_flags() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo-url)
        [[ $# -ge 2 ]] || err "--repo-url requires a value"
        REPO_URL="$2"
        shift 2
        ;;
      --ref)
        [[ $# -ge 2 ]] || err "--ref requires a value"
        REF="$2"
        shift 2
        ;;
      --mode)
        [[ $# -ge 2 ]] || err "--mode requires a value"
        MODE="$2"
        shift 2
        ;;
      --dest)
        [[ $# -ge 2 ]] || err "--dest requires a value"
        DEST="$2"
        shift 2
        ;;
      --project-root)
        [[ $# -ge 2 ]] || err "--project-root requires a value"
        PROJECT_ROOT="$2"
        shift 2
        ;;
      --skills)
        [[ $# -ge 2 ]] || err "--skills requires a value"
        SKILLS_CSV="$2"
        shift 2
        ;;
      --all)
        INSTALL_ALL="true"
        shift
        ;;
      --force)
        FORCE="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        err "Unknown option: $1"
        ;;
    esac
  done
}

ensure_source_root() {
  if [[ -n "${SCRIPT_DIR:-}" ]] && find "$SCRIPT_DIR" -mindepth 1 -maxdepth 1 -type d -exec test -f "{}/SKILL.md" \; -print -quit | grep -q .; then
    SOURCE_ROOT="$SCRIPT_DIR"
    return
  fi

  TMP_DIR="$(mktemp -d)"
  git clone --depth 1 --branch "$REF" "$REPO_URL" "$TMP_DIR/repo" >/dev/null 2>&1 \
    || err "Failed to fetch repository: $REPO_URL (ref: $REF)"
  SOURCE_ROOT="$TMP_DIR/repo"
}

readarray_safe() {
  mapfile -t "$1" < <(shift; "$@")
}

list_available_skills() {
  local -a found
  readarray_safe found find "$SOURCE_ROOT" -mindepth 1 -maxdepth 1 -type d -exec test -f "{}/SKILL.md" \; -printf "%f\n"
  printf '%s\n' "${found[@]}" | sort
}

resolve_dest() {
  if [[ -n "$DEST" ]]; then
    echo "$DEST"
    return
  fi

  if [[ "$MODE" == "global" ]]; then
    local codex_home="${CODEX_HOME:-$HOME/.codex}"
    echo "$codex_home/skills"
    return
  fi

  if [[ "$MODE" == "project" ]]; then
    echo "$PROJECT_ROOT/.codex/skills"
    return
  fi

  err "Invalid mode: $MODE (expected global or project)"
}

copy_skill() {
  local skill_name="$1"
  local src="$SOURCE_ROOT/$skill_name"
  local dst_root="$2"
  local dst="$dst_root/$skill_name"

  [[ -d "$src" ]] || err "Skill not found in source: $skill_name"

  if [[ -e "$dst" ]]; then
    if [[ "$FORCE" != "true" ]]; then
      err "Destination already exists: $dst (use --force to overwrite)"
    fi
    rm -rf "$dst"
  fi

  mkdir -p "$dst_root"
  cp -R "$src" "$dst"
  echo "Installed: $skill_name -> $dst"
}

run_list() {
  parse_common_flags "$@"
  ensure_source_root
  echo "Skills from ${REPO_URL} (${REF}):"
  list_available_skills
}

run_install() {
  parse_common_flags "$@"
  ensure_source_root

  if [[ "$INSTALL_ALL" != "true" && -z "$SKILLS_CSV" ]]; then
    err "Provide --all or --skills <comma-separated-list>"
  fi
  if [[ "$INSTALL_ALL" == "true" && -n "$SKILLS_CSV" ]]; then
    err "Use either --all or --skills, not both"
  fi

  local dest_root
  dest_root="$(resolve_dest)"

  local -a requested
  if [[ "$INSTALL_ALL" == "true" ]]; then
    readarray_safe requested list_available_skills
  else
    IFS=',' read -r -a requested <<< "$SKILLS_CSV"
  fi

  [[ ${#requested[@]} -gt 0 ]] || err "No skills selected"

  for skill in "${requested[@]}"; do
    skill="$(echo "$skill" | xargs)"
    [[ -n "$skill" ]] || continue
    copy_skill "$skill" "$dest_root"
  done

  echo "Done. Restart Codex/your agent to pick up new skills."
}

case "$ACTION" in
  list)
    run_list "$@"
    ;;
  install)
    run_install "$@"
    ;;
  help|-h|--help|"")
    usage
    ;;
  *)
    err "Unknown action: $ACTION"
    ;;
esac
