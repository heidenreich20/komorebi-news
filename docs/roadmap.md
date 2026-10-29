# Implementation Roadmap

## Milestone 0 --- Confirm technical baseline

Tasks: - Create repository and package manager policy. - Pin mutually
compatible Next.js and Payload versions. - Verify Payload's current
PostgreSQL adapter and deployment guidance. - Choose hosting and storage
candidates after reviewing operational limits. - Record decisions in
`docs/decisions.md`.

Acceptance: - A clean install works from documented commands. -
TypeScript, lint, and production build are configured. - No credentials
are committed. - Hosting assumptions and open questions are recorded.

## Milestone 1 --- Application foundation

Tasks: - Initialize Next.js and Payload integration. - Configure
PostgreSQL adapter and environment validation. - Configure admin route
and initial administrator bootstrap process. - Set up CI and a safe
development database. - Establish migration workflow.

Acceptance: - Admin login works in development. - App can connect to
PostgreSQL. - CI runs lint, type-check, tests, and build. - A new
developer can follow the README from a clean checkout.

## Milestone 2 --- Content model and access control

Tasks: - Implement Users, Articles, Categories, Tags, Authors, and
Media. - Configure role-based access control. - Configure
drafts/versions and decide how custom editorial statuses interact with
them. - Add seed data with fictional stories. - Add schema and
permission tests.

Acceptance: - Journalist/editor/admin boundaries are tested. - Public
access excludes unpublished articles. - Unique slugs and relationships
are enforced. - Migrations are committed and reproducible.

## Milestone 3 --- Editorial workflow

Tasks: - Implement draft creation/editing and preview. - Implement
submit-for-review and editor review. - Implement publish/unpublish and
scheduling where supported by hosting. - Implement media metadata and
upload restrictions. - Implement correction/update behavior and slug
redirects.

Acceptance: - A journalist can draft and submit an article. - An editor
can review and publish it. - Scheduled content is not public early. -
Corrections and unpublishing update public surfaces. - Revisions can be
inspected/restored according to policy.

## Milestone 4 --- Public website

Tasks: - Build homepage, category pages, article pages, search and
pagination. - Add responsive navigation and accessible components. - Add
SEO metadata, canonical URLs, sitemap and RSS. - Add related articles if
a clear rule is selected. - Implement cache invalidation/revalidation.

Acceptance: - Public pages show only published content. - Metadata and
feed outputs are correct. - Search, pagination, empty and error states
work. - Keyboard and mobile checks pass. - Publish/update/unpublish
changes appear within the documented freshness target.

## Milestone 5 --- Production hardening

Tasks: - Configure production hosting, domain and HTTPS. - Configure
persistent object storage. - Configure email/password reset. - Configure
backups and media recovery. - Configure monitoring and alerting. -
Complete security, performance, accessibility and end-to-end tests. -
Run a staging launch rehearsal and restoration exercise.

Acceptance: - Production checklist is complete. - Critical role
boundaries have automated tests. - Backup restoration has been
demonstrated. - Scheduled jobs work on the actual hosting platform. -
Rollback and incident procedures are documented.

## Working agreement

Complete one milestone at a time. Do not begin broad parallel feature
implementation until the relevant schemas and contracts are stable. At
each checkpoint, report: - completed items; - changed files; - test
commands and observed results; - unresolved issues; - decisions needed
from the project owner; - the next smallest milestone.
