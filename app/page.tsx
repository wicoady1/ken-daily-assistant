"use client";

import { useState, useEffect, useRef } from "react";

interface NoteData {
  id: number;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Home() {
  const [todayContent, setTodayContent] = useState("");
  const [yesterdayNote, setYesterdayNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yesterdayLoading, setYesterdayLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const todayStr = useRef("");

  useEffect(() => {
    async function load() {
      try {
        const [todayRes, yesterdayRes] = await Promise.all([
          fetch("/api/notes?date=today"),
          fetch("/api/notes?date=yesterday"),
        ]);

        if (todayRes.ok) {
          const data: NoteData = await todayRes.json();
          setTodayContent(data.content);
          todayStr.current = data.date;
        } else if (todayRes.status === 404) {
          todayStr.current =
            new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Jakarta",
            }).format(new Date());
        } else {
          setError("Failed to load today's note.");
        }

        if (yesterdayRes.ok) {
          const data: NoteData = await yesterdayRes.json();
          setYesterdayNote(data);
        }
      } catch {
        setError("Network error loading notes.");
      } finally {
        setLoading(false);
        setYesterdayLoading(false);
      }
    }
    load();
  }, []);

  async function save(content: string) {
    if (!todayStr.current) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayStr.current, content }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleChange(value: string) {
    setTodayContent(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(value), 2000);
  }

  function handleSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save(todayContent);
  }

  if (loading) {
    return (
      <main className="container">
        <p className="loading-text">Loading...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1 className="title">Daily Notes</h1>
      <p className="date-label">
        {todayStr.current ? formatDateLong(todayStr.current) : ""}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="note-section">
        <div className="note-header">
          <label htmlFor="today-notes">Today&apos;s Notes</label>
          <span className="save-status">
            {saving && "Saving..."}
            {saveStatus === "saved" && <span className="badge saved">Saved</span>}
            {saveStatus === "error" && <span className="badge error">Save failed</span>}
          </span>
        </div>
        <textarea
          id="today-notes"
          className="note-input"
          placeholder="What happened today? What do you need to remember?"
          value={todayContent}
          onChange={(e) => handleChange(e.target.value)}
          rows={10}
        />
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="note-section yesterday-section">
        <h2 className="section-title">Yesterday&apos;s Notes</h2>
        {yesterdayLoading ? (
          <p className="loading-text">Loading...</p>
        ) : yesterdayNote ? (
          <div className="yesterday-content">
            <p className="yesterday-date">
              {formatDateLong(yesterdayNote.date)}
            </p>
            <pre className="note-text">{yesterdayNote.content}</pre>
          </div>
        ) : (
          <p className="empty-text">No notes from yesterday.</p>
        )}
      </div>
    </main>
  );
}
