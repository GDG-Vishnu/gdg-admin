import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  try {
    const formsSnapshot = await db
      .collection("forms")
      .orderBy("createdAt", "desc")
      .get();

    // For each form, run a count() aggregation on form_responses
    // to get the response count without downloading all response docs.
    const forms = await Promise.all(
      formsSnapshot.docs.map(async (doc) => {
        const responsesSnapshot = await db
          .collection("form_responses")
          .where("formId", "==", doc.id)
          .count()
          .get();

        return {
          id: doc.id,
          ...doc.data(),
          responseCount: responsesSnapshot.data().count,
        };
      }),
    );

    return NextResponse.json(forms);
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json(
      { error: "Failed to fetch forms" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, fields, steps, isActive } = body;

    if (!title || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: "Title and fields are required" },
        { status: 400 },
      );
    }

    const now = FieldValue.serverTimestamp();
    const docRef = await db.collection("forms").add({
      title,
      description: description || "",
      fields,
      steps: steps || null,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      { id: docRef.id, title, description: description || "", fields, steps: steps || null, isActive: isActive !== undefined ? isActive : true },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating form:", error);
    return NextResponse.json(
      { error: "Failed to create form" },
      { status: 500 },
    );
  }
}
