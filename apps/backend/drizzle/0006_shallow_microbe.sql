ALTER TABLE "roles" ADD COLUMN "color" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_hoisted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_mentionable" boolean DEFAULT false NOT NULL;