ALTER TABLE "attachments" ADD COLUMN "channel_id" bigint;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "message_id" bigint;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "thumbnail_key" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "pinned_by" bigint;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attachments_message" ON "attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_messages_pins" ON "messages" USING btree ("channel_id","pinned_at" DESC NULLS LAST) WHERE "messages"."pinned_at" IS NOT NULL;