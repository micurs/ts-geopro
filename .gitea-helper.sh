#!/bin/bash
# Gitea API Helper Script
# Usage examples:
#   ./gitea-helper.sh list                    # List open issues
#   ./gitea-helper.sh comment 16 "Message"    # Add comment to issue #16
#   ./gitea-helper.sh close 16                # Close issue #16
#   ./gitea-helper.sh reopen 16               # Reopen issue #16

GITEA_URL="http://gitea.micurs.com:3000"
GITEA_TOKEN="ad68b8e297dcf1855ed28ad7c5e43ac1d496f35d"
REPO="micurs/ts-geopro"

case "$1" in
  list)
    STATE="${2:-open}"
    curl -s -H "Authorization: token $GITEA_TOKEN" \
      "$GITEA_URL/api/v1/repos/$REPO/issues?state=$STATE&limit=20" | \
      python3 -c "import sys,json; issues=json.load(sys.stdin); print('\n'.join([f'#{i[\"number\"]}: [{i[\"state\"]}] {i[\"title\"]}' for i in issues]))"
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

  *)
    echo "Gitea API Helper"
    echo "Usage: $0 {list|comment|close|reopen} [args...]"
    echo ""
    echo "Commands:"
    echo "  list [state]              List issues (default: open)"
    echo "  comment <num> <text>      Add comment to issue"
    echo "  close <num>               Close issue"
    echo "  reopen <num>              Reopen issue"
    exit 1
    ;;
esac
