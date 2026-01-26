import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { STAGE_DEFINITIONS, getStageDefinition } from "@/lib/stages";

const MAX_STAGES = 10;

// Helper to get authenticated user
async function getAuthenticatedUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return { error: "Unauthorized", status: 401 };
  }

  let user = await db.user.findUnique({
    where: { clerkId },
  });

  // Create user if not found (backup for race conditions)
  if (!user) {
    console.log("Stages API: User not found, creating...");
    try {
      user = await db.user.create({
        data: {
          clerkId,
          email: `${clerkId}@temp.local`,
          onboardingCompleted: false,
          onboardingStep: 0,
        },
      });
    } catch {
      // User might have been created by another request
      user = await db.user.findUnique({
        where: { clerkId },
      });
      if (!user) {
        return { error: "User not found", status: 404 };
      }
    }
  }

  return { user };
}

export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Fetch ALL user's stages (both enabled and disabled)
    let stages = await db.userStage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
    });

    console.log(`Stages API GET: Found ${stages.length} stages for user ${user.id}`);

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
        stages = [];
      }
    }

    // Return all stages and the library
    return NextResponse.json({
      stages,
      stageLibrary: STAGE_DEFINITIONS,
    });
  } catch (error) {
    console.error("Stages API GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stages", stages: [], stageLibrary: STAGE_DEFINITIONS },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const body = await request.json();
    const { stageKey } = body;

    if (!stageKey) {
      return NextResponse.json({ error: "Stage key is required" }, { status: 400 });
    }

    // Get stage definition
    const stageDef = getStageDefinition(stageKey);
    if (!stageDef) {
      return NextResponse.json({ error: "Invalid stage key" }, { status: 400 });
    }

    // Check if stage already exists for this user
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
      console.log(`Stages API POST: Stage ${stageKey} already enabled for user ${user.id}`);
      return NextResponse.json({ stage: existingStage }, { status: 200 });
    }

    // Enforce MAX_STAGES limit (only count enabled stages)
    const enabledCount = await db.userStage.count({
      where: { userId: user.id, isEnabled: true },
    });

    if (enabledCount >= MAX_STAGES) {
      console.log(`Stages API POST: Max stages (${MAX_STAGES}) reached for user ${user.id}`);
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

    let stage;
    if (existingStage) {
      // Re-enable existing disabled stage
      stage = await db.userStage.update({
        where: { id: existingStage.id },
        data: {
          isEnabled: true,
          order: newOrder,
        },
      });
      console.log(`Stages API POST: Re-enabled stage ${stageKey} for user ${user.id}`);
    } else {
      // Create new stage
      stage = await db.userStage.create({
        data: {
          userId: user.id,
          stageKey: stageKey,
          name: stageDef.name,
          emoji: stageDef.emoji,
          color: stageDef.color,
          order: newOrder,
          isEnabled: true,
        },
      });
      console.log(`Stages API POST: Created new stage ${stageKey} for user ${user.id}`);
    }

    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    console.error("Stages API POST error:", error);
    return NextResponse.json({ error: "Failed to create stage" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const body = await request.json();
    const { stages } = body;

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json({ error: "Stages array is required" }, { status: 400 });
    }

    console.log(`Stages API PUT: Updating ${stages.length} stages for user ${user.id}`);

    // Verify all stages belong to this user, then update
    for (const stageData of stages) {
      const { id, order, isEnabled } = stageData as { id: string; order: number; isEnabled: boolean };

      // First verify the stage belongs to this user
      const existingStage = await db.userStage.findFirst({
        where: { id, userId: user.id },
      });

      if (!existingStage) {
        console.log(`Stages API PUT: Stage ${id} not found for user ${user.id}`);
        continue; // Skip stages that don't belong to this user
      }

      // Update the stage
      await db.userStage.update({
        where: { id },
        data: {
          order: order ?? existingStage.order,
          isEnabled: isEnabled ?? existingStage.isEnabled,
        },
      });
    }

    // Fetch and return updated stages
    const updatedStages = await db.userStage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
    });

    console.log(`Stages API PUT: Successfully updated stages for user ${user.id}`);
    return NextResponse.json({ stages: updatedStages });
  } catch (error) {
    console.error("Stages API PUT error:", error);
    return NextResponse.json({ error: "Failed to update stages" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get("id");

    if (!stageId) {
      return NextResponse.json({ error: "Stage ID is required" }, { status: 400 });
    }

    // First verify the stage exists and belongs to this user
    const existingStage = await db.userStage.findFirst({
      where: { id: stageId, userId: user.id },
    });

    if (!existingStage) {
      console.log(`Stages API DELETE: Stage ${stageId} not found for user ${user.id}`);
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    if (!existingStage.isEnabled) {
      console.log(`Stages API DELETE: Stage ${stageId} already disabled`);
      return NextResponse.json({ success: true, message: "Stage already disabled" });
    }

    // Disable the stage (don't delete to preserve history)
    await db.userStage.update({
      where: { id: stageId },
      data: { isEnabled: false },
    });

    console.log(`Stages API DELETE: Disabled stage ${stageId} for user ${user.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stages API DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete stage" }, { status: 500 });
  }
}
