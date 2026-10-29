# Payload Content Model

## Conventions

-   One publication, Spanish-only for MVP.
-   Use clear, consistent field names in English in code; editorial
    content itself is Spanish.
-   Prefer Payload's supported field types and adapters over custom
    infrastructure.
-   Use stable IDs for relationships.
-   Enforce constraints and permissions server-side.
-   Pin compatible Payload/Next.js versions before implementation and
    follow documentation for that exact version.

## Collection: Users

Use Payload's authentication-enabled collection.

Suggested fields: - `name` --- required display name. - `role` ---
required enum: `admin`, `editor`, `journalist`. - `active` --- boolean,
default true; inactive users must not be able to perform CMS actions. -
`authorProfile` --- optional relationship to Authors, if staff
authorship needs to be linked to a login. - `lastLoginAt` --- optional
if maintained reliably and needed.

Security notes: - Do not return password hashes, reset tokens, or
private account fields through public APIs. - Role changes are
administrator-only. - A user must not elevate their own role. - Decide
whether journalists may edit only their own articles or all drafts;
default to own drafts unless the newsroom explicitly wants shared
editing.

## Collection: Articles

Suggested fields: - `title` --- required, bounded length. - `slug` ---
required, unique, URL-safe. - `excerpt` --- required short summary for
cards and metadata. - `content` --- required rich-text or block-based
body using the chosen Payload editor. - `featuredImage` --- optional
relationship to Media; decide whether required before publication. -
`author` --- required relationship to Authors. - `categories` ---
relationship to Categories; one or more according to product policy. -
`tags` --- optional relationship to Tags, has-many. - `editorialStatus`
--- enum: `draft`, `in_review`, `scheduled`, `published`, `rejected`,
`archived`; coordinate carefully with Payload's own draft/version
mechanics. - `publishedAt` --- date/time; required when published. -
`updatedAtEditorial` --- optional public correction/update timestamp if
distinct from system update time. - `seoTitle` --- optional; fall back
to title. - `seoDescription` --- optional; fall back to excerpt. -
`canonicalUrl` --- optional and restricted to trusted/validated URLs if
editors can set it. - `isFeatured` --- boolean, default false. -
`createdBy` / `lastEditedBy` --- relationships or audit data where
supported and useful. - `correctionNote` --- optional; define whether
this is public and when it is shown.

Publication rules: - Public queries must explicitly filter for published
content and publication time \<= now. - Draft previews require
authentication and a secure preview flow. - Never rely only on hiding an
article in the frontend. - If an article is unpublished, its former URL
should not accidentally expose draft content. - A published slug change
should create a redirect from the previous slug. - Set `publishedAt`
consistently; do not overwrite the original publication date on every
edit. Use a separate update/correction timestamp if needed.

## Collection: Categories

Suggested fields: - `name` --- required. - `slug` --- required,
unique. - `description` --- optional. - `displayOrder` --- integer. -
`isActive` --- boolean.

Examples can include Política, Economía, Sociedad, Cultura, Deportes,
Tecnología, but the publication owner must approve the actual taxonomy.

## Collection: Tags

Suggested fields: - `name` --- required, unique or normalized to avoid
duplicates. - `slug` --- required, unique. - `description` --- optional.

## Collection: Authors

Suggested fields: - `displayName` --- required. - `slug` --- required,
unique. - `biography` --- optional. - `portrait` --- optional
relationship to Media. - `socialLinks` --- optional structured links
with URL validation. - `isActive` --- boolean.

Do not assume every author must have a CMS login. An author profile may
represent a contributor without account access.

## Collection: Media

Use Payload upload functionality with production storage configured for
persistent object storage.

Suggested metadata: - `alt` --- required for meaningful editorial
images; allow empty alt only for explicitly decorative media. -
`caption` --- optional. - `credit` --- optional but strongly encouraged
where required by license/editorial policy. - `sourceUrl` --- optional;
validate protocol and output encoding. - `focalPoint` --- optional if
supported by the chosen image workflow. - generated dimensions and file
metadata where available.

Controls: - Allow only necessary image types for MVP (for example JPEG,
PNG, WebP, and AVIF after compatibility testing). - Set a maximum file
size. - Validate actual content, not just the extension or
client-supplied MIME type. - Restrict SVG uploads unless a safe
sanitization and delivery policy is implemented. - Do not store uploaded
binaries on ephemeral production disk.

## Optional collection: Redirects

Recommended if editorial slug changes are allowed: - `fromPath` ---
required, unique. - `toPath` --- required. - `statusCode` --- restrict
to 301 or 308 for permanent redirects unless a different policy is
justified. - prevent loops and redirect chains where possible. - Only
administrators/editors may manage redirects.

## Relationships and indexes

-   Index unique slugs for Articles, Categories, Authors, and Tags.
-   Index article publication status and publication date for common
    listing queries.
-   Index relationships used by category/tag pages and related content.
-   Avoid excessive indexes without measurement.
-   Use Payload's migrations and review generated schema changes.

## Drafts and versions

Configure Payload's supported drafts/versions feature for Articles and
verify behavior for the selected Payload version. Version history and
publication state are not the same thing as a custom editorial workflow.
Test draft creation, version restoration, publishing, scheduled
publishing, and public queries end-to-end.

## Implementation deliverables

-   Payload collection definitions with types.
-   Access-control functions and reusable role helpers.
-   Database migration files committed to version control.
-   Seed script with clearly fake sample content.
-   Tests for validation, access control, draft visibility, scheduled
    visibility, slug uniqueness, and publication timestamps.
