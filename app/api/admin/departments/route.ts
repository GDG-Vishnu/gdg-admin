import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import type { Department } from "@/lib/types/department";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unspecified"
  );
}

export async function GET() {
  try {
    const snapshot = await db.collection("departments").orderBy("order", "asc").get();
    const departments = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    return NextResponse.json(departments);
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = slugify(body.name);
    const existing = await db.collection("departments").doc(id).get();
    if (existing.exists) {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 409 },
      );
    }

    let order = body.order;
    if (typeof order !== "number") {
      const countSnap = await db.collection("departments").get();
      order = countSnap.size;
    }

    const now = new Date().toISOString();
    const data: Omit<Department, "id"> = {
      name: body.name,
      order,
      logo: body.logo ?? "",
      bgColor: body.bgColor ?? "",
      isActive: body.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("departments").doc(id).set(data);

    return NextResponse.json({ id, ...data }, { status: 201 });
  } catch (err) {
    console.error("Create department error:", err);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}
