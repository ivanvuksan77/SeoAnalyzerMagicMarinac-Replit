# myPOS Integration Flow (Expected vs Current App Behavior)

This document explains:

1. The expected checkout/payment flow from myPOS documentation.
2. How this application currently implements that flow.
3. What happens specifically when a user chooses a plan.
4. Notable implementation gaps/risks to review.

Reference: [myPOS Developers Portal - Test Data](https://developers.mypos.com/online-payments/initial-setup-and-testing/testing-in-sandbox/test-data)

---

## 1) Expected myPOS flow (from documentation)

In sandbox, myPOS expects a hosted-checkout redirect flow:

1. Merchant backend prepares checkout parameters:
   - `IPCmethod=IPCPurchase`
   - `IPCVersion`
   - `SID`
   - `walletnumber`
   - `Amount`, `Currency`
   - Unique `OrderID`
   - `URL_OK`, `URL_Cancel`, `URL_Notify`
   - `KeyIndex`
2. Merchant signs the payload with the private key and sends user to myPOS checkout URL (sandbox: `https://www.mypos.com/vmp/checkout-test`).
3. User completes payment on myPOS hosted page.
4. myPOS sends server-to-server notification to `URL_Notify`.
5. Merchant verifies notification signature with myPOS public certificate/key.
6. If valid and successful status, merchant marks order paid and fulfills access/product.
7. User is redirected to `URL_OK` or `URL_Cancel`.

Important documented constraints:

- `OrderID` must be unique per transaction.
- `URL_Notify` should be HTTPS; myPOS expects HTTP 200 with body `OK` from notify endpoint.
- Sandbox does not enforce 3DS, while production does.

---

## 2) Current implementation in this app

Core files:

- `server/services/mypos.ts`
- `server/routes.ts`
- `client/src/pages/master-analyzer.tsx`
- `server/services/analysisStore.ts`
- `server/services/accessCodeStore.ts`

### Backend myPOS configuration and signing

`server/services/mypos.ts`:

- Reads env values:
  - `MYPOS_SID`
  - `MYPOS_WALLET_NUMBER`
  - `MYPOS_PRIVATE_KEY`
  - `MYPOS_PUBLIC_KEY`
  - `MYPOS_KEY_INDEX` (default `1`)
  - `MYPOS_PRODUCTION` toggles sandbox/production URL
- Builds checkout fields with:
  - `IPCPurchase`, version `1.4`, currency `EUR`
  - Tier pricing:
    - basic: `29.00`
    - pro: `249.00`
  - `OrderID` format: `<sessionId>_<tier>_<timestampBase36>`
- Signs payload with `RSA-SHA256`.
- Returns `{ url, fields }` for frontend form POST submission.

### Notification verification and parsing

`verifyMyPOSNotification()`:

- Expects `Signature` in POST body.
- Rebuilds signed string from response fields:
  - `IPCmethod`, `IPCVersion`, `SID`, `walletnumber`, `Amount`, `Currency`, `OrderID`, `IPC_Trnref`, `Status`
- Verifies signature using configured public key/certificate.
- Parses `OrderID` back into `sessionId` and `tier`.

---

## 3) What happens when user chooses a plan (actual runtime flow)

This is the concrete app flow for Basic/Pro selection:

1. User runs analysis (`/api/master-analyze`) and receives `sessionId`.
2. In `master-analyzer.tsx`, user opens pricing modal and clicks Basic or Pro.
3. App opens email modal (`showUpgradeEmailModal`) and collects email.
4. `executeUpgrade(tier, email)` calls:
   - `POST /api/create-checkout` with `{ sessionId, tier, email }`
5. Backend `POST /api/create-checkout`:
   - Validates session exists via `getAnalysis(sessionId)`.
   - Stores email in session (`storeEmail`).
   - If myPOS is not configured and app is non-production: creates dev access code immediately and returns `devMode: true`.
   - Otherwise generates signed myPOS checkout form (`createMyPOSCheckoutForm`) and returns `{ url, fields }`.
6. Frontend receives `{ url, fields }`, creates hidden HTML form, POSTs user to myPOS checkout.
7. After payment, myPOS redirects browser to:
   - Success: `/?payment=success&session=<sessionId>&tier=<tier>`
   - Cancel: `/?payment=cancelled&session=<sessionId>`
8. On success redirect, frontend `useEffect` detects query params and calls `fetchAccessCodeWithRetry(session, tier)`:
   - Tries `POST /api/get-access-code`
   - Retries only poll `get-access-code` until verified notify has created the code
9. In parallel/asynchronously, myPOS calls `POST /api/mypos-notify`:
   - Backend verifies signature.
   - If `status === '0'`, marks session paid, creates access code (unless payment already processed), saves payment record, tags Mailchimp subscriber.
   - Responds `200 OK` with body `OK`.
10. Frontend receives access code, stores it in session state/local storage, and unlocks paid tier behavior in UI.

---

## 4) Data/state model behind the flow

- `analysisStore` (`server/services/analysisStore.ts`):
  - In-memory map by `sessionId`.
  - Stores analysis result + email + `paidTier` + pending checkout `OrderID`.
  - Expires after 24 hours (cleanup interval).
- `accessCodeStore` (`server/services/accessCodeStore.ts`):
  - Generates codes like `BAS-XXXXXX` / `PRO-XXXXXX`.
  - Basic gets 5 scans, Pro gets 10.
  - Persists to Firestore if configured.
- Payment records are also stored in Firestore (`payments` collection).

---

## 5) Current risk notes (after hardening patch)

1. **`URL_Notify` HTTPS requirement depends on deployment**
   - Code tries to force HTTPS in production, but final URL correctness depends on `PUBLIC_BASE_URL` / proxy headers.
   - If misconfigured, notify URL could be wrong and notifications may fail.

2. **Signature verification string length handling differs from signing logic**
   - Signing uses byte length (`Buffer.byteLength`), verify path uses string length (`v.length`).
   - For pure ASCII payloads this often matches; for non-ASCII values, it can diverge.

---

## 6) Practical checklist for your sandbox testing

1. Confirm env vars are set (SID/wallet/private key/public cert/key index).
2. Ensure app public base URL is HTTPS and reachable from internet.
3. Start checkout and verify returned form posts to sandbox URL.
4. Complete payment and confirm:
   - Redirect to `/?payment=success...`
   - Server receives `/api/mypos-notify`
   - Notify verifies and returns `OK`
   - Access code is generated once and stored
5. Redeem generated code and confirm scans decrement per paid analysis.

---

## 7) Hardening status

Implemented in this patch:

1. `POST /api/verify-payment` no longer unlocks payment (returns 410 disabled).
2. `POST /api/get-access-code` now returns codes only if created from verified `mypos-notify` (`paymentId = OrderID`).
3. Checkout flow now stores pending `OrderID` per `sessionId`, and redirect polling is tied to that order.
4. Frontend no longer calls manual verification during polling.

Still recommended:

1. Use byte length consistently in both signing and verification string builders.
2. Add logs/alerts for failed notify verification and missing notify callbacks.

