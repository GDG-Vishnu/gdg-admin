import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import type { TeamMember, MemberHistoryEntry } from "@/lib/types/team-member";

// Disable caching so the response always reflects the latest Firestore data
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [memberSnap, deptSnap, posSnap] = await Promise.all([
      db.collection("team_members").orderBy("name", "asc").get(),
      db.collection("departments").get(),
      db.collection("position_levels").get(),
    ]);

    const depts = new Map(deptSnap.docs.map((d) => [d.id, d.data()]));
    const positions = new Map(posSnap.docs.map((d) => [d.id, d.data()]));

    const members = memberSnap.docs.map((doc) => {
      const data = doc.data();
      const dept = depts.get(data.deptId);
      const position = positions.get(data.positionId);
      return {
        ...data,
        id: doc.id,
        deptName: dept?.name ?? null,
        deptBgColor: dept?.bgColor ?? null,
        deptLogo: dept?.logo ?? null,
        positionName: position?.name ?? null,
        positionLevel: position?.level ?? null,
      };
    });

    return NextResponse.json(members);
  } catch (err) {
    console.error("Failed to fetch team members:", err);
    return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.deptId || typeof body.deptId !== "string") {
      return NextResponse.json({ error: "Department is required" }, { status: 400 });
    }
    if (!body.positionId || typeof body.positionId !== "string") {
      return NextResponse.json({ error: "Position is required" }, { status: 400 });
    }

    const [deptDoc, posDoc] = await Promise.all([
      db.collection("departments").doc(body.deptId).get(),
      db.collection("position_levels").doc(body.positionId).get(),
    ]);
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
      action: "assigned",
      effectiveDate: typeof body.effectiveDate === "string" ? body.effectiveDate : now.slice(0, 10),
      recordedAt: now,
    };

    const data: Omit<TeamMember, "id"> = {
      name: body.name,
      imageUrl: body.imageUrl ?? "",
      logo: body.logo ?? "",
      linkedinUrl: body.linkedinUrl ?? "",
      mail: body.mail ?? "",
      isAlumni: body.isAlumni ?? false,
      deptId: body.deptId,
      positionId: body.positionId,
      order,
      history: [historyEntry],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("team_members").add(data);

    return NextResponse.json({ id: docRef.id, ...data }, { status: 201 });
  } catch (err) {
    console.error("Create member error:", err);
    return NextResponse.json({ error: "Failed to create team member" }, { status: 500 });
  }
}
