CREATE TABLE "messages" (
	"id" bigint PRIMARY KEY NOT NULL,
	"channel_id" bigint NOT NULL,
	"author_id" bigint NOT NULL,
	"type" smallint DEFAULT 0 NOT NULL,
	"content" varchar(2000) DEFAULT '' NOT NULL,
	"nonce" varchar(64),
	"reply_to_id" bigint,
	"mention_user_ids" bigint[] DEFAULT '{}' NOT NULL,
	"mention_role_ids" bigint[] DEFAULT '{}' NOT NULL,
	"mention_everyone" boolean DEFAULT false NOT NULL,
	"system_data" jsonb,
	"edited_at" timestamp with time zone,
	"pinned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "last_message_id" bigint;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_messages_channel" ON "messages" USING btree ("channel_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_messages_author_nonce" ON "messages" USING btree ("author_id","nonce") WHERE "messages"."nonce" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_messages_author_time" ON "messages" USING btree ("author_id","created_at");