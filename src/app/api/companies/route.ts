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
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const companies = await db.company.findMany({
      where: { userId: user.id },
      include: {
        userStage: true,
        interviews: {
          orderBy: { scheduledAt: "asc" },
        },
        _count: {
          select: { emails: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Transform to match frontend expectations
    const transformedCompanies = companies.map((company) => ({
      id: company.id,
      name: company.name,
      website: company.website,
      jobTitle: company.jobTitle,
      jobUrl: company.jobUrl,
      salary: company.salary,
      location: company.location,
      remote: company.remote,
      priority: company.priority,
      recruiterName: company.recruiterName,
      recruiterEmail: company.recruiterEmail,
      recruiterPhone: company.recruiterPhone,
      notes: company.notes,
      stageId: company.stageId,
      stage: company.userStage || {
        stageKey: company.stage || "APPLIED",
        name: company.stage || "Applied",
        emoji: "📝",
        color: "#8b5cf6",
      },
      interviews: company.interviews,
      totalRounds: company.interviews.length || 4,
      completedRounds: company.interviews.filter((i) => i.status === "COMPLETED").length,
      nextInterview: company.interviews.find((i) => i.status === "SCHEDULED" && new Date(i.scheduledAt) > new Date()),
      emailCount: company._count.emails,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    }));

    return NextResponse.json({ companies: transformedCompanies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
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
      include: {
        userStages: {
          where: { isEnabled: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // Get default stage (first enabled stage, usually WISHLIST)
    const defaultStage = user.userStages[0];

    const company = await db.company.create({
      data: {
        userId: user.id,
        name: body.name,
        website: body.website,
        jobTitle: body.jobTitle,
        jobUrl: body.jobUrl,
        salary: body.salary,
        location: body.location,
        remote: body.remote ?? false,
        priority: body.priority || "MEDIUM",
        recruiterName: body.recruiterName,
        recruiterEmail: body.recruiterEmail,
        recruiterPhone: body.recruiterPhone,
        notes: body.notes,
        stageId: body.stageId || defaultStage?.id,
      },
      include: {
        userStage: true,
      },
    });

    return NextResponse.json({
      company: {
        ...company,
        stage: company.userStage,
        interviews: [],
        totalRounds: 4,
        completedRounds: 0,
        emailCount: 0,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
