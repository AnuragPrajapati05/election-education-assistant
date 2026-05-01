// src/pages/CalendarPage.jsx
import { useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const EVENTS_2025 = {
  "2025-01-15": [{ title: "Voter Roll Special Revision Campaign Begins", type: "admin" }],
  "2025-01-25": [{ title: "National Voters' Day", type: "national" }],
  "2025-02-08": [{ title: "Delhi Assembly Election Results", type: "result" }],
  "2025-03-15": [{ title: "Bihar Election Date Announcement", type: "announcement" }],
  "2025-04-05": [{ title: "Voter Registration Deadline — Bihar", type: "deadline" }],
  "2025-10-15": [{ title: "Bihar Assembly Elections Phase 1", type: "polling" }],
  "2025-11-01": [{ title: "Bihar Election Results", type: "result" }],
};

const EVENT_COLORS = {
  admin: "#6366f1", national: "#2563eb", result: "#10b981",
  announcement: "#f59e0b", deadline: "#ef4444", polling: "#2563eb",
};

const EVENT_ICONS = {
  admin: "📋", national: "🇮🇳", result: "📊", announcement: "📢", deadline: "⚠️", polling: "🗳️",
};

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1));
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getKey = (day) => {
    if (!day) return null;
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const selectedEvents = selectedDate ? EVENTS_2025[getKey(selectedDate)] || [] : [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">🗓 Election Calendar</h1>
        <p className="page-subtitle">Important election dates, deadlines, and events for 2025</p>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: "start" }}>
        {/* Calendar */}
        <div className="glass-card" style={{ padding: 24 }}>
          {/* Month nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >←</button>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
              {MONTHS[month]} {year}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >→</button>
          </div>

          {/* Day headers */}
          <div className="calendar-grid" style={{ marginBottom: 4 }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: "4px 0" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="calendar-grid" role="grid" aria-label={`Calendar for ${MONTHS[month]} ${year}`}>
            {days.map((day, i) => {
              const key = getKey(day);
              const hasEvent = key && EVENTS_2025[key];
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = day === selectedDate;

              return (
                <div
                  key={i}
                  className={`cal-day ${isToday ? "today" : ""} ${!day ? "other-month" : ""}`}
                  style={{
                    background: isSelected && !isToday ? "rgba(37,99,235,0.12)" : undefined,
                    fontWeight: hasEvent ? 700 : undefined,
                    color: isSelected && !isToday ? "var(--accent-primary)" : undefined,
                  }}
                  role={day ? "gridcell" : "presentation"}
                  aria-label={day ? `${MONTHS[month]} ${day}${hasEvent ? ", has events" : ""}` : undefined}
                  onClick={() => day && setSelectedDate(day === selectedDate ? null : day)}
                  tabIndex={day ? 0 : -1}
                  onKeyDown={(e) => e.key === "Enter" && day && setSelectedDate(day)}
                >
                  {day}
                  {hasEvent && (
                    <span
                      style={{
                        position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
                        width: 5, height: 5, borderRadius: "50%",
                        background: isToday ? "white" : EVENT_COLORS[EVENTS_2025[key][0]?.type] || "var(--accent-primary)",
                      }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event details */}
        <div>
          {selectedDate && (
            <div className="glass-card animate-in" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                {MONTHS[month]} {selectedDate}, {year}
              </h3>
              {selectedEvents.length > 0 ? selectedEvents.map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border-light)" : "none" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: `${EVENT_COLORS[ev.type]}20`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                  }}>
                    {EVENT_ICONS[ev.type]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.title}</div>
                    <span
                      className="badge"
                      style={{
                        marginTop: 4, fontSize: 10,
                        background: `${EVENT_COLORS[ev.type]}20`,
                        color: EVENT_COLORS[ev.type],
                      }}
                    >
                      {ev.type}
                    </span>
                  </div>
                </div>
              )) : (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No events on this date.</p>
              )}
            </div>
          )}

          {/* Upcoming events list */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📌 All Events {year}</h3>
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            {Object.entries(EVENTS_2025).sort().map(([date, events], i, arr) => (
              <div
                key={date}
                style={{
                  padding: "12px 18px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border-light)" : "none",
                  display: "flex", alignItems: "flex-start", gap: 12,
                }}
              >
                <div style={{
                  width: 44, height: 44, flexShrink: 0, borderRadius: 10,
                  background: `${EVENT_COLORS[events[0]?.type]}15`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: EVENT_COLORS[events[0]?.type] }}>
                    {date.slice(5, 7) ? MONTHS[parseInt(date.slice(5, 7)) - 1] : ""}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                    {date.slice(8)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{events[0].title}</div>
                  <span
                    className="badge"
                    style={{ marginTop: 4, fontSize: 10, background: `${EVENT_COLORS[events[0].type]}15`, color: EVENT_COLORS[events[0].type] }}
                  >
                    {EVENT_ICONS[events[0].type]} {events[0].type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
