# `src/site/`

Fork-owned. Dashboard ships this empty.

Admin-side controllers, services, schemas and templates for the concrete site
built on dashboard. `src/app` stays the public surface; routes stay under
`src/admin/routes/project/` and import from here.

Optional `src/site/csp.js`: extra Content Security Policy sources for this
site (an embedded map, video or outside font), added to dashboard's own:

```js
export default { frameSrc: ['https://maps.google.com', 'https://www.google.com'] };
```

See `docs/forking.md`.
