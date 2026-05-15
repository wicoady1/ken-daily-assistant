import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { notes, cronExecutions } from "@/db/schema";
import { yesterdayWIB } from "@/lib/wib-date";
import { summarizeNotes } from "@/lib/summarize";
import { sendDailyReminder } from "@/lib/telegram";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const urlSecret = request.nextUrl.searchParams.get("secret");
  if (urlSecret === secret) return true;

  return false;
}

function getYesterdayWIB(): string {
  return yesterdayWIB();
}

async function getNotesForDate(dateStr: string) {
  const result = await db
    .select()
    .from(notes)
    .where(eq(notes.date, dateStr))
    .limit(1);
  return result[0] ?? null;
}

async function tryInsertExecution(
  dateStr: string
): Promise<"new" | "duplicate" | "force"> {
  try {
    await db.insert(cronExecutions).values({
      date: dateStr,
      action: "daily-reminder",
      status: "processing",
    });
    return "new";
  } catch {
    return "duplicate";
  }
}

async function updateExecutionStatus(
  dateStr: string,
  status: string,
  error?: string
): Promise<void> {
  await db
    .update(cronExecutions)
    .set({
      status,
      ...(error ? { error } : {}),
    })
    .where(
      and(
        eq(cronExecutions.date, dateStr),
        eq(cronExecutions.action, "daily-reminder")
      )
    );
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isForce = request.nextUrl.searchParams.get("force") === "true";
    const yesterdayDate = getYesterdayWIB();

    if (!isForce) {
      const dedup = await tryInsertExecution(yesterdayDate);
      if (dedup === "duplicate") {
        console.log(`Cron: already processed ${yesterdayDate}, skipping.`);
        return NextResponse.json({
          status: "skipped",
          date: yesterdayDate,
          reason: "already_processed",
        });
      }
    }

    const note = await getNotesForDate(yesterdayDate);

    if (!note) {
      console.log(`Cron: no notes for ${yesterdayDate}, skipping.`);
      await updateExecutionStatus(yesterdayDate, "completed");
      return NextResponse.json({
        status: "no_notes",
        date: yesterdayDate,
      });
    }

    let summaryResult;
    let usedFallback = false;

    try {
      summaryResult = await summarizeNotes(note.content);
    } catch (err) {
      console.error("Cron: summarization failed, using fallback:", err);
      usedFallback = true;
    }

    if (usedFallback || !summaryResult) {
      await sendDailyReminder({
        followUpToday: [],
        prepareAhead: [],
      }, yesterdayDate);
      await updateExecutionStatus(yesterdayDate, "completed", "summarization_failed_fallback_sent");
      console.log(`Cron: fallback sent for ${yesterdayDate}`);
      return NextResponse.json({
        status: "fallback_sent",
        date: yesterdayDate,
      });
    }

    await sendDailyReminder(summaryResult, yesterdayDate);
    await updateExecutionStatus(yesterdayDate, "completed");

    console.log(`Cron: reminder sent for ${yesterdayDate}`);
    return NextResponse.json({
      status: "sent",
      date: yesterdayDate,
      followUpCount: summaryResult.followUpToday.length,
      prepareAheadCount: summaryResult.prepareAhead.length,
    });
  } catch (err) {
    console.error("Cron: unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
