---
name: console-security
description: Apply the console's security rules. Use whenever handling API keys, the Backend Address, environment variables, storage, logging, headers or the Content Security Policy, or when adding anything that sends data to a server.
---

# Console security

Policy owner: project owner. Source: spec section 6 and plan invariants 7, 8, 13, 14.

When you write or change code that touches keys, addresses, storage, logs or headers:

1. **Keys**: the pasted API key lives in memory. Session storage only if the user opts in. Never local storage, never a URL or query string, never a log line, error message, analytics event or recorded request.
2. **Masking**: the `X-API-Key` value is replaced by a placeholder in the Request Inspector, the Action Log, copy-as-curl output, error reports and test snapshots.
3. **Secrets**: the partner secret and the Paystack key never reach the browser. No `VITE_`-prefixed variable may hold a secret; they are public by design and shipped to every visitor.
4. **Backend Address**: validate (https required, except localhost, 127.0.0.1 and [::1] with a visible warning for plain http), no credentials in the address, trailing slash removed. Changing it wipes the key and cached server data. Never read the address from the page's own link or query string.
5. **Headers/CSP**: scripts and styles same-origin only, no inline scripts, no third-party runtime scripts; connections to https hosts and localhost only. Do not loosen the policy without the owner's approval; roll out as report-only first.
6. **Dependencies**: do not add one without approval; prefer none for small flourishes.
7. **Errors**: show the problem detail and the request id; never a stack trace or a response body that might hold personal data unmasked.
8. **Abuse-safe demos**: scenario buttons that trigger rate limits stop at the first 429; they never hammer the server.

Before reporting done, search the diff for the key header name, any `VITE_` variable and any storage call, and include what you found.
