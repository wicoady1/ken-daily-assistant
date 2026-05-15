CREATE TABLE "cron_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"action" varchar(50) DEFAULT 'daily-reminder' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cron_executions_date_action_key" ON "cron_executions" USING btree ("date","action");