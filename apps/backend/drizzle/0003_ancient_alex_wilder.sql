CREATE TABLE "channels" (
	"id" bigint PRIMARY KEY NOT NULL,
	"server_id" bigint,
	"parent_id" bigint,
	"type" smallint NOT NULL,
	"name" varchar(100),
	"position" integer DEFAULT 0 NOT NULL,
	"focus_control" varchar(10) DEFAULT 'off' NOT NULL,
	"permissions_synced" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channels_dm_has_no_server" CHECK (("channels"."type" IN (3, 4)) = ("channels"."server_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" bigint PRIMARY KEY NOT NULL,
	"server_id" bigint NOT NULL,
	"name" varchar(100) NOT NULL,
	"permissions" bigint DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_id_server_id_unique" UNIQUE("id","server_id")
);
--> statement-breakpoint
CREATE TABLE "server_member_roles" (
	"server_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"role_id" bigint NOT NULL,
	CONSTRAINT "server_member_roles_server_id_user_id_role_id_pk" PRIMARY KEY("server_id","user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "server_members" (
	"server_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "server_members_server_id_user_id_pk" PRIMARY KEY("server_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" bigint PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"owner_id" bigint NOT NULL,
	"template" varchar(20) DEFAULT 'general' NOT NULL,
	"system_channel_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_parent_id_channels_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_member_roles" ADD CONSTRAINT "server_member_roles_server_id_user_id_server_members_server_id_user_id_fk" FOREIGN KEY ("server_id","user_id") REFERENCES "public"."server_members"("server_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_member_roles" ADD CONSTRAINT "server_member_roles_role_id_server_id_roles_id_server_id_fk" FOREIGN KEY ("role_id","server_id") REFERENCES "public"."roles"("id","server_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_members" ADD CONSTRAINT "server_members_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_members" ADD CONSTRAINT "server_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servers" ADD CONSTRAINT "servers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servers" ADD CONSTRAINT "servers_system_channel_id_channels_id_fk" FOREIGN KEY ("system_channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_channels_server" ON "channels" USING btree ("server_id") WHERE "channels"."server_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_roles_server" ON "roles" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "idx_server_members_user" ON "server_members" USING btree ("user_id");