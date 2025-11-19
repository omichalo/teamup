import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function GET() {
  try {
    const locationsRef = adminDb.collection("locations");
    const snapshot = await locationsRef.orderBy("name", "asc").get();

    const locations = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, locations });
  } catch (error) {
    console.error("[locations] GET error", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des lieux" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Le nom du lieu est requis" },
        { status: 400 }
      );
    }

    const locationsRef = adminDb.collection("locations");
    const now = new Date();
    
    // Vérifier si le lieu existe déjà
    const existingSnapshot = await locationsRef
      .where("name", "==", name.trim())
      .get();
    
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Ce lieu existe déjà" },
        { status: 400 }
      );
    }

    const docRef = await locationsRef.add({
      name: name.trim(),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    return NextResponse.json({
      success: true,
      location: {
        id: docRef.id,
        name: name.trim(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[locations] POST error", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'ajout du lieu" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "L'ID du lieu est requis" },
        { status: 400 }
      );
    }

    const locationRef = adminDb.collection("locations").doc(id);
    await locationRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[locations] DELETE error", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la suppression du lieu" },
      { status: 500 }
    );
  }
}

