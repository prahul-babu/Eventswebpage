/**
 * Centralized File Type & Storage Configuration
 * The Apollo University — School of Technology — B.Tech Event Hub
 */

export interface FileTypeConfig {
  label: string;
  category: "image" | "video" | "pdf" | "word" | "excel" | "powerpoint" | "document" | "other";
  extensions: string[];
  mimeTypes: string[];
  maxSizeBytes: number;
}

export const ATTACHMENT_CATEGORIES = {
  PHOTOS: "Photos & Media Highlights",
  VIDEOS: "Video Recordings",
  ATTENDANCE: "Attendance & Gate Logs",
  SCHEDULES: "Event Schedule & Brochure",
  FINANCIALS: "Receipts & Expense Invoices",
  PRESENTATIONS: "Presentations & Slides",
  DOCUMENTATION: "General Documentation",
} as const;

export const SUPPORTED_FILE_TYPES: FileTypeConfig[] = [
  // Images
  {
    label: "JPEG / JPG Image",
    category: "image",
    extensions: [".jpg", ".jpeg"],
    mimeTypes: ["image/jpeg", "image/pjpeg"],
    maxSizeBytes: 25 * 1024 * 1024, // 25 MB
  },
  {
    label: "PNG Image",
    category: "image",
    extensions: [".png"],
    mimeTypes: ["image/png"],
    maxSizeBytes: 25 * 1024 * 1024,
  },
  {
    label: "WEBP Image",
    category: "image",
    extensions: [".webp"],
    mimeTypes: ["image/webp"],
    maxSizeBytes: 25 * 1024 * 1024,
  },
  {
    label: "GIF Image",
    category: "image",
    extensions: [".gif"],
    mimeTypes: ["image/gif"],
    maxSizeBytes: 25 * 1024 * 1024,
  },

  // Videos
  {
    label: "MP4 Video",
    category: "video",
    extensions: [".mp4"],
    mimeTypes: ["video/mp4"],
    maxSizeBytes: 100 * 1024 * 1024, // 100 MB
  },
  {
    label: "MOV Video",
    category: "video",
    extensions: [".mov"],
    mimeTypes: ["video/quicktime"],
    maxSizeBytes: 100 * 1024 * 1024,
  },
  {
    label: "WEBM Video",
    category: "video",
    extensions: [".webm"],
    mimeTypes: ["video/webm"],
    maxSizeBytes: 100 * 1024 * 1024,
  },
  {
    label: "AVI Video",
    category: "video",
    extensions: [".avi"],
    mimeTypes: ["video/x-msvideo", "video/avi"],
    maxSizeBytes: 100 * 1024 * 1024,
  },

  // Documents
  {
    label: "PDF Document",
    category: "pdf",
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
    maxSizeBytes: 50 * 1024 * 1024, // 50 MB
  },
  {
    label: "Microsoft Word (DOCX)",
    category: "word",
    extensions: [".docx"],
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    maxSizeBytes: 50 * 1024 * 1024,
  },
  {
    label: "Microsoft Word (DOC)",
    category: "word",
    extensions: [".doc"],
    mimeTypes: ["application/msword"],
    maxSizeBytes: 50 * 1024 * 1024,
  },
  {
    label: "Microsoft Excel (XLSX)",
    category: "excel",
    extensions: [".xlsx"],
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    maxSizeBytes: 50 * 1024 * 1024,
  },
  {
    label: "Microsoft Excel (XLS)",
    category: "excel",
    extensions: [".xls"],
    mimeTypes: ["application/vnd.ms-excel"],
    maxSizeBytes: 50 * 1024 * 1024,
  },
  {
    label: "Microsoft PowerPoint (PPTX)",
    category: "powerpoint",
    extensions: [".pptx"],
    mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    maxSizeBytes: 50 * 1024 * 1024,
  },
  {
    label: "Microsoft PowerPoint (PPT)",
    category: "powerpoint",
    extensions: [".ppt"],
    mimeTypes: ["application/vnd.ms-powerpoint"],
    maxSizeBytes: 50 * 1024 * 1024,
  },
  {
    label: "Text File (TXT)",
    category: "document",
    extensions: [".txt"],
    mimeTypes: ["text/plain"],
    maxSizeBytes: 20 * 1024 * 1024,
  },
  {
    label: "CSV Spreadsheet",
    category: "excel",
    extensions: [".csv"],
    mimeTypes: ["text/csv", "application/csv"],
    maxSizeBytes: 25 * 1024 * 1024,
  },
  {
    label: "ZIP Archive",
    category: "other",
    extensions: [".zip"],
    mimeTypes: ["application/zip", "application/x-zip-compressed"],
    maxSizeBytes: 100 * 1024 * 1024,
  },
];

export const ACCEPTED_FILE_EXTENSIONS_STRING = SUPPORTED_FILE_TYPES.flatMap((t) => t.extensions).join(",");

/**
 * Determine file category and info from filename and MIME type
 */
export function getFileCategoryInfo(fileName: string, mimeType?: string) {
  const ext = "." + (fileName.split(".").pop() || "").toLowerCase();

  const match = SUPPORTED_FILE_TYPES.find(
    (t) => t.extensions.includes(ext) || (mimeType && t.mimeTypes.includes(mimeType))
  );

  if (match) {
    return {
      category: match.category,
      label: match.label,
      maxSizeBytes: match.maxSizeBytes,
    };
  }

  // Fallbacks
  if (mimeType?.startsWith("image/")) {
    return { category: "image" as const, label: "Image File", maxSizeBytes: 25 * 1024 * 1024 };
  }
  if (mimeType?.startsWith("video/")) {
    return { category: "video" as const, label: "Video File", maxSizeBytes: 100 * 1024 * 1024 };
  }
  if (mimeType === "application/pdf" || ext === ".pdf") {
    return { category: "pdf" as const, label: "PDF Document", maxSizeBytes: 50 * 1024 * 1024 };
  }
  if (ext === ".docx" || ext === ".doc") {
    return { category: "word" as const, label: "Word Document", maxSizeBytes: 50 * 1024 * 1024 };
  }
  if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
    return { category: "excel" as const, label: "Spreadsheet", maxSizeBytes: 50 * 1024 * 1024 };
  }
  if (ext === ".pptx" || ext === ".ppt") {
    return { category: "powerpoint" as const, label: "Presentation", maxSizeBytes: 50 * 1024 * 1024 };
  }

  return {
    category: "other" as const,
    label: ext ? `${ext.toUpperCase()} File` : "Document",
    maxSizeBytes: 50 * 1024 * 1024,
  };
}

/**
 * Validate a file against allowable size & type constraints
 */
export function validateAttachmentFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  const { label, maxSizeBytes } = getFileCategoryInfo(file.name, file.type);

  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    const fileMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds the allowed limit for ${label}. File is ${fileMb} MB, but maximum allowed is ${maxMb} MB.`,
    };
  }

  return { valid: true };
}

/**
 * Format bytes to readable human format (KB, MB, GB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Sanitize filename to avoid filesystem or download header issues
 */
export function sanitizeDownloadFileName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");
}
