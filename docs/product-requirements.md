# Product Requirements --- MVP

## Product definition

A single Spanish-language independent news publication with a
public-facing website and a secure editorial CMS.

## Personas and roles

### Public reader

-   Browses the homepage and news sections.
-   Opens articles and follows related coverage.
-   Searches for stories.
-   Shares article URLs.
-   Uses the site on desktop and mobile.

### Journalist

-   Signs in to the CMS.
-   Creates and edits their drafts.
-   Uploads images and provides alt text, captions, and credits.
-   Submits stories for editorial review.
-   Sees useful validation errors and draft status.

### Editor

-   Reviews articles.
-   Requests changes or returns articles to draft.
-   Publishes or schedules articles.
-   Corrects or unpublishes published content according to policy.
-   Manages editorial metadata.

### Administrator

-   Manages staff accounts and role assignments.
-   Configures site-wide settings and CMS access.
-   Has access to operational controls appropriate to the role.

## Public website requirements

-   Homepage with featured stories, latest stories, and category
    sections.
-   Article detail page with headline, excerpt, body, author,
    publication/update date, category, tags where relevant, and media
    credits.
-   Category pages with pagination.
-   Search page with query validation, useful empty state, and
    pagination.
-   Related articles where a reliable relevance rule is defined.
-   Responsive navigation and layout.
-   Spanish metadata, sensible URL slugs, canonical URLs, Open
    Graph/Twitter metadata, sitemap, and RSS feed.
-   Accessible semantic HTML, keyboard navigation, visible focus, and
    useful alt text.
-   Loading, empty, error, and not-found states.
-   Public pages must never display drafts, scheduled-but-unpublished
    articles, rejected content, or private staff data.

## Editorial CMS requirements

-   Staff authentication and role-based authorization.
-   Article create/read/update workflow.
-   Draft saving and preview.
-   Submission for review.
-   Editor approval and publication.
-   Scheduled publishing if the deployment supports reliable job
    execution.
-   Version history and restoration capability using supported Payload
    features.
-   Media library with alt text, caption, attribution/credit, and
    descriptive filename where practical.
-   Category and tag management.
-   Author profile management.
-   SEO title and description fields.
-   Auditability for significant editorial actions where feasible.
-   Password reset and account recovery via a configured email provider.

## Article lifecycle

Target workflow:

-   `draft`: editable; not public.
-   `in_review`: awaiting editor decision; not public.
-   `scheduled`: approved for future publication; not public until
    published.
-   `published`: public.
-   `rejected`: returned/declined; not public.
-   `archived`: no longer promoted as current news; public visibility
    policy must be explicitly defined.

Implementation note: Payload's built-in draft/version status may not map
one-to-one to every workflow state. Implement custom status fields and
transition rules only where needed, and test how they interact with
Payload drafts and scheduled publishing. Do not assume a status field
alone safely controls publication.

## Non-functional requirements

-   Security: server-side access control, validation, secure sessions,
    secret management.
-   Reliability: managed database, backup/restore runbook, controlled
    errors.
-   Performance: responsive images, sensible pagination, minimal client
    JavaScript, cache invalidation.
-   SEO: crawlable article content, metadata, canonical URLs, sitemap
    and RSS.
-   Accessibility: target WCAG 2.2 AA where feasible; include keyboard
    and screen-reader checks.
-   Maintainability: TypeScript, documented collections, automated
    checks, dependency updates.
-   Cost: start with low-cost managed services, but select production
    plans based on required reliability rather than price alone.

## Out of scope unless approved

-   Multiple publications or tenant switching.
-   Multiple content languages or translation management.
-   Reader accounts, comments, forums, and user-generated submissions.
-   Paywall or subscriptions.
-   Native mobile applications.
-   Complex recommendation/personalization systems.
-   Separate microservices.
-   Ad-serving platform.
-   Dedicated search infrastructure before PostgreSQL search is
    evaluated.

## Acceptance criteria for MVP

1.  A public reader can navigate homepage, categories, search, and
    article pages on desktop and mobile.
2.  An unauthenticated visitor cannot access the CMS or preview
    unpublished articles.
3.  A journalist can create a draft and submit it for review but cannot
    grant roles or publish unless explicitly permitted.
4.  An editor can review and publish an article.
5.  Public pages show only content that is actually publishable and
    published.
6.  A scheduled article does not appear before its publication time.
7.  Article updates invalidate relevant cached pages and feeds within
    the documented target.
8.  Media persists across deployments and is served from configured
    object storage.
9.  Slugs are unique and invalid slug changes do not silently break
    existing published links.
10. Automated tests cover role boundaries and public-content filtering.
11. A database backup can be restored following the documented runbook.
12. The deployment has documented environment variables, migration
    steps, and rollback guidance.
