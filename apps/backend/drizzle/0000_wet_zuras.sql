CREATE TABLE "user_settings" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"timezone_changed_at" timestamp with time zone,
	"locale" varchar(8) DEFAULT 'vi' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY NOT NULL,
	"username" varchar(32),
	"email" varchar(255),
	"password_hash" varchar(255),
	"display_name" varchar(32),
	"avatar_key" text,
	"account_status" varchar(20) DEFAULT 'active' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"terms_version" varchar(20),
	"terms_accepted_at" timestamp with time zone,
	"account_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_username_format" CHECK ("users"."username" ~ '^[a-z0-9_.]{2,32}$')
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"device_name" varchar(100),
	"device_id" varchar(64),
	"platform" varchar(10) NOT NULL,
	"app_version" varchar(20),
	"ip_prefix" varchar(45),
	"trusted_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" varchar(32)
);
--> statement-breakpoint
CREATE TABLE "email_codes" (
	"email" varchar(255) NOT NULL,
	"purpose" varchar(16) NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_codes_email_purpose_pk" PRIMARY KEY("email","purpose")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"token_hash" "bytea" PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "users" USING btree (lower("email")) WHERE "users"."email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_user" ON "auth_sessions" USING btree ("user_id") WHERE "auth_sessions"."revoked_at" IS NULL;