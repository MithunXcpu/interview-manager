import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { db } from "@/lib/db";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
);

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?error=google_auth_failed", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=no_code", request.url)
      );
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Save tokens to database for the user
    await db.user.update({
      where: { clerkId: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    console.log("Google OAuth successful for user:", userId);

    return NextResponse.redirect(
      new URL("/settings?success=google_connected", request.url)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=google_auth_failed", request.url)
    );
  }
}
