import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { AppSuggestionRecord } from "@/lib/app-suggestions/types";
import { defaultVisibilityForKind } from "@/lib/app-suggestions/visibility";

const COLLECTION = "appSuggestions";

function suggestionsCollection(db: Firestore) {
  return db.collection(COLLECTION);
}

export async function setSuggestionHidden(
  db: Firestore,
  suggestionId: string,
  hidden: boolean,
  actorUid: string
): Promise<boolean> {
  const docRef = suggestionsCollection(db).doc(suggestionId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return false;
  }

  const current = docSnap.data() as AppSuggestionRecord;
  if (hidden) {
    await docRef.update({
      visibility: "hidden",
      hiddenAt: FieldValue.serverTimestamp(),
      hiddenByUid: actorUid,
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
    });
    return true;
  }

  const restoredVisibility = defaultVisibilityForKind(
    current.kind === "problem" ? "problem" : "improvement"
  );
  await docRef.update({
    visibility: restoredVisibility,
    hiddenAt: null,
    hiddenByUid: null,
    updatedAt: FieldValue.serverTimestamp(),
    lastActivityAt: FieldValue.serverTimestamp(),
  });
  return true;
}

export async function setSuggestionCommentHidden(
  db: Firestore,
  suggestionId: string,
  commentId: string,
  hidden: boolean,
  actorUid: string
): Promise<boolean> {
  const commentRef = suggestionsCollection(db)
    .doc(suggestionId)
    .collection("comments")
    .doc(commentId);
  const commentSnap = await commentRef.get();
  if (!commentSnap.exists) {
    return false;
  }

  if (hidden) {
    await commentRef.update({
      hiddenAt: FieldValue.serverTimestamp(),
      hiddenByUid: actorUid,
    });
  } else {
    await commentRef.update({
      hiddenAt: null,
      hiddenByUid: null,
    });
  }

  await suggestionsCollection(db).doc(suggestionId).update({
    updatedAt: FieldValue.serverTimestamp(),
    lastActivityAt: FieldValue.serverTimestamp(),
  });
  return true;
}
