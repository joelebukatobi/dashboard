# Email Templates Design

**Date:** 2026-07-03  
**Status:** Approved  
**Scope:** Redesign invite, password reset, and SMTP test emails (v1 only).

---

## Summary

Replace the minimal inline HTML in `mail.service.js` with a shared branded layout inspired by Foxbit-style transactional emails: centered card, logo header, hero icon, headline, CTA, and footer. Uses black `#181818` and orange `#ea580c`, with site icon/name/URL from settings.

## Decisions

| Topic | Decision |
|-------|----------|
| Emails in scope | Invite, password reset, SMTP test |
| Out of scope | 2FA, login alert, social/app-store footer |
| Implementation | `src/lib/email-templates.js` + inline CSS (no MJML) |
| Branding | `siteName`, `siteUrl`, `siteIcon` from settings map |
| Font | System stack (no web fonts in email) |
| Icons | Inline SVG per email type; header uses absolute site icon URL |

## Architecture

- `email-templates.js` — layout helper, escapeHtml, absolute icon URL resolver, three render functions
- `mail.service.js` — keeps transport + URL/token logic; calls render functions for HTML bodies
- Unit tests assert branding, CTA URLs, and orange CTA color in output
