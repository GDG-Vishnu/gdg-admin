import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import type { PositionLevel } from "@/lib/types/position-level";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "position"
  );
}

export async function GET() {
  try {
    const snapshot = await db.collection("position_levels").orderBy("level", "asc").get();
    const positions = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    return NextResponse.json(positions);
  } catch (err) {
    console.error("Failed to fetch position levels:", err);
    return NextResponse.json({ error: "Failed to fetch position levels" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = slugify(body.name);
    const existing = await db.collection("position_levels").doc(id).get();
    if (existing.exists) {
      return NextResponse.json(
        { error: "A position with this name already exists" },
        { status: 409 },
      );
    }

    let level = body.level;
    if (typeof level !== "number") {
      const countSnap = await db.collection("position_levels").get();
      level = countSnap.size + 1;
    }

    const now = new Date().toISOString();
    const data: Omit<PositionLevel, "id"> = {
      name: body.name,
      level,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("position_levels").doc(id).set(data);

    return NextResponse.json({ id, ...data }, { status: 201 });
  } catch (err) {
    console.error("Create position level error:", err);
    return NextResponse.json({ error: "Failed to create position level" }, { status: 500 });
  }
}
