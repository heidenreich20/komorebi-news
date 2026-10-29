# Instructions for Coding Agents

## 1. Mission

Build a maintainable, secure, Spanish-language news publication with a
public website and an editorial CMS. Follow the specifications in
`docs/`. Prefer a small, coherent MVP over speculative infrastructure.

## 2. Required reading

Before making a change, read: - `docs/decisions.md` - the relevant
sections of `docs/architecture.md` - the relevant requirements and
acceptance criteria - `docs/content-model.md` for content or CMS
changes - `docs/security.md` for authentication, authorization, uploads,
or public content access - `docs/testing-and-deployment.md` for tests or
deployment changes

Inspect the existing codebase before proposing or implementing changes.
Do not overwrite existing work without understanding it.

## 3. Architecture constraints

-   Use TypeScript for application code.
-   Use Next.js and Payload CMS in the same application unless an
    approved architecture decision changes this.
-   Use PostgreSQL through Payload's supported PostgreSQL adapter.
-   Do not add a separate Express service for functionality Payload
    already provides.
-   Keep provider-specific infrastructure behind narrow interfaces where
    reasonable.
-   Never store user uploads on ephemeral application filesystem storage
    in production.
-   Use migrations for schema changes; never rely on manually changing
    the production database.
-   Do not introduce another ORM or database access layer without an
    explicit decision.
-   Do not create a multi-publication/multi-tenant model for the MVP.
-   Do not add multilingual content infrastructure for the Spanish-only
    MVP.

## 4. API and data contracts

-   Treat collection schemas and documented API contracts as shared
    interfaces.
-   Do not independently rename fields, change enum values, or alter
    response shapes without updating docs and tests.
-   Public endpoints must never expose drafts, unpublished content,
    private user fields, or internal audit data.
-   Validate untrusted input at the boundary and enforce permissions on
    the server.
-   Prefer stable IDs for relationships; slugs are public identifiers
    and may require redirects if changed.

## 5. Code quality

-   Keep modules focused and avoid giant files.
-   Prefer explicit types and clear names over clever abstractions.
-   Avoid `any`; if unavoidable, document why and keep the scope narrow.
-   Do not duplicate business logic across frontend components and CMS
    hooks.
-   Handle loading, empty, error, and permission-denied states.
-   Avoid premature microservices, queues, caches, or abstractions
    without a demonstrated need.
-   Do not log passwords, session tokens, authorization headers,
    secrets, or private article drafts.

## 6. Security requirements

-   Enforce role-based access in Payload access-control functions, not
    only in UI visibility.
-   Deny access by default when a permission rule is unclear.
-   Public users can read only published content.
-   Journalists cannot grant roles, manage users, or publish unless an
    explicit policy allows it.
-   Never commit `.env` files, credentials, tokens, production data, or
    private keys.
-   Use environment variables for secrets and document required names in
    `.env.example` with safe placeholders.
-   Protect upload paths, file types, file sizes, and image processing.
-   Do not disable security checks to make a test pass.

## 7. Required workflow for each task

1.  State the task's scope and identify relevant docs.
2.  Inspect related implementation and tests.
3.  Implement the smallest complete change.
4.  Add or update tests.
5.  Run relevant lint, type-check, unit, and integration tests available
    in the repository.
6.  Update documentation if behavior, fields, permissions, APIs, or
    operations changed.
7.  Report files changed, commands run, results, known gaps, and
    follow-up work.

Do not claim a command or test passed unless it was actually run and its
result observed.

## 8. Definition of done

A task is complete only when: - acceptance criteria are met; -
applicable tests pass, or failures are clearly reported; - authorization
and error cases are considered; - no secrets or generated production
data were added; - docs and examples match implementation; - the change
does not silently expand the agreed scope.

## 9. Agent coordination

-   Do not let frontend and backend agents invent separate versions of
    the same contract.
-   Make schema/API changes explicit before parallel implementation.
-   Avoid simultaneous edits to the same file unless coordinated.
-   A reviewer agent should check security, regression risk, test
    coverage, and spec compliance---not merely style.
