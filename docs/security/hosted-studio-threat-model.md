# Hosted Studio threat model

Status: Draft security model for issue #82.

This document applies only to the proposed Hosted Studio runtime. Local Studio
continues to follow ADR 0007.

## Assets

Protected assets include:

- editorial YAML and image content;
- repository history and configured authoring branch;
- GitHub repository credentials;
- authentication/session credentials;
- deployment integrity;
- operator identity;
- unpublished or draft editorial information.

## Trust boundaries

```text
Operator browser
    |
    | untrusted HTTP input
    v
Hosted Studio deployment
    |
    | authenticated/authorized repository operations
    v
GitHub
    |
    | repository-triggered deployment
    v
Public site
```

The browser is never trusted merely because it rendered Studio UI.

GitHub and the configured identity provider are external security dependencies.

## Primary threats and controls

### Unauthenticated Studio access

Threat:
an internet visitor accesses Studio routes or mutation endpoints.

Controls:

- Hosted Studio disabled by default;
- authentication required before serving Studio data;
- server-side guard on the whole Studio route tree;
- mutation handlers repeat or consume centralized authorization context;
- public deployments continue returning 404.

### Broken authorization

Threat:
an authenticated account writes a site it is not permitted to manage.

Controls:

- explicit identity allow-list or equivalent authorization policy;
- deployment fixed to one configured repository/site initially;
- repository/branch never selected from browser input;
- centralized authorization decision.

### CSRF

Threat:
a logged-in operator is tricked into submitting a Studio mutation.

Controls:

- same-origin policy;
- Origin and Host validation;
- CSRF token or equivalent robust framework defense;
- SameSite session cookie;
- mutations only through non-GET requests.

### Session theft or fixation

Controls:

- HttpOnly session cookies;
- Secure cookies in production;
- session rotation at authentication;
- bounded session lifetime;
- logout invalidation;
- secrets never serialized into page data or client bundles.

### Repository credential theft

Controls:

- server-only credentials;
- minimum repository permissions;
- credential scoped to the configured repository where possible;
- no credential in YAML, Git history, logs, browser output, or public deployment;
- rotation procedure documented.

### Arbitrary repository writes / path traversal

Controls:

- canonical repository path validation;
- fixed allow-listed namespaces;
- reject absolute paths, `..`, encoded traversal and separator tricks;
- browser never supplies repository owner/repo/branch;
- no write access to workflows, source code, environment or Vercel metadata.

### Lost updates

Threat:
two sessions edit from the same old revision and the later save overwrites the
first.

Controls:

- expected revision on every mutation;
- compare current branch head before commit;
- reject stale changes;
- explicit conflict UI;
- no automatic force update.

### Partial multi-file mutation

Threat:
YAML changes but associated image does not, or vice versa.

Controls:

- build one repository tree/change-set;
- validate complete proposed state;
- create one commit;
- advance branch once.

### Malicious uploads

Threats:

- oversized files;
- disguised file types;
- parser/browser payloads;
- storage abuse;
- path manipulation.

Controls:

- existing size limit retained or tightened;
- strict extension and content-type rules;
- deterministic filename generation;
- bounded request body;
- no arbitrary remote fetch;
- SVG excluded initially;
- repository path allow-list;
- deployment content security remains independent.

### SSRF

Threat:
Studio is induced to fetch attacker-selected URLs from the server.

Controls:

- initial Hosted Studio does not support URL-based image import;
- provider calls use fixed API hosts;
- redirects and hosts must be constrained if remote fetch is added later.

### GitHub API abuse

Controls:

- bounded mutation sizes and file counts;
- retry policy that never turns conflicts into force writes;
- rate-limit handling;
- no general-purpose proxy endpoint;
- fixed repository configuration.

### Commit injection / misleading history

Controls:

- server-owned commit message format;
- sanitize operator-controlled text before including it in metadata;
- do not execute commit content in a shell;
- stable Hosted Studio marker in commit metadata/message.

### Validation bypass

Controls:

- validation is server-side;
- browser validation is only UX;
- repository commit occurs only after complete content validation;
- direct adapter APIs are not exposed to the browser.

### Secret leakage through errors

Controls:

- safe operator error messages;
- detailed provider failures restricted to server logs;
- redact tokens, cookies, authorization headers and provider responses;
- never echo environment configuration.

### Denial of service / resource exhaustion

Controls:

- request-size bounds;
- upload-size bounds;
- authentication before expensive operations where practical;
- rate limiting considered before public rollout;
- bounded GitHub API operations;
- no unbounded child-process execution in Hosted Studio.

### Public deployment accidentally becomes writable

Controls:

- visitor production and Hosted Studio are explicit separate runtime modes;
- hosted credentials exist only in the authoring deployment;
- startup/config validation fails closed;
- automated tests assert `/studio` remains unavailable in ordinary production.

## Security invariants

These invariants must have automated coverage before private PoC approval:

1. ordinary production returns no usable Studio surface;
2. Hosted Studio without a valid session cannot read Studio content;
3. authenticated but unauthorized identities cannot read or mutate;
4. GET requests cannot mutate;
5. stale revisions cannot overwrite current branch state;
6. paths outside the allow-list cannot be read or written through authoring APIs;
7. one logical multi-file mutation produces one repository revision;
8. invalid content never advances the branch;
9. repository/auth secrets never enter browser-visible data;
10. Local Studio remains functional without Hosted Studio credentials.

## Private PoC gate

The private deployment may begin only after:

- auth provider selected and documented;
- repository credentials scoped;
- all security invariants above have tests;
- CSRF/session configuration reviewed;
- upload path reviewed;
- Hosted Studio is isolated from the public production deployment.

Public or client-facing rollout requires a separate security review.
