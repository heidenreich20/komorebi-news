import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'journalist');
   ALTER TABLE "users" ADD COLUMN "name" varchar;
   ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'journalist';
   ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true;
   UPDATE "users" SET "name" = split_part("email", '@', 1) WHERE "name" IS NULL;
   UPDATE "users" SET "role" = 'admin';
   ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
   ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "name";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "users" DROP COLUMN "active";
  DROP TYPE "public"."enum_users_role";`)
}
