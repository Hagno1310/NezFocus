CREATE TABLE "notifications" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"type" varchar(24) NOT NULL,
	"data" jsonb NOT NULL,
	"task_id" bigint,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_notifications_task" ON "notifications" USING btree ("task_id") WHERE "notifications"."task_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_notifications_message" ON "notifications" USING btree (("data"->>'message_id'),"user_id") WHERE "notifications"."data"->>'message_id' IS NOT NULL;