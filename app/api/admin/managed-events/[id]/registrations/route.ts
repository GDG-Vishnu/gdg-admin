import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTION = "managed_events";

/** Convert a Firestore Timestamp (or serialised {_seconds}) to an ISO string. */
function tsToISO(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if ("toDate" in (value as any) && typeof (value as any).toDate === "function") {
      return (value as any).toDate().toISOString();
    }
    const secs = (value as any)._seconds ?? (value as any).seconds;
    if (typeof secs === "number") return new Date(secs * 1000).toISOString();
  }
  return null;
}

/**
 * GET /api/admin/managed-events/[id]/registrations — List registrations with pagination & filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
    const limitParam = parseInt(searchParams.get("limit") ?? "25", 10);
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = Math.min(Math.max(isNaN(limitParam) ? 25 : limitParam, 1), 50);

    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const typeFilter = searchParams.get("type"); // "Individual" | "Team"
    const checkInFilter = searchParams.get("checkedIn"); // "true" | "false"
    const isAllRequested = searchParams.get("all") === "true";

    const eventDoc = await db.collection(COLLECTION).doc(id).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const regsRef = db.collection(COLLECTION).doc(id).collection("registrations");

    // Total count aggregation (1 index entry read)
    const countSnap = await regsRef.count().get();
    const totalRegistrations = countSnap.data().count;

    let snapshot: FirebaseFirestore.QuerySnapshot;

    if (isAllRequested) {
      // Legacy export/bulk support (capped at 500 max)
      snapshot = await regsRef.orderBy("registeredAt", "desc").limit(500).get();
    } else {
      snapshot = await regsRef.orderBy("registeredAt", "desc").get();
    }

    let allMapped = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        regId: doc.id,
        userId: data.userId || "",
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        branch: data.branch || "Unknown",
        registrationType: data.registrationType || "Individual",
        registeredAt: tsToISO(data.registeredAt),
        isCheckedIn: data.isCheckedIn === true,
        checkedInAt: tsToISO(data.checkedInAt),
      };
    });

    // In-memory filter for search / type / check-in across total event registrations
    if (search) {
      allMapped = allMapped.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.email.toLowerCase().includes(search) ||
          r.phone.includes(search) ||
          r.branch.toLowerCase().includes(search)
      );
    }
    if (typeFilter && (typeFilter === "Individual" || typeFilter === "Team")) {
      allMapped = allMapped.filter((r) => r.registrationType === typeFilter);
    }
    if (checkInFilter === "true" || checkInFilter === "false") {
      const targetChecked = checkInFilter === "true";
      allMapped = allMapped.filter((r) => r.isCheckedIn === targetChecked);
    }

    const filteredTotal = allMapped.length;
    const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));
    const safePage = Math.min(page, totalPages);
    const paginatedItems = isAllRequested
      ? allMapped
      : allMapped.slice((safePage - 1) * limit, safePage * limit);

    return NextResponse.json({
      data: paginatedItems,
      pagination: {
        page: safePage,
        limit,
        totalItems: filteredTotal,
        totalPages,
        hasMore: safePage < totalPages,
      },
      stats: {
        totalRegistrations,
        checkedInCount: allMapped.filter((r) => r.isCheckedIn).length,
        individualCount: allMapped.filter((r) => r.registrationType === "Individual").length,
        teamCount: allMapped.filter((r) => r.registrationType === "Team").length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/managed-events/[id]/registrations — Atomic member registration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const userId = String(body.userId ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const registrationType = body.registrationType === "Team" ? "Team" : "Individual";
    const branch = String(body.branch ?? "").trim() || "Unknown";

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    // Deterministic document ID to prevent duplicate registrations atomically
    const sanitizedEmail = email.replace(/[^a-z0-9]/g, "_");
    const docId = userId ? `user_${userId}` : `email_${sanitizedEmail}`;

    const nowIso = new Date().toISOString();
    const regRef = db.collection(COLLECTION).doc(id).collection("registrations").doc(docId);
    const eventRef = db.collection(COLLECTION).doc(id);

    // Atomic transaction for registration & duplicate prevention (0 extra reads)
    await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) {
        throw new Error("EVENT_NOT_FOUND");
      }

      const regDoc = await transaction.get(regRef);
      if (regDoc.exists) {
        throw new Error("ALREADY_REGISTERED");
      }

      const regData = {
        userId,
        name,
        email,
        phone,
        branch,
        registrationType,
        registeredAt: FieldValue.serverTimestamp(),
        isCheckedIn: false,
        checkedInAt: null,
      };

      transaction.set(regRef, regData);
    });

    // Return created payload directly without performing a post-write .get() read
    return NextResponse.json(
      {
        regId: docId,
        userId,
        name,
        email,
        phone,
        branch,
        registrationType,
        registeredAt: nowIso,
        isCheckedIn: false,
        checkedInAt: null,
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error?.message === "EVENT_NOT_FOUND") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (error?.message === "ALREADY_REGISTERED") {
      return NextResponse.json(
        { error: "User is already registered for this event" },
        { status: 409 },
      );
    }
    console.error("Failed to register member:", error);
    return NextResponse.json(
      { error: "Failed to register member" },
      { status: 500 },
    );
  }
}
