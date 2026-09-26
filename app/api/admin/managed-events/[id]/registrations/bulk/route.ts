import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTION = "managed_events";

/**
 * POST /api/admin/managed-events/[id]/registrations/bulk — Bulk update registrations (e.g. check-in/check-out)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const regIds = Array.isArray(body.regIds) ? (body.regIds as string[]) : [];
    const isCheckedIn = body.isCheckedIn === true;

    if (regIds.length === 0) {
      return NextResponse.json(
        { error: "No registration IDs provided" },
        { status: 400 },
      );
    }

    const eventRef = db.collection(COLLECTION).doc(id);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const BATCH_SIZE = 490;
    const timestamp = isCheckedIn ? FieldValue.serverTimestamp() : null;

    for (let i = 0; i < regIds.length; i += BATCH_SIZE) {
      const chunk = regIds.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      chunk.forEach((regId) => {
        const regRef = eventRef.collection("registrations").doc(regId);
        batch.update(regRef, {
          isCheckedIn,
          checkedInAt: timestamp,
        });
      });

      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      updatedCount: regIds.length,
      isCheckedIn,
    });
  } catch (error) {
    console.error("Bulk registration update error:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk registration update" },
      { status: 500 },
    );
  }
}
