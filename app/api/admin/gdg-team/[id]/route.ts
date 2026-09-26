import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

const COLLECTION = "managed_gdg_team";

/**
 * GET /api/admin/gdg-team/[id] — Get a single team member
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Failed to fetch GDG team member:", error);
    return NextResponse.json(
      { error: "Failed to fetch GDG team member" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/gdg-team/[id] — Update a team member
 * Handles: approve, reject, revoke, update profile, update role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const docRef = db.collection(COLLECTION).doc(id);

    const allowedFields = [
      "name",
      "email",
      "profilePicture",
      "accessLevel",
      "authorizationStatus",
      "position",
      "designation",
      "approvedAt",
      "approvedBy",
      "revokedAt",
      "revokedBy",
      "revokedReason",
      "rejectedAt",
      "rejectedBy",
      "rejectedReason",
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    data.updatedAt = new Date().toISOString();

    await docRef.update(data);

    return NextResponse.json({ id, ...data });
  } catch (error) {
    console.error("Failed to update GDG team member:", error);
    return NextResponse.json(
      { error: "Failed to update GDG team member" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/gdg-team/[id] — Delete a team member
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const docRef = db.collection(COLLECTION).doc(id);
    await docRef.delete();

    return NextResponse.json({ message: "Member deleted successfully" });
  } catch (error) {
    console.error("Failed to delete GDG team member:", error);
    return NextResponse.json(
      { error: "Failed to delete GDG team member" },
      { status: 500 },
    );
  }
}
