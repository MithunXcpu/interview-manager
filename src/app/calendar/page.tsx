"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  meetLink?: string;
  attendees?: string[];
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const timeMin = startOfMonth(currentMonth).toISOString();
        const timeMax = endOfMonth(addMonths(currentMonth, 1)).toISOString();

        const response = await fetch(`/api/calendar?type=events&timeMin=${timeMin}&timeMax=${timeMax}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [currentMonth]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Pad the beginning with empty days
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = parseISO(event.start);
      return isSameDay(eventDate, date);
    });
  };

  const formatEventTime = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "h:mm a");
    } catch {
      return "";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--background)] z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span>📋</span>
              </div>
              <span className="font-bold hidden sm:block">Interview Manager</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:text-white hover:bg-[var(--secondary)]">
                Pipeline
              </Link>
              <Link href="/emails" className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:text-white hover:bg-[var(--secondary)]">
                Emails
              </Link>
              <Link href="/calendar" className="px-3 py-1.5 rounded-lg text-sm bg-[var(--primary)]/20 text-[var(--primary)]">
                Calendar
              </Link>
              <Link href="/settings" className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:text-white hover:bg-[var(--secondary)]">
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{format(currentMonth, "MMMM yyyy")}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="btn btn-secondary px-3"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="btn btn-secondary px-4"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="btn btn-secondary px-3"
            >
              →
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="card p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-[var(--muted)] py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding days */}
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} className="h-28 rounded-lg" />
            ))}

            {/* Actual days */}
            {days.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`h-28 rounded-lg border p-1 cursor-pointer transition-colors overflow-hidden ${
                    isToday
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : isSelected
                      ? "border-[var(--primary)]/50 bg-[var(--secondary)]"
                      : "border-[var(--border)] hover:bg-[var(--secondary)]/50"
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? "text-[var(--primary)]" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5 overflow-y-auto max-h-20">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className="text-xs p-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded truncate hover:bg-[var(--primary)]/30"
                      >
                        {formatEventTime(event.start)} {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-[var(--muted)] pl-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events List */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Upcoming Interviews</h2>
          {events.length === 0 ? (
            <div className="card p-8 text-center text-[var(--muted)]">
              <span className="text-4xl mb-4 block">📅</span>
              <p>No upcoming events</p>
              <p className="text-sm mt-2">Connect Google Calendar in Settings to see your events</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events
                .filter((e) => new Date(e.start) >= new Date())
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .slice(0, 10)
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="card p-4 cursor-pointer hover:bg-[var(--secondary)]/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{event.title}</h3>
                        <p className="text-sm text-[var(--muted)]">
                          {format(parseISO(event.start), "EEEE, MMMM d 'at' h:mm a")}
                        </p>
                      </div>
                      {event.meetLink && (
                        <a
                          href={event.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-primary text-sm"
                        >
                          Join Meet
                        </a>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[var(--muted)] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--muted)]">When</p>
                <p className="font-medium">
                  {format(parseISO(selectedEvent.start), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-[var(--muted)]">
                  {formatEventTime(selectedEvent.start)} - {formatEventTime(selectedEvent.end)}
                </p>
              </div>

              {selectedEvent.location && (
                <div>
                  <p className="text-sm text-[var(--muted)]">Location</p>
                  <p>{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.meetLink && (
                <div>
                  <p className="text-sm text-[var(--muted)]">Meeting Link</p>
                  <a
                    href={selectedEvent.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    {selectedEvent.meetLink}
                  </a>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <p className="text-sm text-[var(--muted)]">Description</p>
                  <p className="whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <p className="text-sm text-[var(--muted)]">Attendees</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedEvent.attendees.map((attendee, i) => (
                      <span key={i} className="px-2 py-1 bg-[var(--secondary)] rounded-lg text-sm">
                        {attendee}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedEvent.meetLink && (
                  <a
                    href={selectedEvent.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary flex-1"
                  >
                    Join Meeting
                  </a>
                )}
                <button onClick={() => setSelectedEvent(null)} className="btn btn-secondary flex-1">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
