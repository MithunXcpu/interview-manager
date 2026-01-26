import { NextRequest, NextResponse } from "next/server";

// In production, this would:
// 1. Save booking to database
// 2. Create Google Calendar event
// 3. Send confirmation emails

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const date = searchParams.get("date");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  // In production, fetch from database
  // For now, return demo availability
  const availability = {
    "2025-01-27": [
      { time: "09:00", available: true },
      { time: "10:00", available: true },
      { time: "14:00", available: true },
      { time: "15:00", available: true },
    ],
    "2025-01-28": [
      { time: "09:00", available: true },
      { time: "11:00", available: true },
      { time: "14:00", available: true },
    ],
    "2025-01-29": [
      { time: "10:00", available: true },
      { time: "11:00", available: true },
      { time: "14:00", available: true },
      { time: "15:00", available: true },
    ],
  };

  if (date) {
    return NextResponse.json({
      slots: availability[date as keyof typeof availability] || [],
    });
  }

  return NextResponse.json({ availability });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      slug,
      date,
      time,
      meetingType,
      name,
      email,
      company,
      role,
      phone,
      notes,
    } = body;

    // Validate required fields
    if (!slug || !date || !time || !name || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (meetingType === "phone" && !phone) {
      return NextResponse.json(
        { error: "Phone number required for phone meetings" },
        { status: 400 }
      );
    }

    // In production:
    // 1. Check if slot is still available
    // 2. Create booking in database
    // 3. Create Google Calendar event with meet link
    // 4. Send confirmation email to both parties

    const booking = {
      id: Date.now().toString(),
      slug,
      date,
      time,
      meetingType,
      attendee: { name, email, company, role, phone },
      notes,
      status: "confirmed",
      meetingLink:
        meetingType === "google_meet"
          ? "https://meet.google.com/xxx-xxxx-xxx"
          : meetingType === "zoom"
          ? "https://zoom.us/j/xxxxxxxxx"
          : null,
      createdAt: new Date().toISOString(),
    };

    // Simulate sending confirmation email
    console.log(`Booking confirmed for ${name} (${email}) on ${date} at ${time}`);

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
