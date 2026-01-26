import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFreeBusy, createCalendarEvent, sendEmail } from "@/lib/google";
import { addDays, format, startOfDay, endOfDay, parseISO, addMinutes } from "date-fns";

// GET - Fetch booking link info and availability (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "14");

    // Find booking link
    const bookingLink = await db.bookingLink.findUnique({
      where: { slug, isActive: true },
      include: {
        user: {
          include: {
            availabilitySlots: {
              where: { isActive: true },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            },
          },
        },
      },
    });

    if (!bookingLink) {
      return NextResponse.json({ error: "Booking link not found" }, { status: 404 });
    }

    const user = bookingLink.user;

    // Build available slots based on user's availability preferences
    const slots: { date: string; times: string[] }[] = [];
    const timeMinDate = startOfDay(new Date());
    const timeMaxDate = endOfDay(addDays(new Date(), days));

    // Get busy times from Google Calendar if connected
    let busySlots: { start: string; end: string }[] = [];

    if (user.googleAccessToken && user.googleRefreshToken) {
      try {
        const rawBusySlots = await getFreeBusy(
          user.googleAccessToken,
          timeMinDate,
          timeMaxDate,
          user.googleRefreshToken
        );
        // Filter out any slots with undefined start/end
        busySlots = rawBusySlots
          .filter((slot): slot is { start: string; end: string } =>
            typeof slot.start === 'string' && typeof slot.end === 'string'
          );
      } catch (error) {
        console.error("Error fetching busy slots:", error);
        // Continue without busy times
      }
    }

    // Generate available slots
    for (let i = 1; i <= days; i++) {
      const date = addDays(new Date(), i);
      const dayOfWeek = date.getDay();
      const dateStr = format(date, "yyyy-MM-dd");

      // Get availability for this day
      const dayAvailability = user.availabilitySlots.filter(
        (s) => s.dayOfWeek === dayOfWeek
      );

      if (dayAvailability.length === 0) continue;

      const daySlots: string[] = [];

      for (const avail of dayAvailability) {
        const [startHour, startMin] = avail.startTime.split(":").map(Number);
        const [endHour, endMin] = avail.endTime.split(":").map(Number);

        const slotStart = new Date(date);
        slotStart.setHours(startHour, startMin, 0, 0);

        const slotEnd = new Date(date);
        slotEnd.setHours(endHour, endMin, 0, 0);

        // Generate time slots based on booking duration
        let current = slotStart;
        while (addMinutes(current, bookingLink.duration) <= slotEnd) {
          const timeStr = format(current, "HH:mm");
          const slotEndTime = addMinutes(current, bookingLink.duration);

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

          // Only add future slots
          if (!isConflict && current > new Date()) {
            daySlots.push(timeStr);
          }

          current = addMinutes(current, bookingLink.duration);
        }
      }

      if (daySlots.length > 0) {
        slots.push({ date: dateStr, times: daySlots });
      }
    }

    return NextResponse.json({
      bookingLink: {
        slug: bookingLink.slug,
        title: bookingLink.title,
        description: bookingLink.description,
        duration: bookingLink.duration,
        meetingType: bookingLink.meetingType,
      },
      host: {
        name: user.name || slug,
        timezone: user.availabilitySlots[0]?.timezone || "America/Los_Angeles",
      },
      slots,
    });
  } catch (error) {
    console.error("Error fetching booking availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

// POST - Create a booking (public endpoint)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { date, time, name, email, company, role, notes, phone, meetingType } = body;

    if (!date || !time || !name || !email) {
      return NextResponse.json(
        { error: "Date, time, name, and email are required" },
        { status: 400 }
      );
    }

    // Find booking link
    const bookingLink = await db.bookingLink.findUnique({
      where: { slug, isActive: true },
      include: {
        user: true,
      },
    });

    if (!bookingLink) {
      return NextResponse.json({ error: "Booking link not found" }, { status: 404 });
    }

    const user = bookingLink.user;

    // Parse date and time
    const [hour, minute] = time.split(":").map(Number);
    const startDateTime = parseISO(date);
    startDateTime.setHours(hour, minute, 0, 0);
    const endDateTime = addMinutes(startDateTime, bookingLink.duration);

    const eventTitle = `${bookingLink.title} - ${name}`;
    const eventDescription = `Booking with ${name}
Email: ${email}
${company ? `Company: ${company}` : ""}
${role ? `Role: ${role}` : ""}
${phone ? `Phone: ${phone}` : ""}
${notes ? `\nNotes:\n${notes}` : ""}`;

    let calendarEvent = null;
    let meetLink = null;

    // Create Google Calendar event if connected
    if (user.googleAccessToken && user.googleRefreshToken) {
      try {
        const selectedMeetingType = meetingType || bookingLink.meetingType;
        const createMeet = selectedMeetingType === "GOOGLE_MEET";

        calendarEvent = await createCalendarEvent(
          user.googleAccessToken,
          {
            summary: eventTitle,
            description: eventDescription,
            start: startDateTime,
            end: endDateTime,
            attendees: [email],
            conferenceData: createMeet,
          },
          user.googleRefreshToken
        );

        meetLink = calendarEvent.hangoutLink;

        // Send confirmation email to guest
        try {
          const confirmationSubject = `Confirmed: ${bookingLink.title} with ${user.name || slug}`;
          const confirmationBody = `Hi ${name},

Your meeting has been confirmed!

Meeting Details:
- Title: ${bookingLink.title}
- Date: ${format(startDateTime, "EEEE, MMMM d, yyyy")}
- Time: ${format(startDateTime, "h:mm a")} - ${format(endDateTime, "h:mm a")}
- Duration: ${bookingLink.duration} minutes
${meetLink ? `- Join: ${meetLink}` : ""}

A calendar invite has been sent to your email.

Best,
${user.name || slug}`;

          await sendEmail(
            user.googleAccessToken,
            email,
            confirmationSubject,
            confirmationBody,
            undefined,
            user.googleRefreshToken
          );
        } catch (emailError) {
          console.error("Error sending confirmation email:", emailError);
          // Continue even if email fails
        }
      } catch (calendarError) {
        console.error("Error creating calendar event:", calendarError);
        // Return success even if calendar creation fails
        return NextResponse.json({
          success: true,
          booking: {
            date,
            time,
            duration: bookingLink.duration,
            title: bookingLink.title,
            hostName: user.name || slug,
          },
          warning: "Calendar event could not be created, but booking is noted",
        });
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        date,
        time,
        duration: bookingLink.duration,
        title: bookingLink.title,
        hostName: user.name || slug,
        meetLink,
        calendarEventId: calendarEvent?.id,
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
