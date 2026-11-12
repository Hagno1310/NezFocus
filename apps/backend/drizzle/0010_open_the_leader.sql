CREATE TABLE "user_server_settings" (
	"user_id" bigint NOT NULL,
	"server_id" bigint NOT NULL,
	"allow_dm" boolean,
	CONSTRAINT "user_server_settings_user_id_server_id_pk" PRIMARY KEY("user_id","server_id")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "theme" varchar(8) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "allow_dm_from_server_members" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "hide_push_content" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "focus_sound_always" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_server_settings" ADD CONSTRAINT "user_server_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_server_settings" ADD CONSTRAINT "user_server_settings_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;