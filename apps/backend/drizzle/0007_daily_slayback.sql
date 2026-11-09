CREATE TABLE "focus_session_participations" (
	"id" bigint PRIMARY KEY NOT NULL,
	"focus_session_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"focused_seconds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "focus_sessions" (
	"id" bigint PRIMARY KEY NOT NULL,
	"channel_id" bigint NOT NULL,
	"server_id" bigint NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "focus_session_participations" ADD CONSTRAINT "focus_session_participations_focus_session_id_focus_sessions_id_fk" FOREIGN KEY ("focus_session_id") REFERENCES "public"."focus_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_session_participations" ADD CONSTRAINT "focus_session_participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_focus_participations_user" ON "focus_session_participations" USING btree ("user_id","joined_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_participation_open_per_user" ON "focus_session_participations" USING btree ("user_id") WHERE "focus_session_participations"."left_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_focus_active_per_channel" ON "focus_sessions" USING btree ("channel_id") WHERE "focus_sessions"."ended_at" IS NULL;