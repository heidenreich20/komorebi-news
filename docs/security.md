# Security Requirements

## Security principles

-   Deny by default.
-   Enforce authorization in Payload access functions and server-side
    operations.
-   Validate all untrusted input.
-   Keep public and authenticated content paths separate.
-   Minimize stored and logged personal information.
-   Treat deployment, database, email, and storage credentials as
    secrets.

## Role matrix

This is the proposed MVP baseline; confirm with the publication owner
before production.

  ----------------------------------------------------------------------------------
  Action                         Administrator             Editor         Journalist
  ------------------------- ------------------ ------------------ ------------------
  Read published public                    Yes                Yes                Yes
  articles                                                        

  Read CMS content                         Yes                Yes        Yes, within
                                                                     permitted scope

  Create article                           Yes                Yes                Yes

  Edit own draft                           Yes                Yes                Yes

  Edit any draft                           Yes                Yes      No by default

  Submit for review                        Yes                Yes                Yes

  Publish or schedule                      Yes                Yes                 No

  Unpublish/correct                        Yes                Yes                 No
  published story                                                 

  Manage                                   Yes    Yes, subject to      No by default
  categories/tags/authors                                  policy 

  Manage users and roles                   Yes                 No                 No

  Change site-wide                         Yes                 No                 No
  configuration                                                   

  Manage redirects                         Yes    Yes, subject to                 No
                                                           policy 
  ----------------------------------------------------------------------------------

Do not rely on UI-level hiding to enforce this matrix. Add tests for
each sensitive boundary.

## Authentication and sessions

-   Use Payload's supported authentication rather than inventing a
    custom password system.
-   Configure secure cookies and HTTPS in production.
-   Configure password reset email and test the full recovery flow.
-   Require strong passwords; evaluate MFA for administrators.
-   Deactivate accounts promptly when staff leave.
-   Do not expose authentication secrets in logs, URLs, client bundles,
    or error messages.

## Public data

-   Public endpoints return only published, currently visible content.
-   Public APIs do not expose staff email addresses, role assignments,
    reset tokens, private drafts, internal notes, or audit records.
-   Preview links must be authenticated or use short-lived, unguessable
    tokens with clear expiry and revocation behavior.
-   Do not allow public client input to select arbitrary access-control
    filters.

## Content and upload safety

-   Validate rich text and any embedded URLs.
-   Restrict media types and sizes.
-   Prevent unsafe SVG or HTML from being served as trusted content.
-   Validate external links and escape output appropriately.
-   Never render arbitrary raw HTML without a deliberate sanitization
    policy.
-   Protect against malicious filenames and content-type spoofing.
-   Apply rate limiting to login, password reset, search, and public
    mutation endpoints.

## Secrets and configuration

-   Keep production secrets in the host's secret manager.
-   Commit `.env.example` with placeholder values only.
-   Validate required environment variables at startup.
-   Use separate credentials for development, staging, and production.
-   Use least-privilege database and storage credentials where provider
    capabilities permit.
-   Rotate credentials after suspected exposure.

## Auditability and incident response

Log important actions such as role changes, publication, unpublication,
and redirect changes where feasible. Logs must avoid passwords, tokens,
and sensitive draft contents.

Document: - how to disable a compromised account; - how to rotate
credentials; - how to restore content/database backups; - how to roll
back a faulty deployment; - how to investigate unexpected publication or
data exposure.

## Minimum security tests

-   Unauthenticated users cannot access admin-only operations.
-   Journalists cannot assign roles or publish.
-   Editors cannot manage administrator accounts.
-   Public article queries exclude drafts and future scheduled articles.
-   Inactive users cannot continue making authenticated requests.
-   Upload restrictions reject unsupported files and oversized payloads.
-   Error responses do not expose stack traces or secrets.
