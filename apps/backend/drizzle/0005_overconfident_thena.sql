CREATE TABLE "channel_permission_overwrites" (
	"channel_id" bigint NOT NULL,
	"target_id" bigint NOT NULL,
	"target_type" smallint NOT NULL,
	"allow" bigint DEFAULT 0 NOT NULL,
	"deny" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "channel_permission_overwrites_channel_id_target_id_target_type_pk" PRIMARY KEY("channel_id","target_id","target_type"),
	CONSTRAINT "overwrite_allow_deny_disjoint" CHECK (("channel_permission_overwrites"."allow" & "channel_permission_overwrites"."deny") = 0)
);
--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "color" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_hoisted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_mentionable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "server_members" ADD COLUMN "timeout_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "channel_permission_overwrites" ADD CONSTRAINT "channel_permission_overwrites_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;