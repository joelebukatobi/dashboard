#!/bin/bash
# Installs the rehearsal's throwaway public key for the deploy user.
set -e
if [ -f /ssh-keys/id_rehearse.pub ]; then
  install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  install -m 600 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
    /ssh-keys/id_rehearse.pub "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  echo "sshd-setup: installed rehearsal key for ${DEPLOY_USER}"
else
  echo "sshd-setup: no /ssh-keys/id_rehearse.pub found — SSH will reject logins" >&2
fi
