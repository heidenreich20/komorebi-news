# Architecture

## Goals

-   Deliver a fast, accessible public news website.
-   Give newsroom staff a secure editorial interface.
-   Keep hosting and maintenance costs low without making production
    reliability depend on a free-tier guarantee.
-   Make the system understandable to a small team and coding agents.
-   Keep the option to add integrations later without introducing
    microservices prematurely.

## Logical architecture

``` text
Readers
  |
  v
Next.js public site and Payload admin
  |
  +-- Payload collections, access control, hooks, Local API
  |
  +--> Managed PostgreSQL
  |
  +--> S3-compatible object storage for media
  |
  +--> Email provider (password reset / optional notifications)
```

Payload is integrated with the Next.js application. It is the CMS and
backend for editorial data. Do not add Express merely to have a
separately named backend.

## Responsibilities

### Next.js

-   Render public homepage, category pages, article pages, search
    results, RSS, sitemap, and not-found pages.
-   Use server-side data access where appropriate.
-   Provide responsive UI and accessible navigation.
-   Render draft previews only through authenticated, protected preview
    flows.
-   Keep private admin functionality under Payload's protected admin
    interface.

### Payload CMS

-   Define collections and relationships.
-   Authenticate staff users and enforce access control.
-   Provide content APIs.
-   Manage drafts, versions, media metadata, and publishing workflow.
-   Validate and normalize content.
-   Expose only safe fields to public consumers.

### PostgreSQL

-   Store editorial records, users, relationships, revision/version
    data, and relevant metadata.
-   Use managed backups and a tested restore process.
-   Apply schema changes through version-controlled migrations.

### Object storage

-   Store uploaded images and other approved media.
-   Production media must not depend on an application server's local
    disk.
-   Store media metadata such as alt text, caption, credit, dimensions,
    and focal point where supported.
-   Apply upload limits and permitted file types.
-   Decide and document whether public assets are served directly or
    through an image/CDN layer.

## Data flow

1.  A journalist signs into Payload.
2.  The journalist creates or edits an article draft.
3.  An editor reviews and publishes or schedules it according to
    permissions.
4.  Public pages query only published content.
5.  When content changes, the application invalidates or refreshes
    relevant caches.
6.  A published article's URL remains stable; intentional slug changes
    must create a redirect.

## Rendering and caching

-   Prefer server rendering or static generation with revalidation for
    public article content, based on the chosen hosting capabilities.
-   Never cache authenticated admin pages or draft previews publicly.
-   Revalidate article, category, homepage, sitemap, and RSS output when
    relevant content changes.
-   Avoid stale published content after corrections; document the cache
    invalidation mechanism and test it.
-   Do not introduce a separate cache service in the MVP without
    evidence it is necessary.

## API boundaries

-   Use Payload's supported Local API for trusted server-side access
    within the app.
-   Use the REST API for external consumers or client use cases that
    require HTTP.
-   Avoid unnecessary client-side calls for public pages that can be
    rendered server-side.
-   Keep public data shapes intentional; do not expose raw user records
    or unrestricted CMS responses.
-   If an external integration later requires a dedicated Express
    service, document its unique responsibility and authentication
    boundary before adding it.

## Reliability and failure behavior

-   Database or storage failures must produce a controlled error state,
    not leak secrets or stack traces.
-   Add health/readiness checks where supported by the hosting platform.
-   Backups must be restorable; a backup feature without a restore test
    is insufficient.
-   Scheduled publishing must use a reliably executed job mechanism
    supported by the deployment target. Do not assume an in-process
    timer runs reliably on serverless or scale-to-zero hosting.
