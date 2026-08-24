# Stand-in for a cPanel shared-hosting account.
#
# cPanel is not legitimately containerisable — it needs a licensed, systemd
# RHEL host. What this image reproduces is the surface the deploy workflow
# actually touches:
#
#   - SSH on 22 with key auth, as a non-root user with a /home/<user> tree
#   - Node on PATH via ~/.bashrc, which is how cPanel's Node.js selector
#     exposes its chosen Node version to non-login shells
#   - Phusion Passenger behind nginx, which is what cPanel's "Setup Node.js
#     App" runs underneath — so tmp/restart.txt genuinely restarts the app
#
# Not reproduced: LiteSpeed/.htaccess routing, shared-hosting resource
# limits, WHM tooling.
FROM phusion/passenger-nodejs:3.2.0

ARG DEPLOY_USER=deploy
ARG NODE_MAJOR=24
# uid/gid must match the ftp service's FTP_USER_UID/GID in
# docker-compose.deploy-test.yml — both mount the same /home/deploy volume,
# and sshd's StrictModes rejects a home directory the user does not own.
ARG DEPLOY_UID=1001
ARG DEPLOY_GID=1001

ENV DEPLOY_USER=${DEPLOY_USER}

# Enable the services baseimage ships with disabled.
RUN rm -f /etc/service/nginx/down /etc/service/sshd/down

# Node 24, installed alongside the image's default and exposed the way
# cPanel's Node selector does it: prepended to PATH from ~/.bashrc.
RUN curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# The hosting account.
RUN groupadd -g "${DEPLOY_GID}" "${DEPLOY_USER}" \
    && useradd -m -u "${DEPLOY_UID}" -g "${DEPLOY_GID}" -s /bin/bash "${DEPLOY_USER}" \
    && mkdir -p "/home/${DEPLOY_USER}/sandbox" "/home/${DEPLOY_USER}/.ssh" \
    && chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}" \
    && chmod 700 "/home/${DEPLOY_USER}/.ssh" \
    # useradd leaves '!' in /etc/shadow, which sshd reads as a locked account
    # and refuses even for key auth (this image runs with UsePAM no). '*'
    # unlocks the account while still making password login impossible.
    && usermod -p '*' "${DEPLOY_USER}"

# cPanel writes this kind of PATH export into .bashrc; the deploy script
# sources it before running node/npm.
RUN printf '%s\n' \
    'export PATH=/usr/bin:$PATH' \
    'export NODE_ENV=production' \
    >> "/home/${DEPLOY_USER}/.bashrc"

COPY nginx-site.conf /etc/nginx/sites-enabled/sandbox.conf
COPY sshd-setup.sh /etc/my_init.d/10-sshd-setup.sh
RUN rm -f /etc/nginx/sites-enabled/default && chmod +x /etc/my_init.d/10-sshd-setup.sh

EXPOSE 22 80
CMD ["/sbin/my_init"]
