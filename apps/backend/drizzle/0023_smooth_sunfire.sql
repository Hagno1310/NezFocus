CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY NOT NULL,
	"server_id" bigint NOT NULL,
	"actor_id" bigint NOT NULL,
	"target_id" bigint,
	"action_type" varchar(50) NOT NULL,
	"reason" varchar(512),
	"changes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "server_members" ADD COLUMN "timeout_reason" varchar(512);--> statement-breakpoint
CREATE INDEX "idx_audit_server_time" ON "audit_logs" USING btree ("server_id","created_at" DESC NULLS LAST);