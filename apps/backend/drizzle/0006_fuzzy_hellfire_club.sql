CREATE TABLE "user_study_streaks" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"current_streak_days" integer DEFAULT 0 NOT NULL,
	"longest_streak_days" integer DEFAULT 0 NOT NULL,
	"last_qualified_date" date
);
--> statement-breakpoint
ALTER TABLE "user_study_streaks" ADD CONSTRAINT "user_study_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;