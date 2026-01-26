import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { STAGE_DEFINITIONS } from "@/lib/stages";

export async function POST(request: NextRequest) {
  // Get the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Get the headers
  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    const primaryEmail = email_addresses.find(
      (email) => email.id === evt.data.primary_email_address_id
    );

    if (!primaryEmail) {
      console.error("No primary email found for user:", id);
      return NextResponse.json(
        { error: "No primary email found" },
        { status: 400 }
      );
    }

    try {
      // Create user in database
      const user = await db.user.create({
        data: {
          clerkId: id,
          email: primaryEmail.email_address,
          name: [first_name, last_name].filter(Boolean).join(" ") || null,
          onboardingCompleted: false,
          onboardingStep: 0,
        },
      });

      // Create default pipeline stages for the user
      const defaultStages = STAGE_DEFINITIONS.filter((s) => s.defaultEnabled);

      await db.userStage.createMany({
        data: defaultStages.map((stage, index) => ({
          userId: user.id,
          stageKey: stage.key,
          name: stage.name,
          emoji: stage.emoji,
          color: stage.color,
          order: index,
          isEnabled: true,
        })),
      });

      // Create a default booking link for the user
      const slug = primaryEmail.email_address.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
      await db.bookingLink.create({
        data: {
          userId: user.id,
          slug: `${slug}-${Date.now().toString(36)}`,
          title: "Schedule a meeting with me",
          duration: 30,
          isActive: true,
        },
      });

      console.log("Created new user:", user.id, "with default stages and booking link");

      return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
      console.error("Error creating user:", error);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    const primaryEmail = email_addresses.find(
      (email) => email.id === evt.data.primary_email_address_id
    );

    try {
      await db.user.update({
        where: { clerkId: id },
        data: {
          email: primaryEmail?.email_address,
          name: [first_name, last_name].filter(Boolean).join(" ") || null,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error updating user:", error);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      // Cascade delete will handle related records
      await db.user.delete({
        where: { clerkId: id },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, message: "Webhook received" });
}
