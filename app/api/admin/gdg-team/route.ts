import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

const COLLECTION = "managed_gdg_team";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/gdg-team — List all GDG team members
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // optional filter

    let query: FirebaseFirestore.Query = db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc");

    if (status && ["pending", "approved", "rejected", "revoked"].includes(status)) {
      query = query.where("authorizationStatus", "==", status);
    }

    const snapshot = await query.get();

    const members = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(members);
  } catch (error) {
    console.error("Failed to fetch GDG team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch GDG team members" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/gdg-team — Create a new GDG team member (admin action)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    const data = {
      userId: body.userId ?? "",
      name: body.name,
      email: body.email,
      profilePicture: body.profilePicture ?? "",
      accessLevel: body.accessLevel ?? "member",
      authorizationStatus: body.authorizationStatus ?? "approved",
      position: body.position ?? "",
      designation: body.designation ?? "",
      approvedAt: new Date().toISOString(),
      approvedBy: body.approvedBy ?? null,
      revokedAt: null,
      revokedBy: null,
      revokedReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection(COLLECTION).add(data);

    return NextResponse.json(
      { id: docRef.id, ...data },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create GDG team member:", error);
    return NextResponse.json(
      { error: "Failed to create GDG team member" },
      { status: 500 },
    );
  }
}
