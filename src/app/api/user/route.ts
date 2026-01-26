import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { STAGE_DEFINITIONS } from "@/lib/stages";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await db.user.findUnique({
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

    // Create user if not found (fallback for users who signed up before webhook)
    if (!user) {
      // Fetch Clerk user data
      const clerkUser = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }).then(r => r.json()).catch(() => null);

      const email = clerkUser?.email_addresses?.[0]?.email_address || `${userId}@placeholder.com`;
      const name = `${clerkUser?.first_name || ""} ${clerkUser?.last_name || ""}`.trim() || null;
      const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");

      // Create default stages data
      const defaultStages = STAGE_DEFINITIONS
        .filter(s => s.defaultEnabled)
        .map((stage, index) => ({
          stageKey: stage.key,
          name: stage.name,
          emoji: stage.emoji,
          color: stage.color,
          order: index,
          isEnabled: true,
        }));

      user = await db.user.create({
        data: {
          clerkId: userId,
          email,
          name,
          onboardingCompleted: false,
          onboardingStep: 0,
          bookingLinks: {
            create: {
              slug,
              title: "Schedule a meeting",
              duration: 30,
            },
          },
          userStages: {
            create: defaultStages,
          },
        },
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
    }

    // Check if Google is connected
    const googleConnected = !!(user.googleAccessToken && user.googleRefreshToken);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        timezone: (user as { timezone?: string }).timezone || "America/Los_Angeles",
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
        timezone: (user as { timezone?: string }).timezone || "America/Los_Angeles",
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
