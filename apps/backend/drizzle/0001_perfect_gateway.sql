CREATE TABLE "daily_study_stats" (
	"user_id" bigint NOT NULL,
	"local_date" date NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"focused_seconds" integer DEFAULT 0 NOT NULL,
	"solo_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_study_stats_user_id_local_date_pk" PRIMARY KEY("user_id","local_date"),
	CONSTRAINT "daily_study_stats_cap" CHECK ("daily_study_stats"."focused_seconds" <= 57600)
);
--> statement-breakpoint
ALTER TABLE "daily_study_stats" ADD CONSTRAINT "daily_study_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;