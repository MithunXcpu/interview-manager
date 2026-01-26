import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { listCalendarEvents, createCalendarEvent, getFreeBusy } from "@/lib/google";
import { addDays, format, startOfDay, endOfDay, parseISO, addMinutes } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "events";

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If Google is not connected, return empty or demo data
    if (!user.googleAccessToken || !user.googleRefreshToken) {
      return NextResponse.json({
        events: [],
        slots: [],
        isDemo: true,
        message: "Connect Google Calendar to see your events",
      });
    }

    if (type === "events") {
      // Get events from Google Calendar
      const timeMinParam = searchParams.get("timeMin");
      const timeMaxParam = searchParams.get("timeMax");
      const timeMin = timeMinParam ? new Date(timeMinParam) : new Date();
      const timeMax = timeMaxParam ? new Date(timeMaxParam) : addDays(new Date(), 14);

      try {
        const events = await listCalendarEvents(
          user.googleAccessToken,
          timeMin,
          timeMax,
          user.googleRefreshToken
        );

        return NextResponse.json({ events });
      } catch (calendarError) {
        console.error("Calendar API error:", calendarError);
        return NextResponse.json({ events: [], error: "Failed to fetch events" });
      }
    }

    if (type === "availability") {
      // Get free/busy information and calculate available slots
      const days = parseInt(searchParams.get("days") || "7");
      const duration = parseInt(searchParams.get("duration") || "30");

      // Get user's availability preferences
      const availabilitySlots = await db.availabilitySlot.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });

      // Build date range
      const timeMin = startOfDay(new Date());
      const timeMax = endOfDay(addDays(new Date(), days));

      try {
        const rawBusySlots = await getFreeBusy(
          user.googleAccessToken,
          timeMin,
          timeMax,
          user.googleRefreshToken
        );
        // Filter out slots with undefined start/end
        const busySlots = rawBusySlots.filter(
          (slot): slot is { start: string; end: string } =>
            typeof slot.start === 'string' && typeof slot.end === 'string'
        );

        // Generate available slots based on user preferences and busy times
        const slots: { date: string; times: string[] }[] = [];

        for (let i = 0; i < days; i++) {
          const date = addDays(new Date(), i);
          const dayOfWeek = date.getDay();
          const dateStr = format(date, "yyyy-MM-dd");

          // Get availability for this day
          const dayAvailability = availabilitySlots.filter((s) => s.dayOfWeek === dayOfWeek);

          if (dayAvailability.length === 0) continue;

          const daySlots: string[] = [];

          for (const avail of dayAvailability) {
            const [startHour, startMin] = avail.startTime.split(":").map(Number);
            const [endHour, endMin] = avail.endTime.split(":").map(Number);

            const slotStart = new Date(date);
            slotStart.setHours(startHour, startMin, 0, 0);

            const slotEnd = new Date(date);
            slotEnd.setHours(endHour, endMin, 0, 0);

            // Generate time slots
            let current = slotStart;
            while (addMinutes(current, duration) <= slotEnd) {
              const timeStr = format(current, "HH:mm");
              const slotEndTime = addMinutes(current, duration);

              // Check if this slot conflicts with any busy period
              const isConflict = busySlots.some((busy) => {
                const busyStart = parseISO(busy.start);
                const busyEnd = parseISO(busy.end);
                return (
                  (current >= busyStart && current < busyEnd) ||
                  (slotEndTime > busyStart && slotEndTime <= busyEnd) ||
                  (current <= busyStart && slotEndTime >= busyEnd)
                );
              });

              if (!isConflict && current > new Date()) {
                daySlots.push(timeStr);
              }

              current = addMinutes(current, duration);
            }
          }

          if (daySlots.length > 0) {
            slots.push({ date: dateStr, times: daySlots });
          }
        }

        return NextResponse.json({ slots });
      } catch (calendarError) {
        console.error("Calendar availability error:", calendarError);
        return NextResponse.json({ slots: [], error: "Failed to fetch availability" });
      }
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      attendees,
      createMeet,
    } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 }
      );
    }

    // If Google is connected, create event in Google Calendar
    if (user.googleAccessToken && user.googleRefreshToken) {
      try {
        const event = await createCalendarEvent(
          user.googleAccessToken,
          {
            summary: title,
            description,
            start: new Date(startTime),
            end: new Date(endTime),
            attendees,
            conferenceData: createMeet ?? true,
          },
          user.googleRefreshToken
        );

        return NextResponse.json({
          success: true,
          event,
        });
      } catch (calendarError) {
        console.error("Create event error:", calendarError);
        return NextResponse.json(
          { error: "Failed to create calendar event" },
          { status: 500 }
        );
      }
    }

    // Demo mode
    return NextResponse.json({
      success: true,
      event: {
        id: `demo-${Date.now()}`,
        title,
        startTime,
        endTime,
        description,
        htmlLink: "",
      },
      isDemo: true,
    });
  } catch (error) {
    console.error("Calendar create error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
