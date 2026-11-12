#!/bin/sh
# Turn a clone of dashboard into a fork, or re-arm an existing fork after a
# fresh clone. Safe to run more than once. See docs/forking.md.
#
#   sh scripts/fork-setup.sh <package-name> <origin-url>   # new fork
#   sh scripts/fork-setup.sh                                # existing fork, after cloning it
#
# What it does:
#   - points `upstream` at dashboard (renaming dashboard's `origin` on a fresh clone)
#   - copies .gitattributes.fork to .gitattributes (fork-owned paths merge as ours).
#     It copies rather than moves: .gitattributes.fork stays a shared file, so
#     dashboard can update it without conflicting. Rerun only after a pull that
#     changed .gitattributes.fork; everything else persists across merges.
#   - sets the `ours` merge driver; this is local git config, so every clone needs it
#   - optionally sets the package name and the fork's own `origin`
set -eu

UPSTREAM_URL='git@github.com:joelebukatobi/dashboard.git'
name=${1:-}
origin_url=${2:-}

cd "$(git rev-parse --show-toplevel)"

is_dashboard_url() {
  case "$1" in
    *joelebukatobi/dashboard.git|*joelebukatobi/dashboard|*joelebukatobi/dashboard-v2.git|*joelebukatobi/dashboard-v2) return 0 ;;
    *) return 1 ;;
  esac
}

origin_now=$(git remote get-url origin 2>/dev/null || true)
upstream_now=$(git remote get-url upstream 2>/dev/null || true)

# A fresh clone of dashboard: origin is dashboard and there is no upstream yet.
if [ -z "$upstream_now" ] && [ -n "$origin_now" ] && is_dashboard_url "$origin_now"; then
  if [ -z "$name" ]; then
    echo "This is dashboard itself (origin is $origin_now)." >&2
    echo "To turn this clone into a fork: sh scripts/fork-setup.sh <package-name> <origin-url>" >&2
    exit 1
  fi
  git remote rename origin upstream
  echo "Renamed origin to upstream."
elif [ -z "$upstream_now" ]; then
  git remote add upstream "$UPSTREAM_URL"
  echo "Added upstream: $UPSTREAM_URL"
fi

if [ -f .gitattributes.fork ] && ! cmp -s .gitattributes.fork .gitattributes; then
  cp .gitattributes.fork .gitattributes
  git add .gitattributes
  echo "Copied .gitattributes.fork to .gitattributes."
fi

git config merge.ours.driver true
echo "Set the ours merge driver."

if [ -n "$name" ]; then
  npm pkg set name="$name"
  echo "Set package name: $name"
fi

if [ -n "$origin_url" ]; then
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$origin_url"
  else
    git remote add origin "$origin_url"
  fi
  echo "Set origin: $origin_url"
fi

echo "Fork setup done. Review with: git status && git remote -v"
