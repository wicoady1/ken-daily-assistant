CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_date_unique" UNIQUE("date")
);
