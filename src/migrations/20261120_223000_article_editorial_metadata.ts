import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles"
      ADD COLUMN "seo_title" varchar,
      ADD COLUMN "seo_description" varchar,
      ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL,
      ADD COLUMN "updated_at_editorial" timestamp(3) with time zone,
      ADD COLUMN "correction_note" varchar;

    ALTER TABLE "_articles_v"
      ADD COLUMN "version_seo_title" varchar,
      ADD COLUMN "version_seo_description" varchar,
      ADD COLUMN "version_is_featured" boolean DEFAULT false NOT NULL,
      ADD COLUMN "version_updated_at_editorial" timestamp(3) with time zone,
      ADD COLUMN "version_correction_note" varchar;

    CREATE INDEX "articles_is_featured_idx" ON "articles" USING btree ("is_featured");
    CREATE INDEX "articles_updated_at_editorial_idx" ON "articles" USING btree ("updated_at_editorial");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "articles_is_featured_idx";
    DROP INDEX "articles_updated_at_editorial_idx";

    ALTER TABLE "articles"
      DROP COLUMN "seo_title",
      DROP COLUMN "seo_description",
      DROP COLUMN "is_featured",
      DROP COLUMN "updated_at_editorial",
      DROP COLUMN "correction_note";

    ALTER TABLE "_articles_v"
      DROP COLUMN "version_seo_title",
      DROP COLUMN "version_seo_description",
      DROP COLUMN "version_is_featured",
      DROP COLUMN "version_updated_at_editorial",
      DROP COLUMN "version_correction_note";
  `)
}
