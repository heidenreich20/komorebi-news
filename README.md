# News Network --- Agent Documentation Pack

This repository contains the initial product and engineering
specifications for a single-publication, Spanish-language news website.

## Approved baseline

-   Frontend and CMS: Next.js + Payload CMS + TypeScript
-   Database: managed PostgreSQL; Neon is the initial candidate, subject
    to production-fit validation
-   Media: S3-compatible object storage; Cloudflare R2 is the initial
    candidate
-   Hosting: managed Node-compatible hosting; no self-hosting on a
    personal machine
-   Publication: one publication, Spanish-only for the initial release
-   Editorial roles: Administrator, Editor, Journalist
-   Separate Express service: not part of the MVP unless a specific
    requirement justifies it

## Read in this order

1.  `AGENTS.md` --- rules for all coding agents
2.  `docs/decisions.md` --- approved decisions and open questions
3.  `docs/architecture.md` --- system boundaries and deployment shape
4.  `docs/product-requirements.md` --- MVP scope and user journeys
5.  `docs/content-model.md` --- Payload collections and editorial
    workflow
6.  `docs/security.md` --- access-control and security requirements
7.  `docs/testing-and-deployment.md` --- quality gates, deployment,
    backups
8.  `docs/roadmap.md` --- implementation milestones and acceptance
    criteria

## Important status note

This is an implementation baseline, not proof that a particular
provider's current free tier or deployment configuration meets
production needs. Validate current pricing, runtime constraints,
persistent media storage, database connection limits, backup/restore
options, and scheduled-job behavior before production launch.

Open questions are recorded rather than silently assumed. Agents must
not treat an open question as an approved requirement.
