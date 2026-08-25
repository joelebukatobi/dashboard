# Disabled workflows

GitHub Actions only reads `.github/workflows/`. Anything in this directory is
inert — it will not run on push, on pull request, or via `workflow_dispatch`,
and it does not appear in the Actions tab.

Both deploy workflows live here while the cPanel hosting is down, so pushes to
`dev` and `main` stay quiet instead of failing at the FTP step.

The files themselves are unchanged and their triggers are intact. To re-enable
one, move it back:

```bash
git mv .github/workflows-disabled/deploy-sandbox.yml .github/workflows/
```

`deploy-sandbox.yml` fires on push to `dev`; `deploy-production.yml` fires on
push to `main` or manually via `workflow_dispatch`. Both need their cPanel
secrets present in the repository settings.

Before re-enabling, rehearse the pipeline locally — it exercises the same
logic without needing a live host:

```bash
npm run deploy:rehearse
```

CI (`.github/workflows/ci.yml`) is deliberately still active.
