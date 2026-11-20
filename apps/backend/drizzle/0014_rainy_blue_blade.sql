CREATE TABLE "friendships" (
	"user_id_low" bigint NOT NULL,
	"user_id_high" bigint NOT NULL,
	"status" smallint NOT NULL,
	"requested_by" bigint NOT NULL,
	"request_message" varchar(150),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "friendships_user_id_low_user_id_high_pk" PRIMARY KEY("user_id_low","user_id_high"),
	CONSTRAINT "friendships_order" CHECK ("friendships"."user_id_low" < "friendships"."user_id_high")
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_id" bigint NOT NULL,
	"blocked_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "user_blocks_not_self" CHECK ("user_blocks"."blocker_id" <> "user_blocks"."blocked_id")
);
--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_low_users_id_fk" FOREIGN KEY ("user_id_low") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_high_users_id_fk" FOREIGN KEY ("user_id_high") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_friendships_high" ON "friendships" USING btree ("user_id_high");--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocked" ON "user_blocks" USING btree ("blocked_id");