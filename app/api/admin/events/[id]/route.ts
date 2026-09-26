import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { normalizeEventData } from "@/lib/normalize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const docRef = db.collection("events").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(normalizeEventData({ ...doc.data(), id: doc.id }));
  } catch (err) {
    console.error("Fetch event error:", err);
    return NextResponse.json(
      { error: "Failed to fetch event" },
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

    const allowedFields = [
      "title",
      "description",
      "Date",
      "Time",
      "venue",
      "organizer",
      "coOrganizer",
      "keyHighlights",
      "tags",
      "status",
      "imageUrl",
      "coverUrl",
      "MembersParticipated",
      "isDone",
      "Theme",
      "rank",
      "eventGallery",
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

    const docRef = db.collection("events").doc(id);
    await docRef.update(data);

    return NextResponse.json({ ...data, id });
  } catch (err) {
    console.error("Update event error:", err);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const docRef = db.collection("events").doc(id);

    // Delete subcollections first (members, instructors, guests, judges, workshops, hackathons)
    const subcollections = [
      "members",
      "instructors",
      "guests",
      "judges",
      "workshops",
      "hackathons",
    ];

    for (const sub of subcollections) {
      const subSnap = await docRef.collection(sub).get();
      const batch = db.batch();
      subSnap.docs.forEach((subDoc) => batch.delete(subDoc.ref));
      if (subSnap.docs.length > 0) {
        await batch.commit();
      }
    }

    await docRef.delete();

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error("Delete event error:", err);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 },
    );
  }
}
