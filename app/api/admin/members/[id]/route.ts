import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Basic profile fields only. Department/position changes must go through
    // the transfer/promote endpoints so every change is recorded in history.
    const allowedFields = ["name", "imageUrl", "logo", "linkedinUrl", "mail", "isAlumni"];

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 1) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const docRef = db.collection("team_members").doc(id);
    await docRef.update(data);

    return NextResponse.json({ id, ...data });
  } catch (err: unknown) {
    console.error("Update member error:", err);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const docRef = db.collection("team_members").doc(id);
    await docRef.delete();

    return NextResponse.json({ message: "Member deleted successfully" });
  } catch (err: unknown) {
    console.error("Delete member error:", err);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
