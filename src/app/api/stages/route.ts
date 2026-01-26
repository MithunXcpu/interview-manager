import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { STAGE_DEFINITIONS, getStageDefinition } from "@/lib/stages";

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

    // Fetch user's stages
    const stages = await db.userStage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
    });

    // Also return the stage library for settings
    return NextResponse.json({
      stages,
      stageLibrary: STAGE_DEFINITIONS,
    });
  } catch (error) {
    console.error("Error fetching stages:", error);
    return NextResponse.json(
      { error: "Failed to fetch stages" },
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
    const { stageKey } = body;

    if (!stageKey) {
      return NextResponse.json(
        { error: "Stage key is required" },
        { status: 400 }
      );
    }

    // Get stage definition
    const stageDef = getStageDefinition(stageKey);
    if (!stageDef) {
      return NextResponse.json(
        { error: "Invalid stage key" },
        { status: 400 }
      );
    }

    // Get current max order
    const maxOrderStage = await db.userStage.findFirst({
      where: { userId: user.id },
      orderBy: { order: "desc" },
    });
    const newOrder = (maxOrderStage?.order ?? -1) + 1;

    // Create or enable the stage
    const stage = await db.userStage.upsert({
      where: {
        userId_stageKey: {
          userId: user.id,
          stageKey: stageKey,
        },
      },
      update: {
        isEnabled: true,
        order: newOrder,
      },
      create: {
        userId: user.id,
        stageKey: stageKey,
        name: stageDef.name,
        emoji: stageDef.emoji,
        color: stageDef.color,
        order: newOrder,
        isEnabled: true,
      },
    });

    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    console.error("Error creating stage:", error);
    return NextResponse.json(
      { error: "Failed to create stage" },
      { status: 500 }
    );
  }
}

// PUT - Reorder stages or update enabled status
export async function PUT(request: NextRequest) {
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
    const { stages } = body;

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json(
        { error: "Stages array is required" },
        { status: 400 }
      );
    }

    // Update each stage's order and enabled status
    const updates = stages.map((stage: { id: string; order: number; isEnabled: boolean }, index: number) =>
      db.userStage.update({
        where: { id: stage.id, userId: user.id },
        data: {
          order: stage.order ?? index,
          isEnabled: stage.isEnabled ?? true,
        },
      })
    );

    await Promise.all(updates);

    // Fetch updated stages
    const updatedStages = await db.userStage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ stages: updatedStages });
  } catch (error) {
    console.error("Error updating stages:", error);
    return NextResponse.json(
      { error: "Failed to update stages" },
      { status: 500 }
    );
  }
}

// DELETE - Disable a stage (don't actually delete to preserve history)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get("id");

    if (!stageId) {
      return NextResponse.json(
        { error: "Stage ID is required" },
        { status: 400 }
      );
    }

    // Disable the stage instead of deleting
    await db.userStage.update({
      where: { id: stageId, userId: user.id },
      data: { isEnabled: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stage:", error);
    return NextResponse.json(
      { error: "Failed to delete stage" },
      { status: 500 }
    );
  }
}
