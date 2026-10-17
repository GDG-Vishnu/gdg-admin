import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";
import type { MemberHistoryEntry } from "@/lib/types/team-member";

/**
 * Moves a member to a different department (optionally a different
 * position/order too) and records the change in their history.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.deptId || typeof body.deptId !== "string") {
      return NextResponse.json({ error: "Target department is required" }, { status: 400 });
    }
    if (!body.positionId || typeof body.positionId !== "string") {
      return NextResponse.json({ error: "Position is required" }, { status: 400 });
    }
    if (!body.effectiveDate || typeof body.effectiveDate !== "string") {
      return NextResponse.json({ error: "Effective date is required" }, { status: 400 });
    }

    const memberRef = db.collection("team_members").doc(id);
    const [memberDoc, deptDoc, posDoc] = await Promise.all([
      memberRef.get(),
      db.collection("departments").doc(body.deptId).get(),
      db.collection("position_levels").doc(body.positionId).get(),
    ]);

    if (!memberDoc.exists) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (!deptDoc.exists) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    if (!posDoc.exists) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    let order = body.order;
    if (typeof order !== "number") {
      const siblingCount = await db
        .collection("team_members")
        .where("deptId", "==", body.deptId)
        .get();
      order = siblingCount.size;
    }

    const now = new Date().toISOString();
    const historyEntry: MemberHistoryEntry = {
      deptId: body.deptId,
      deptName: deptDoc.data()?.name ?? "",
      positionId: body.positionId,
      positionName: posDoc.data()?.name ?? "",
      order,
      action: "transferred",
      effectiveDate: body.effectiveDate,
      recordedAt: now,
    };

    await memberRef.update({
      deptId: body.deptId,
      positionId: body.positionId,
      order,
      history: FieldValue.arrayUnion(historyEntry),
      updatedAt: now,
    });

    return NextResponse.json({ id, ...historyEntry });
  } catch (err) {
    console.error("Transfer member error:", err);
    return NextResponse.json({ error: "Failed to transfer member" }, { status: 500 });
  }
}
