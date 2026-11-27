ALTER TABLE "focus_session_participations" ADD COLUMN "credited_days" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "started_by" bigint;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "host_id" bigint;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "focus_min" smallint DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "short_break_min" smallint DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "long_break_min" smallint;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "long_break_every" smallint;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "next_cycle_config" jsonb;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "status" varchar(8) DEFAULT 'running' NOT NULL;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "phase" varchar(12) DEFAULT 'focus' NOT NULL;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "focus_phases_done" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "phase_started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "phase_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "paused_remaining_ms" bigint;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "last_action" jsonb;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "empty_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "end_reason" varchar(16);--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "ended_by" bigint;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_ended_by_users_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_focus_min" CHECK ("focus_sessions"."focus_min" BETWEEN 5 AND 120);--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_short_break_min" CHECK ("focus_sessions"."short_break_min" BETWEEN 1 AND 30);--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_long_break_min" CHECK ("focus_sessions"."long_break_min" BETWEEN 5 AND 60);--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_long_break_every" CHECK ("focus_sessions"."long_break_every" BETWEEN 2 AND 8);