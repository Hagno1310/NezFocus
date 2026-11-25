CREATE TABLE "channel_recipients" (
	"channel_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "channel_recipients_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "dm_pairs" (
	"user_id_low" bigint NOT NULL,
	"user_id_high" bigint NOT NULL,
	"channel_id" bigint NOT NULL,
	CONSTRAINT "dm_pairs_user_id_low_user_id_high_pk" PRIMARY KEY("user_id_low","user_id_high"),
	CONSTRAINT "dm_pairs_channelId_unique" UNIQUE("channel_id"),
	CONSTRAINT "dm_pairs_ordered" CHECK ("dm_pairs"."user_id_low" < "dm_pairs"."user_id_high")
);
--> statement-breakpoint
ALTER TABLE "channel_recipients" ADD CONSTRAINT "channel_recipients_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_recipients" ADD CONSTRAINT "channel_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_pairs" ADD CONSTRAINT "dm_pairs_user_id_low_users_id_fk" FOREIGN KEY ("user_id_low") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_pairs" ADD CONSTRAINT "dm_pairs_user_id_high_users_id_fk" FOREIGN KEY ("user_id_high") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_pairs" ADD CONSTRAINT "dm_pairs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_channel_recipients_user" ON "channel_recipients" USING btree ("user_id");