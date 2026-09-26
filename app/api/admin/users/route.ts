/**
 * GET  /api/admin/users — List all client users
 * Fetches from the `client_users` Firestore collection, ordered by creation date.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 20 : limitParam, 1), 50);

    let query: FirebaseFirestore.Query = db.collection("client_users");

    if (search) {
      // Fetch up to 50 matching or recent users for client-side search filtering
      query = query.orderBy("createdAt", "desc").limit(50);
    } else {
      query = query.orderBy("createdAt", "desc").limit(limit);
    }

    const snapshot = await query.get();

    let users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
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
      };
    });

    if (search) {
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.branch.toLowerCase().includes(search)
      ).slice(0, limit);
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch client users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
