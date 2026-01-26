import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        userStages: {
          where: { isEnabled: true },
          orderBy: { order: "asc" },
        },
        bookingLinks: {
          where: { isActive: true },
          take: 1,
        },
        availabilitySlots: {
          where: { isActive: true },
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if Google is connected
    const googleConnected = !!(user.googleAccessToken && user.googleRefreshToken);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        timezone: user.timezone,
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
        googleConnected,
        stages: user.userStages,
        bookingLink: user.bookingLinks[0] || null,
        availabilitySlots: user.availabilitySlots,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, timezone, onboardingStep, onboardingCompleted, bookingSlug } = body;

    // Build update data object
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (onboardingStep !== undefined) updateData.onboardingStep = onboardingStep;
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted;

    // Update user
    const user = await db.user.update({
      where: { clerkId: userId },
      data: updateData,
      include: {
        bookingLinks: true,
      },
    });

    // Update booking link slug if provided
    if (bookingSlug && user.bookingLinks[0]) {
      // Check if slug is already taken
      const existingLink = await db.bookingLink.findUnique({
        where: { slug: bookingSlug },
      });

      if (existingLink && existingLink.id !== user.bookingLinks[0].id) {
        return NextResponse.json(
          { error: "Booking slug is already taken" },
          { status: 400 }
        );
      }

      await db.bookingLink.update({
        where: { id: user.bookingLinks[0].id },
        data: { slug: bookingSlug },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        timezone: user.timezone,
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
