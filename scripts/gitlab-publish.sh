#!/usr/bin/env bash
# Create GitLab project in namespace 10 and push main.
# Usage:
#   export GITLAB_TOKEN="glpat-..."   # api scope
#   ./scripts/gitlab-publish.sh
set -euo pipefail

GITLAB_HOST="${GITLAB_HOST:-https://gitlab.gudessence.dev}"
NAMESPACE_ID="${NAMESPACE_ID:-10}"
PROJECT_NAME="${PROJECT_NAME:-gudessence-tradeshow-app}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [[ -z "${GITLAB_TOKEN:-}" ]]; then
  echo "ERROR: Set GITLAB_TOKEN (Personal Access Token with api scope)."
  echo "Create at: ${GITLAB_HOST}/-/user_settings/personal_access_tokens"
  exit 1
fi

echo "Creating project ${PROJECT_NAME} in namespace ${NAMESPACE_ID}..."
RESPONSE=$(curl -sS --request POST \
  --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
  --header "Content-Type: application/json" \
  --data "{\"name\":\"${PROJECT_NAME}\",\"path\":\"${PROJECT_NAME}\",\"namespace_id\":${NAMESPACE_ID},\"visibility\":\"private\",\"initialize_with_readme\":false}" \
  "${GITLAB_HOST}/api/v4/projects")

SSH_URL=$(printf '%s' "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ssh_url_to_repo',''))" 2>/dev/null || true)

if [[ -z "$SSH_URL" ]]; then
  echo "API response: $RESPONSE"
  echo "If project already exists, set SSH_URL manually and re-run push only."
  exit 1
fi

cd "$ROOT"
git remote remove gitlab 2>/dev/null || true
git remote add gitlab "$SSH_URL"
git push -u gitlab main
echo "Published to: ${SSH_URL}"
