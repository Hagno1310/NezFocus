CREATE TABLE "solo_sessions" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"focus_min" smallint NOT NULL,
	"short_break_min" smallint NOT NULL,
	"long_break_min" smallint,
	"long_break_every" smallint,
	"next_cycle_config" jsonb,
	"status" varchar(8) DEFAULT 'running' NOT NULL,
	"phase" varchar(12) DEFAULT 'focus' NOT NULL,
	"focus_phases_done" smallint DEFAULT 0 NOT NULL,
	"phase_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"phase_ends_at" timestamp with time zone,
	"paused_remaining_ms" bigint,
	"waiting_since" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" varchar(16),
	"focused_seconds" integer DEFAULT 0 NOT NULL,
	"credited_days" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hit_daily_cap" boolean DEFAULT false NOT NULL,
	CONSTRAINT "solo_focus_min" CHECK ("solo_sessions"."focus_min" BETWEEN 5 AND 120),
	CONSTRAINT "solo_short_break_min" CHECK ("solo_sessions"."short_break_min" BETWEEN 1 AND 30),
	CONSTRAINT "solo_long_break_min" CHECK ("solo_sessions"."long_break_min" BETWEEN 5 AND 60),
	CONSTRAINT "solo_long_break_every" CHECK ("solo_sessions"."long_break_every" BETWEEN 2 AND 8)
);
--> statement-breakpoint
ALTER TABLE "solo_sessions" ADD CONSTRAINT "solo_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_solo_active_per_user" ON "solo_sessions" USING btree ("user_id") WHERE "solo_sessions"."ended_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_solo_sessions_user_time" ON "solo_sessions" USING btree ("user_id","started_at");