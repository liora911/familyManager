import { upload } from "@vercel/blob/client";

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function isAllowedFile(file: File): boolean {
  return allowedTypes.includes(file.type);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export async function clientUpload(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  if (!isAllowedFile(file)) {
    return { success: false, error: "סוג קובץ לא נתמך. ניתן: PDF, JPEG, PNG, WebP" };
  }

  if (file.size > MAX_SIZE) {
    return { success: false, error: "הקובץ גדול מדי. מקסימום 10MB" };
  }

  try {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split(".").pop() || "bin";
    const filename = `${timestamp}-${rand}.${ext}`;

    const blob = await upload(filename, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });

    return { success: true, url: blob.url, filename };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "העלאה נכשלה",
    };
  }
}
