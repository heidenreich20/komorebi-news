# Testing, Deployment, and Operations

## Quality gates

Run the applicable checks before merging: - formatting/lint; -
TypeScript type-check; - unit tests; - collection/access-control
tests; - integration tests against a disposable test database; -
production build; - end-to-end smoke tests for critical editorial flows.

Use the package scripts actually defined in the repository. Do not claim
success for commands that were not run.

## Required test coverage

### Content and permissions

-   Article draft create/edit.
-   Journalist submits for review.
-   Journalist cannot publish or assign roles.
-   Editor can publish.
-   Unauthenticated public access excludes drafts.
-   Scheduled article remains hidden until its scheduled time.
-   Unpublished article no longer appears in listings, sitemap, RSS, or
    related-story results.
-   Slug uniqueness and redirect behavior.
-   Media metadata and upload validation.

### Public website

-   Homepage loads with published content.
-   Article and category pages render correct metadata.
-   Pagination and search work.
-   Empty, invalid, not-found, and error states are useful.
-   Keyboard navigation and responsive layout.
-   Sitemap, canonical URL, and RSS entries exclude unpublished content.

### Operational

-   Production build succeeds with production-like environment
    configuration.
-   Database migrations run in the intended release process.
-   Media remains available after a new deployment.
-   Backup restoration is demonstrated in a non-production environment.
-   Cache invalidation works after publication, correction, and
    unpublishing.

## Environments

Use separate development and production environments. Add staging if the
budget permits.

Each environment should have its own: - database or isolated
database/schema; - credentials and secret set; - object-storage bucket
or prefix with appropriate access rules; - base URL and allowed
origins; - email configuration.

Never use production data in local fixtures or commit it to the
repository.

## Environment variables

Maintain `.env.example` with safe placeholders and documentation for
required variables. Exact variable names must follow the selected
Payload/Next.js adapter versions and storage plugin.

Expected categories: - Payload secret. - PostgreSQL connection string. -
public site base URL. - object storage endpoint, region, bucket, access
key and secret key. - email provider credentials. - optional analytics
configuration.

Do not guess variable names; use the exact installed package
documentation and validate configuration at startup.

## Deployment workflow

1.  Run automated checks in CI.
2.  Build the application.
3.  Review database migrations.
4.  Apply migrations using the documented deployment procedure.
5.  Deploy the application.
6.  Run smoke tests for public pages and CMS access.
7.  Verify scheduled-job processing and cache invalidation.
8.  Monitor logs and errors after release.
9.  Keep a rollback procedure that accounts for schema compatibility.

Avoid destructive schema changes in a single step. Use
expand/migrate/contract when a change could break the currently deployed
application.

## Hosting evaluation checklist

Before selecting the provider, verify: - supported Node.js version and
runtime behavior; - compatibility with the selected Next.js and Payload
versions; - ability to run Payload server-side operations; - request
duration and payload/upload limits; - persistent object storage
integration; - reliable scheduled-job execution; - database connection
pooling and connection limits; - deployment region and latency; -
environment secret management; - logs, monitoring, and rollback
options; - total cost under realistic traffic.

Do not assume a serverless function can reliably run a long-lived
in-process scheduler. Prefer a supported external cron/job trigger or a
host with suitable persistent execution.

## Backups and recovery

-   Enable provider-managed database backups appropriate to the chosen
    plan.
-   Define a recovery point objective (maximum acceptable data loss) and
    recovery time objective (maximum acceptable downtime) with the
    publication owner.
-   Export or back up media independently of the database.
-   Remember that database backups usually contain media metadata, not
    the actual objects.
-   Test a full restore, including database records and media
    references.
-   Document who can restore and how credentials are accessed.
-   Periodically verify that backup jobs are succeeding.

## Monitoring

Track at minimum: - application errors and failed requests; - database
connection/resource pressure; - failed uploads; - scheduled publication
failures; - email delivery failures; - broken article URLs and
redirects; - backup success and restore-test date.

## Launch checklist

-   [ ] Domain and HTTPS configured.
-   [ ] Production secrets configured outside source control.
-   [ ] Admin accounts created securely; no shared accounts.
-   [ ] Roles and access tests pass.
-   [ ] Password reset works.
-   [ ] Public pages exclude all unpublished content.
-   [ ] Sitemap, RSS, canonical URLs and metadata verified.
-   [ ] Media stored persistently and image attribution supported.
-   [ ] Cache invalidation tested for publish/update/unpublish.
-   [ ] Scheduled publishing tested on the production host.
-   [ ] Database and media backups configured and restoration tested.
-   [ ] Privacy/legal/editorial policies approved by the publication
    owner.
-   [ ] Monitoring and rollback procedures documented.
