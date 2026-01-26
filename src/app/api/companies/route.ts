import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// In production, this would use Prisma
// For now, we return demo data

const DEMO_COMPANIES = [
  {
    id: "1",
    name: "Google",
    industry: "Tech",
    size: "10,000+",
    jobTitle: "Senior Software Engineer",
    stage: "INTERVIEW",
    priority: "HIGH",
    salary: { min: 180000, max: 250000, currency: "USD" },
    totalRounds: 5,
    completedRounds: 2,
    interviewers: [
      { name: "Sarah Chen", role: "Technical Recruiter" },
      { name: "Mike Ross", role: "Engineering Manager" },
    ],
    appliedDate: "2025-01-15",
  },
  {
    id: "2",
    name: "Stripe",
    industry: "Fintech",
    size: "5,000+",
    jobTitle: "Full Stack Engineer",
    stage: "SCREENING",
    priority: "HIGH",
    salary: { min: 160000, max: 220000, currency: "USD" },
    totalRounds: 4,
    completedRounds: 1,
    interviewers: [{ name: "David Kim", role: "Recruiter" }],
    appliedDate: "2025-01-18",
  },
];

export async function GET() {
  try {
    const { userId } = await auth();

    // Return demo data for now
    return NextResponse.json({ companies: DEMO_COMPANIES });
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

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.jobTitle) {
      return NextResponse.json(
        { error: "Name and job title are required" },
        { status: 400 }
      );
    }

    // In production, save to database
    const newCompany = {
      id: Date.now().toString(),
      ...body,
      stage: body.stage || "WISHLIST",
      priority: body.priority || "MEDIUM",
      totalRounds: body.totalRounds || 4,
      completedRounds: body.completedRounds || 0,
      interviewers: body.interviewers || [],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ company: newCompany }, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
