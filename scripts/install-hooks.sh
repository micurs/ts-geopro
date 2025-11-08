#!/bin/sh

# Script to install git hooks from .githooks directory
# This makes hooks available to all team members

set -e

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
GITHOOKS_DIR="$PROJECT_ROOT/.githooks"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

if [ ! -d "$GITHOOKS_DIR" ]; then
    echo "❌ .githooks directory not found"
    exit 1
fi

echo "🔧 Installing git hooks..."

# Create .git/hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Copy all hooks from .githooks to .git/hooks
for hook in "$GITHOOKS_DIR"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        cp "$hook" "$GIT_HOOKS_DIR/$hook_name"
        chmod +x "$GIT_HOOKS_DIR/$hook_name"
        echo "  ✅ Installed $hook_name"
    fi
done

echo "✨ Git hooks installed successfully!"

