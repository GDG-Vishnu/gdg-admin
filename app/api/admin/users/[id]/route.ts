/**
 * GET   /api/admin/users/[id] — Fetch a single client user by ID
 * PATCH /api/admin/users/[id] — Toggle block/unblock a user
 * DELETE /api/admin/users/[id] — Delete a user from client_users
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const docRef = db.collection("client_users").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      name: data.name || "",
      email: data.email || "",
      profileUrl: data.profileUrl || "",
      resumeUrl: data.resumeUrl || "",
      phoneNumber: data.phoneNumber || "",
      branch: data.branch || "",
      graduationYear: data.graduationYear || null,
      role: data.role || "user",
      isBlocked: data.isBlocked || false,
      profileCompleted: data.profileCompleted || false,
      participations: Array.isArray(data.participations)
        ? data.participations
        : [],
      socialMedia: data.socialMedia || {},
      createdAt: data.createdAt?._seconds
        ? new Date(data.createdAt._seconds * 1000).toISOString()
        : data.createdAt || null,
      updatedAt: data.updatedAt?._seconds
        ? new Date(data.updatedAt._seconds * 1000).toISOString()
        : data.updatedAt || null,
    });
  } catch (err: unknown) {
    console.error("Fetch user error:", err);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ["isBlocked", "role"];

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

    const docRef = db.collection("client_users").doc(id);
    await docRef.update(data);

    return NextResponse.json({ id, ...data });
  } catch (err: unknown) {
    console.error("Update user error:", err);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const docRef = db.collection("client_users").doc(id);
    await docRef.delete();
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (err: unknown) {
    console.error("Delete user error:", err);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}
