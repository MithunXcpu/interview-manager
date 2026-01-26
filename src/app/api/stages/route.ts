import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { STAGE_DEFINITIONS, getStageDefinition } from "@/lib/stages";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.log("Stages API: No userId from auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    // Create user if not found (backup for race conditions)
    if (!user) {
      console.log("Stages API: User not found, creating...");
      try {
        user = await db.user.create({
          data: {
            clerkId: userId,
            email: `${userId}@temp.local`,
            onboardingCompleted: false,
            onboardingStep: 0,
          },
        });
      } catch (createError) {
        // User might have been created by another request
        user = await db.user.findUnique({
          where: { clerkId: userId },
        });
        if (!user) {
          console.error("Stages API: Failed to create or find user");
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
      }
    }

    // Fetch user's stages
    let stages = await db.userStage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
    });

    console.log(`Stages API: Found ${stages.length} stages for user ${user.id}`);

    // Create default stages if none exist
    if (stages.length === 0) {
      console.log("Stages API: Creating default stages...");
      const defaultStages = STAGE_DEFINITIONS
        .filter(s => s.defaultEnabled)
        .map((stage, index) => ({
          userId: user.id,
          stageKey: stage.key,
          name: stage.name,
          emoji: stage.emoji,
          color: stage.color,
          order: index,
          isEnabled: true,
        }));

      try {
        await db.userStage.createMany({
          data: defaultStages,
          skipDuplicates: true,
        });

        stages = await db.userStage.findMany({
          where: { userId: user.id },
          orderBy: { order: "asc" },
        });
        console.log(`Stages API: Created ${stages.length} default stages`);
      } catch (stageError) {
        console.error("Stages API: Error creating stages:", stageError);
        // Return empty stages rather than error
        stages = [];
      }
    }

    // Also return the stage library for settings
    return NextResponse.json({
      stages,
      stageLibrary: STAGE_DEFINITIONS,
    });
  } catch (error) {
    console.error("Stages API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stages", stages: [], stageLibrary: STAGE_DEFINITIONS },
      { status: 500 }
    );
  }
}

const MAX_STAGES = 10;

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

    // Check if stage already exists and is enabled
    const existingStage = await db.userStage.findUnique({
      where: {
        userId_stageKey: {
          userId: user.id,
          stageKey: stageKey,
        },
      },
    });

    // If stage exists and is already enabled, just return it
    if (existingStage?.isEnabled) {
      return NextResponse.json({ stage: existingStage }, { status: 200 });
    }

    // Enforce MAX_STAGES limit (only count enabled stages)
    const enabledCount = await db.userStage.count({
      where: { userId: user.id, isEnabled: true },
    });

    if (enabledCount >= MAX_STAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_STAGES} stages allowed` },
        { status: 400 }
      );
    }

    // Get current max order among enabled stages
    const maxOrderStage = await db.userStage.findFirst({
      where: { userId: user.id, isEnabled: true },
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
