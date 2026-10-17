import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ["name", "level"];
    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field];
    }

    if (Object.keys(data).length === 1) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await db.collection("position_levels").doc(id).update(data);
    return NextResponse.json({ id, ...data });
  } catch (err) {
    console.error("Update position level error:", err);
    return NextResponse.json({ error: "Failed to update position level" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const doc = await db.collection("position_levels").doc(id).get();
    if (doc.exists && doc.data()?.isDefault) {
      return NextResponse.json(
        { error: "Default positions (Lead/Co-Lead/Associate) cannot be deleted" },
        { status: 409 },
      );
    }

    const membersUsingPosition = await db
      .collection("team_members")
      .where("positionId", "==", id)
      .limit(1)
      .get();

    if (!membersUsingPosition.empty) {
      return NextResponse.json(
        { error: "Cannot delete a position that is still assigned to members" },
        { status: 409 },
      );
    }

    await db.collection("position_levels").doc(id).delete();
    return NextResponse.json({ message: "Position deleted successfully" });
  } catch (err) {
    console.error("Delete position level error:", err);
    return NextResponse.json({ error: "Failed to delete position level" }, { status: 500 });
  }
}
