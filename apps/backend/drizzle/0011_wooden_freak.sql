ALTER TABLE "attachments" DROP CONSTRAINT "attachments_uploader_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "os_version" varchar(20);--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;