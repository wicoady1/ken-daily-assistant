import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { todayWIB, yesterdayWIB, isValidDate } from "@/lib/wib-date";

export async function GET(request: NextRequest) {
  try {
    const dateParam = request.nextUrl.searchParams.get("date") || "today";

    let targetDate: string;
    if (dateParam === "today") {
      targetDate = todayWIB();
    } else if (dateParam === "yesterday") {
      targetDate = yesterdayWIB();
    } else if (isValidDate(dateParam)) {
      targetDate = dateParam;
    } else {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD, 'today', or 'yesterday'." },
        { status: 400 }
      );
    }

    const result = await db
      .select()
      .from(notes)
      .where(eq(notes.date, targetDate))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "No notes found for this date." },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error("GET /api/notes error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.date || !body.content) {
      return NextResponse.json(
        { error: "Missing required fields: date, content." },
        { status: 400 }
      );
    }

    if (!isValidDate(body.date)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (typeof body.content !== "string" || body.content.length > 10000) {
      return NextResponse.json(
        { error: "Content must be a string with max 10000 characters." },
        { status: 400 }
      );
    }

    const result = await db
      .insert(notes)
      .values({
        date: body.date,
        content: body.content,
      })
      .onConflictDoUpdate({
        target: notes.date,
        set: { content: body.content, updated_at: new Date() },
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error("POST /api/notes error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
