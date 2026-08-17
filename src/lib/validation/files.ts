/**
 * Centralized File & Media Upload Validation Utility
 * Supports accreditation documents, event media, photos, and video attachments.
 */

export const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "mp4",
  "mov",
  "avi",
] as const;

export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024, // 10 MB
  VIDEO: 100 * 1024 * 1024, // 100 MB
  DOCUMENT: 25 * 1024 * 1024, // 25 MB
  DEFAULT: 25 * 1024 * 1024, // 25 MB
} as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an uploaded file's type and size
 */
export function validateUploadedFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_FILE_EXTENSIONS.includes(extension as any)) {
    return {
      valid: false,
      error: `Unsupported file type (.${extension}). Allowed types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, PNG, WEBP, MP4, MOV, AVI.`,
    };
  }

  // Determine size limit based on MIME category
  let maxSize = MAX_FILE_SIZES.DOCUMENT;
  if (file.type.startsWith("image/")) {
    maxSize = MAX_FILE_SIZES.IMAGE;
  } else if (file.type.startsWith("video/")) {
    maxSize = MAX_FILE_SIZES.VIDEO;
  }

  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the allowed limit of ${maxMb} MB.`,
    };
  }

  return { valid: true };
}
