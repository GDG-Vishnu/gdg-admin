import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";
import type { MemberHistoryEntry } from "@/lib/types/team-member";

/**
 * Promotes a member to a higher position level within their current
 * department. The target position must have a strictly lower `level`
 * (lower number = higher rank) than the member's current position.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.positionId || typeof body.positionId !== "string") {
      return NextResponse.json({ error: "New position is required" }, { status: 400 });
    }
    if (!body.effectiveDate || typeof body.effectiveDate !== "string") {
      return NextResponse.json({ error: "Promotion date is required" }, { status: 400 });
    }

    const memberRef = db.collection("team_members").doc(id);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const member = memberDoc.data()!;

    const [currentPosDoc, newPosDoc, deptDoc] = await Promise.all([
      db.collection("position_levels").doc(member.positionId).get(),
      db.collection("position_levels").doc(body.positionId).get(),
      db.collection("departments").doc(member.deptId).get(),
    ]);

    if (!newPosDoc.exists) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    const currentLevel = currentPosDoc.data()?.level ?? Infinity;
    const newLevel = newPosDoc.data()?.level;

    if (typeof newLevel !== "number" || newLevel >= currentLevel) {
      return NextResponse.json(
        { error: "New position must be a higher level than the member's current position" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const historyEntry: MemberHistoryEntry = {
      deptId: member.deptId,
      deptName: deptDoc.data()?.name ?? "",
      positionId: body.positionId,
      positionName: newPosDoc.data()?.name ?? "",
      order: member.order,
      action: "promoted",
      effectiveDate: body.effectiveDate,
      recordedAt: now,
    };

    await memberRef.update({
      positionId: body.positionId,
      history: FieldValue.arrayUnion(historyEntry),
      updatedAt: now,
    });

    return NextResponse.json({ id, ...historyEntry });
  } catch (err) {
    console.error("Promote member error:", err);
    return NextResponse.json({ error: "Failed to promote member" }, { status: 500 });
  }
}
