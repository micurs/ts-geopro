#!/bin/bash
# Gitea API Helper Script
# Usage examples:
#   ./gitea-helper.sh list                         # List open issues
#   ./gitea-helper.sh create "Title" "Body"        # Create new issue
#   ./gitea-helper.sh comment 16 "Message"         # Add comment to issue #16
#   ./gitea-helper.sh close 16                     # Close issue #16
#   ./gitea-helper.sh reopen 16                    # Reopen issue #16

GITEA_URL="http://gitea.micurs.com:3000"
GITEA_TOKEN="${GITEA_TOKEN:-$(grep 'token:' ~/Library/Application\ Support/tea/config.yml 2>/dev/null | head -1 | awk '{print $2}')}"
REPO="micurs/ts-geopro"

if [ -z "$GITEA_TOKEN" ]; then
  echo "Error: GITEA_TOKEN not found. Set GITEA_TOKEN env var or ensure tea CLI is configured."
  exit 1
fi

case "$1" in
  list)
    STATE="${2:-open}"
    curl -s -H "Authorization: token $GITEA_TOKEN" \
      "$GITEA_URL/api/v1/repos/$REPO/issues?state=$STATE&limit=20" | \
      python3 -c "import sys,json; issues=json.load(sys.stdin); print('\n'.join([f'#{i[\"number\"]}: [{i[\"state\"]}] {i[\"title\"]}' for i in issues]))"
    ;;

  create)
    TITLE="$2"
    BODY="$3"
    if [ -z "$TITLE" ] || [ -z "$BODY" ]; then
      echo "Usage: $0 create <title> <body>"
      exit 1
    fi
    curl -s -X POST \
      -H "Authorization: token $GITEA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg title "$TITLE" --arg body "$BODY" '{title: $title, body: $body}')" \
      "$GITEA_URL/api/v1/repos/$REPO/issues" | \
      python3 -c "import sys,json; r=json.load(sys.stdin); print(f'✓ Issue #{r[\"number\"]} created: {r[\"title\"]}\n  URL: {r[\"html_url\"]}')"
    ;;

  comment)
    ISSUE_NUM="$2"
    COMMENT="$3"
    if [ -z "$ISSUE_NUM" ] || [ -z "$COMMENT" ]; then
      echo "Usage: $0 comment <issue_number> <comment_text>"
      exit 1
    fi
    curl -s -X POST \
      -H "Authorization: token $GITEA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"body\":\"$COMMENT\"}" \
      "$GITEA_URL/api/v1/repos/$REPO/issues/$ISSUE_NUM/comments" | \
      python3 -c "import sys,json; r=json.load(sys.stdin); print(f'✓ Comment added: {r[\"html_url\"]}')"
    ;;

  close)
    ISSUE_NUM="$2"
    if [ -z "$ISSUE_NUM" ]; then
      echo "Usage: $0 close <issue_number>"
      exit 1
    fi
    curl -s -X PATCH \
      -H "Authorization: token $GITEA_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"state":"closed"}' \
      "$GITEA_URL/api/v1/repos/$REPO/issues/$ISSUE_NUM" | \
      python3 -c "import sys,json; r=json.load(sys.stdin); print(f'✓ Issue #{r[\"number\"]} closed: {r[\"title\"]}')"
    ;;

  reopen)
    ISSUE_NUM="$2"
    if [ -z "$ISSUE_NUM" ]; then
      echo "Usage: $0 reopen <issue_number>"
      exit 1
    fi
    curl -s -X PATCH \
      -H "Authorization: token $GITEA_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"state":"open"}' \
      "$GITEA_URL/api/v1/repos/$REPO/issues/$ISSUE_NUM" | \
      python3 -c "import sys,json; r=json.load(sys.stdin); print(f'✓ Issue #{r[\"number\"]} reopened: {r[\"title\"]}')"
    ;;

  pr)
    TITLE="$2"
    BODY="$3"
    HEAD="$4"
    BASE="${5:-micurs/projection-2}"
    if [ -z "$TITLE" ] || [ -z "$BODY" ] || [ -z "$HEAD" ]; then
      echo "Usage: $0 pr <title> <body> <head_branch> [base_branch]"
      echo "Example: $0 pr \"My PR\" \"Description\" \"micurs/my-branch\" \"main\""
      exit 1
    fi
    curl -s -X POST \
      -H "Authorization: token $GITEA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg title "$TITLE" --arg body "$BODY" --arg head "$HEAD" --arg base "$BASE" '{title: $title, body: $body, head: $head, base: $base}')" \
      "$GITEA_URL/api/v1/repos/$REPO/pulls" | \
      python3 -c "import sys,json; r=json.load(sys.stdin); print(f'✓ PR #{r[\"number\"]} created: {r[\"title\"]}\n  URL: {r[\"html_url\"]}')"
    ;;

  *)
    echo "Gitea API Helper"
    echo "Usage: $0 {list|create|comment|close|reopen|pr} [args...]"
    echo ""
    echo "Commands:"
    echo "  list [state]                      List issues (default: open)"
    echo "  create <title> <body>             Create new issue"
    echo "  comment <num> <text>              Add comment to issue"
    echo "  close <num>                       Close issue"
    echo "  reopen <num>                      Reopen issue"
    echo "  pr <title> <body> <head> [base]   Create pull request"
    exit 1
    ;;
esac
