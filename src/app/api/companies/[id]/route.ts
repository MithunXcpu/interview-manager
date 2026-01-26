import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const company = await db.company.findUnique({
      where: { id, userId: user.id },
      include: {
        userStage: true,
        interviews: {
          orderBy: { scheduledAt: "asc" },
        },
        emails: {
          orderBy: { receivedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify company belongs to user
    const existingCompany = await db.company.findUnique({
      where: { id, userId: user.id },
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await request.json();

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.jobTitle !== undefined) updateData.jobTitle = body.jobTitle;
    if (body.jobUrl !== undefined) updateData.jobUrl = body.jobUrl;
    if (body.salary !== undefined) updateData.salary = body.salary;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.remote !== undefined) updateData.remote = body.remote;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.recruiterName !== undefined) updateData.recruiterName = body.recruiterName;
    if (body.recruiterEmail !== undefined) updateData.recruiterEmail = body.recruiterEmail;
    if (body.recruiterPhone !== undefined) updateData.recruiterPhone = body.recruiterPhone;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.stageId !== undefined) updateData.stageId = body.stageId;

    const company = await db.company.update({
      where: { id },
      data: updateData,
      include: {
        userStage: true,
        interviews: {
          orderBy: { scheduledAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      company: {
        ...company,
        stage: company.userStage,
        totalRounds: company.interviews.length || 4,
        completedRounds: company.interviews.filter((i) => i.status === "COMPLETED").length,
      },
    });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify company belongs to user
    const existingCompany = await db.company.findUnique({
      where: { id, userId: user.id },
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    await db.company.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
