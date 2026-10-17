import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ["name", "order", "logo", "bgColor", "isActive"];
    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field];
    }

    if (Object.keys(data).length === 1) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await db.collection("departments").doc(id).update(data);
    return NextResponse.json({ id, ...data });
  } catch (err) {
    console.error("Update department error:", err);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const membersUsingDept = await db
      .collection("team_members")
      .where("deptId", "==", id)
      .limit(1)
      .get();

    if (!membersUsingDept.empty) {
      return NextResponse.json(
        { error: "Cannot delete a department that still has members. Move them first." },
        { status: 409 },
      );
    }

    await db.collection("departments").doc(id).delete();
    return NextResponse.json({ message: "Department deleted successfully" });
  } catch (err) {
    console.error("Delete department error:", err);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}
