import { randomUUID } from "crypto";
import { getStorageBucketAdmin } from "@/lib/firebase-admin";
import {
  SUGGESTION_IMAGE_ALLOWED_TYPES,
  SUGGESTION_IMAGE_MAX_BYTES,
} from "@/lib/app-suggestions/rich-text";

const EXTENSION_BY_TYPE: Record<(typeof SUGGESTION_IMAGE_ALLOWED_TYPES)[number], string> =
  {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

function isFirebaseManagedStorageBucket(bucketName: string): boolean {
  return (
    bucketName.endsWith(".firebasestorage.app") ||
    bucketName.endsWith(".appspot.com")
  );
}

export async function uploadSuggestionImage(params: {
  uid: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  if (
    !SUGGESTION_IMAGE_ALLOWED_TYPES.includes(
      params.contentType as (typeof SUGGESTION_IMAGE_ALLOWED_TYPES)[number]
    )
  ) {
    throw new Error("Type d'image non supporté");
  }

  if (params.buffer.byteLength > SUGGESTION_IMAGE_MAX_BYTES) {
    throw new Error("Image trop volumineuse");
  }

  const extension =
    EXTENSION_BY_TYPE[
      params.contentType as (typeof SUGGESTION_IMAGE_ALLOWED_TYPES)[number]
    ];
  const objectPath = `app-suggestions/${params.uid}/${randomUUID()}.${extension}`;
  const bucket = getStorageBucketAdmin();
  const [bucketExists] = await bucket.exists();
  if (!bucketExists) {
    throw new Error(
      "Le bucket Storage n'existe pas. Activez Firebase Storage dans la console ou définissez FIREBASE_STORAGE_BUCKET."
    );
  }

  const file = bucket.file(objectPath);

  if (isFirebaseManagedStorageBucket(bucket.name)) {
    const downloadToken = randomUUID();
    await file.save(params.buffer, {
      metadata: {
        contentType: params.contentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });
    const encodedPath = encodeURIComponent(objectPath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;
  }

  await file.save(params.buffer, {
    metadata: {
      contentType: params.contentType,
    },
  });

  return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
}
