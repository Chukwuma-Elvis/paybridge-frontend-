---
name: api-client-contract
description: Apply the API client and contract rules. Use whenever adding or changing a call to the PayBridge API, an API type, polling, the log stream, the Wake service, the Action Log or the Request Inspector.
---

# API client and contract

Policy owner: project owner. Source: plan invariants 11, 14; Steps 33 to 35; spec FR-1 to FR-6.

1. **One door.** Every request goes through the single API client (and the log stream through the single stream reader). Direct use of the browser's network functions elsewhere is a defect; a lint rule enforces it.
2. **Types from the contract.** Request and response types are generated from `contract/openapi.json` (a snapshot of the API's `/v3/api-docs`). Never hand-write or edit them. If a field is missing, fix the contract (back-end repository) or flag it; do not cast around it.
3. **Request id.** The client creates an id per request (letters, digits, `.`, `_`, `-`, up to 64 characters), sends it as `X-Request-Id`, and reads it back from the response. The Action Log "sent" line carries that id before the call.
4. **Action Log.** Emit a "sent" event (method, full endpoint with query, label, request id) before the call and a "finished" event (status or error kind, duration) after. Polling events are marked so they can be collapsed. No event contains the key or, by default, a body.
5. **Errors.** Map the API's problem-style body to one error type. Distinct designed states for 401, 403, 404, 409, 429 (use `Retry-After`), 5xx and network failure.
6. **Retries.** Reads retry with backoff. A write that may have moved money is retried only by reusing the same `Idempotency-Key`. Never retry automatically on 4xx other than 429.
7. **Idempotency keys** are created once per user action, kept for replays, and shown in the inspector.
8. **Polling** has a stop condition (a final state), a cadence of 2 to 3 seconds, and pauses in hidden tabs.
9. **Wake service**: probe the open health endpoint with backoff; treat network errors, timeouts and 502/503/504 as "waking", not failure; stop on UP, cancel or the limit.
10. **Log stream**: use the fetch-based reader (the key is sent in a header, never in the address); resume from the last sequence number; mark gaps; bounded memory in the list.

Before reporting done, paste the Action Log output for one real call made by the new code.
