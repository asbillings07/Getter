# Getter Studio account integration

The approved Getter Studio designs establish the product direction for
[#21](https://github.com/asbillings07/Getter/issues/21). This first slice of
[#22](https://github.com/asbillings07/Getter/issues/22) implements the signed-out
entry and the Account & plan view. It uses the existing shared popup and side
panel.

## Approved product behavior

| Area         | Behavior                                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Getter Free  | Colors, Fonts, Images, Text, and Quick Inspect are available without an account.                                                                                                                                                                        |
| Studio       | One additive $4.99/month tier. Paid features include Inspect Pro and component capture, Design Review, and projects, collections, editing, and design-tool exports.                                                                                     |
| Account      | Use the shared Aptelum account with hosted Google and passkey sign-in, enrollment, and recovery. The account entry stays available on both plans.                                                                                                       |
| Subscription | Preserve the originating Getter task through sign-in. Verify existing Studio access before offering checkout. Use hosted billing for payment methods, cancellation, and invoices. Retain access to past invoices after the plan ends.                   |
| Saved work   | Keep local work viewable on Free under its owner. Allow local backup and restore on Free, and editing after Studio is verified again. Synced work remains recoverable for 90 days after paid access ends. Show the recovery deadline and backup action. |
| Sync         | Keep restored work on the device by default. Offer explicit selection and confirmation before syncing projects and their linked collections or standalone collections.                                                                                  |

The production offer currency, tax presentation, launch markets, storage limits,
offline paid access, and sync-conflict rules still need decisions before the
affected features are built. Mock approval records the owner's design decision.
Representative task and willingness-to-pay results belong in the milestone's
customer-value evidence.

## Aptelum Core adoption

Use the reviewed Aptelum Core integration guide at
`f8278e3fa933989ce84ee1b500500ca875ca58e2` as the contract reference for this
slice. Aptelum Core's joined Account portal and packaged Crumb qualification
precedes Getter's packaged qualification. Getter can prepare locally during that
work.

- Register a dedicated public Chrome client and its exact callback for the
  packaged Getter extension. Use Authorization Code with PKCE in the hosted
  flow. Qualify cancellation, reload, worker suspension, repeat sign-in, and
  recovery through the supported Google and passkey paths.
- Have the trusted service resolve a verified issuer and subject to the stable
  Aptelum account. Keep account and environment boundaries in the service.
  A browser redirect, matched email, or client storage value cannot establish
  account or Studio access.
- Load Getter-specific access from the trusted service before opening Studio.
  Keep only the minimal pending action and originating context for resumption,
  bound to the correct browser session. Treat expired or unavailable access
  explicitly, and clear authenticated state on sign-out and account switches.
- Manage Aptelum Account will use the approved account portal and a scoped return.
  Billing belongs to [#27](https://github.com/asbillings07/Getter/issues/27).
  Keep Stripe Customer bindings product-specific within the same Aptelum account.
  Qualify account portability, two-product isolation, and cancellation separately.

The next integration dependency is a Getter-specific test client registration and
an approved shared-service test handoff for account and entitlement verification.
The normal package build excludes the account QA interface.

## Chrome QA package

Run `node scripts/build.mjs --studio-account-qa` to produce
`dist-studio-qa`. The unpacked extension is labeled **Getter Studio Account QA**
in Chrome. Load it in a separate Chrome profile to exercise the entry without
interfering with the installed Getter.

1. On a normal site, open Getter from the toolbar. Check the compact brand and
   the single row with Account, Side panel, Subscribe to Studio, and Settings.
2. Open Account or Subscribe to Studio. Check the signed-out Aptelum account,
   the Getter Free current access, and the Studio offer. Sign-in actions show
   the QA availability message.
3. Use Back to return to the free tool. Try the Settings shortcut to
   Account & plan and confirm that Back returns to Settings.
4. Switch to the side panel. Check the same entry points, including in a narrow
   panel. Scan a page and use Quick Inspect.

This QA package covers the signed-out entry, layout, and navigation. Shared
sign-in, subscription verification, billing, and the paid tools require their own
packaged qualification.
