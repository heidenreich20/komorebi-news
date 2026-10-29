# Architecture Decisions and Open Questions

## Approved baseline

  ----------------------------------------------------------------------------
  ID                Decision          Status            Notes
  ----------------- ----------------- ----------------- ----------------------
  D-001             One publication   Approved          No multi-tenant or
                                                        multi-publication
                                                        model in MVP

  D-002             Spanish-only      Approved          No localization
                    content                             framework or
                                                        translation workflow
                                                        required for launch

  D-003             Next.js + Payload Approved          Pin compatible
                    CMS + TypeScript  direction         versions before
                                                        implementation

  D-004             PostgreSQL        Approved          Managed service; Neon
                                                        is initial candidate

  D-005             Managed object    Approved          Cloudflare R2 is
                    storage           direction         initial candidate

  D-006             No separate       Approved          Reconsider only for a
                    Express API       direction         concrete integration
                    initially                           or service boundary

  D-007             Managed hosting   Approved          No production hosting
                                                        on a personal computer

  D-008             Editorial roles   Approved          Administrator, Editor,
                                      direction         Journalist

  D-009             Editorial review  Approved          Draft → review →
                    workflow          direction         scheduled/published;
                                                        exact transition rules
                                                        to be tested

  D-010             Stable public     Approved          Slug changes after
                    article URLs                        publication require
                                                        redirect handling
  ----------------------------------------------------------------------------

## Open questions --- do not silently decide

1.  **Hosting provider:** verify Payload's runtime needs, Next.js
    support, persistent storage, cron/job support, and current prices.
2.  **Database provider and tier:** validate connection pooling,
    backups, point-in-time recovery, region, limits, and restore
    procedure.
3.  **Media provider:** confirm S3 compatibility, upload strategy, image
    delivery, caching, and egress pricing.
4.  **Article editor:** decide whether Payload's standard rich-text
    editor is sufficient or a custom block-based layout is needed.
5.  **Comments:** out of MVP unless explicitly requested.
6.  **Newsletter:** out of MVP unless explicitly requested.
7.  **Analytics and consent:** select privacy-respecting analytics and
    determine applicable consent/legal requirements before launch.
8.  **Search:** MVP may use PostgreSQL search; revisit a dedicated
    search service only if needed.
9.  **Email delivery:** select a provider for password reset and
    editorial notifications.
10. **Legal/editorial policy:** confirm privacy notice, cookie policy,
    corrections policy, copyright/image attribution, and terms with the
    publication owner.

## Decision process

Any change to an approved decision must include: - the reason; -
alternatives considered; - migration impact; - cost and operational
impact; - security impact; - docs and tests that must change.

Record significant changes as a new numbered decision rather than
silently rewriting history.
