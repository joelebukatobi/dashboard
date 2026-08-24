#!/usr/bin/env bash
# Resolves DEPLOY_PATH into the two forms the deploy pipeline needs:
#
#   deploy_dir - absolute path used over SSH (e.g. /home/joel/sandbox)
#   ftp_dir    - path relative to the FTP login root, which for cPanel is
#                already the user's home, so the /home/<user> prefix must be
#                stripped (e.g. /sandbox/)
#
# Inputs (environment):
#   DEPLOY_PATH      required, absolute path on the server
#   CPANEL_FTP_USER  required, used to derive the /home/<user> prefix
#
# Outputs: writes `deploy_dir=` and `ftp_dir=` lines to stdout. The workflow
# appends them to $GITHUB_OUTPUT; the local rehearsal evals them.
set -euo pipefail

DEPLOY_DIR="$(printf '%s' "${DEPLOY_PATH:-}" | tr -d '\r' | sed 's/^ *//;s/ *$//')"
if [ -z "$DEPLOY_DIR" ]; then
  echo "::error::DEPLOY_PATH resolved to empty value" >&2
  exit 1
fi

# Strip a trailing slash from the SSH path so `cd` targets are consistent,
# but never reduce the path to an empty string.
case "$DEPLOY_DIR" in
  /) ;;
  */) DEPLOY_DIR="${DEPLOY_DIR%/}" ;;
esac

FTP_DIR="$DEPLOY_DIR"
HOME_PREFIX="/home/${CPANEL_FTP_USER:-}"
if [ -n "${CPANEL_FTP_USER:-}" ] && [ "${FTP_DIR#${HOME_PREFIX}}" != "$FTP_DIR" ]; then
  FTP_DIR="${FTP_DIR#${HOME_PREFIX}}"
fi

if [ -z "$FTP_DIR" ]; then
  FTP_DIR="/"
fi

case "$FTP_DIR" in
  /*) ;;
  *) FTP_DIR="/$FTP_DIR" ;;
esac

case "$FTP_DIR" in
  */) ;;
  *) FTP_DIR="$FTP_DIR/" ;;
esac

echo "deploy_dir=$DEPLOY_DIR"
echo "ftp_dir=$FTP_DIR"
