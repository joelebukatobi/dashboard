#!/usr/bin/env bash
# Fails with a GitHub-annotated error naming the first missing secret.
# Takes the required variable names as arguments; reads their values from
# the environment.
set -euo pipefail

missing=0
for name in "$@"; do
  if [ -z "${!name:-}" ]; then
    echo "::error::Missing secret: $name" >&2
    missing=1
  fi
done

exit "$missing"
