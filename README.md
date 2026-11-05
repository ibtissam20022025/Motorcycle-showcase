# MOTO X Performance

Static HTML, CSS and JavaScript motorcycle showcase. There is no Node application server or npm installation/build step.

## Run locally

Serve the repository with a static HTTP server (for example, VS Code Live Server), then open `index.html` or `about.html`. Keep the `css`, `js`, `frames` and image files together.

## Security checks

With Node.js 22 or newer, run:

```sh
node --test tests/cdn-integrity.test.mjs
```

The test fetches the five HTTPS script/stylesheet URLs, verifies their actual SHA-384 bytes and CORS support, and checks both pages. It also verifies that changed bytes and malformed hashes are rejected.

Lenis and GSAP scripts use exact pinned versions with Subresource Integrity. The Fontshare stylesheet has an integrity hash too. If a vendor changes that stylesheet, browsers deliberately refuse the changed resource and use the existing CSS font fallbacks. Review any changed upstream resource before updating its hash; do not remove integrity checks to hide an error.

## Deploy to TEST

Use the `security/test-hardening-20261105` branch for ProductPilot TEST checks. Publish the static files only after QA, Security, Risk and human approval allow deployment. No production configuration or automatic deployment workflow is included here.
