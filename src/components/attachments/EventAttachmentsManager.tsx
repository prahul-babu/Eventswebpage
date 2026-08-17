import React, { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  FileText,
  Image as ImageIcon,
  Video,
  FileSpreadsheet,
  Presentation,
  Download,
  Eye,
  Trash2,
  Upload,
  Loader2,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
  FileArchive,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useEventAttachments,
  useDeleteAttachment,
  downloadOriginalAttachment,
  uploadEventAttachmentFile,
} from "@/lib/queries/attachments";
import type { EventAttachment } from "@/types/attachment";
import type { UploadTask } from "firebase/storage";
import {
  formatFileSize,
  ATTACHMENT_CATEGORIES,
  ACCEPTED_FILE_EXTENSIONS_STRING,
  validateAttachmentFile,
  getFileCategoryInfo,
} from "@/config/file-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EventAttachmentsManagerProps {
  eventId: string;
  allowUpload?: boolean;
  title?: string;
  subtitle?: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileCategory: string;
  fileType: string;
  progress: number; // 0 - 100
  bytesTransferred: number;
  totalBytes: number;
  status: "QUEUED" | "UPLOADING" | "SUCCESS" | "FAILED" | "CANCELLED";
  errorMessage?: string;
  taskRef?: UploadTask | null;
}

export const EventAttachmentsManager: React.FC<EventAttachmentsManagerProps> = ({
  eventId,
  allowUpload = true,
  title = "Event Media & Supporting Documentation",
  subtitle = "Upload and manage original photos, videos, attendance sheets, presentations, and reports.",
}) => {
  const { role, firebaseUser, profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: attachments = [], isLoading } = useEventAttachments(eventId);
  const deleteMutation = useDeleteAttachment();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    ATTACHMENT_CATEGORIES.DOCUMENTATION
  );
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [isDragging, setIsDragging] = useState(false);

  // Active Multi-File Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  // Preview Dialog State
  const [previewAttachment, setPreviewAttachment] = useState<EventAttachment | null>(null);

  // Delete Confirmation State
  const [attachmentToDelete, setAttachmentToDelete] = useState<EventAttachment | null>(null);

  const canManage = role === "admin" || role === "faculty";

  /**
   * Start Upload for a Single Queue Item
   */
  const processUploadItem = useCallback(
    async (item: UploadQueueItem) => {
      if (!firebaseUser) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "FAILED",
                  errorMessage: "Your session has expired. Please sign in again.",
                }
              : q
          )
        );
        return;
      }

      // Mark as UPLOADING
      setUploadQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "UPLOADING", progress: 0, errorMessage: undefined }
            : q
        )
      );

      try {
        await uploadEventAttachmentFile({
          eventId,
          file: item.file,
          fileCategory: item.fileCategory,
          user: {
            uid: firebaseUser.uid,
            displayName: profile?.displayName || firebaseUser.displayName || "Campus Member",
            email: profile?.email || firebaseUser.email,
          },
          onProgress: (percent, bytesTransferred, totalBytes) => {
            setUploadQueue((prev) =>
              prev.map((q) =>
                q.id === item.id
                  ? { ...q, progress: percent, bytesTransferred, totalBytes }
                  : q
              )
            );
          },
          onTaskCreated: (task) => {
            setUploadQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, taskRef: task } : q))
            );
          },
        });

        // Upload Succeeded
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "SUCCESS", progress: 100, taskRef: null }
              : q
          )
        );

        // Auto-refresh the attachments list in real time
        queryClient.invalidateQueries({ queryKey: ["attachments", eventId] });

        toast.success("Upload Successful", {
          description: `${item.fileName} has been added to the dossier.`,
        });
      } catch (err: any) {
        console.error("[EventAttachmentsManager] Upload task failed:", err);
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "FAILED",
                  errorMessage: err.message || "Upload failed. Please try again.",
                  taskRef: null,
                }
              : q
          )
        );
      }
    },
    [eventId, firebaseUser, profile, queryClient]
  );

  /**
   * Handle Selection of Multiple Files
   */
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!firebaseUser) {
      toast.error("Authentication Required", {
        description: "Your session has expired. Please sign in again before uploading.",
      });
      return;
    }

    const newItems: UploadQueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateAttachmentFile(file);
      const fileInfo = getFileCategoryInfo(file.name, file.type);
      const queueId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const item: UploadQueueItem = {
        id: queueId,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileCategory: selectedCategory,
        fileType: fileInfo.category,
        progress: 0,
        bytesTransferred: 0,
        totalBytes: file.size,
        status: validation.valid ? "QUEUED" : "FAILED",
        errorMessage: validation.valid ? undefined : validation.error,
      };

      newItems.push(item);
    }

    setUploadQueue((prev) => [...newItems, ...prev]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Trigger upload for valid queued items
    newItems.forEach((item) => {
      if (item.status === "QUEUED") {
        processUploadItem(item);
      }
    });
  };

  /**
   * Retry a Failed Upload
   */
  const handleRetryUpload = (itemId: string) => {
    const item = uploadQueue.find((q) => q.id === itemId);
    if (item) {
      processUploadItem(item);
    }
  };

  /**
   * Cancel an Active Upload Task
   */
  const handleCancelUpload = (itemId: string) => {
    const item = uploadQueue.find((q) => q.id === itemId);
    if (item && item.taskRef) {
      item.taskRef.cancel();
    }
    setUploadQueue((prev) =>
      prev.map((q) =>
        q.id === itemId
          ? { ...q, status: "CANCELLED", errorMessage: "Upload was cancelled." }
          : q
      )
    );
  };

  /**
   * Dismiss Item from Queue
   */
  const handleDismissQueueItem = (itemId: string) => {
    setUploadQueue((prev) => prev.filter((q) => q.id !== itemId));
  };

  /**
   * Drag & Drop Event Handlers
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  /**
   * Confirm Delete Handler
   */
  const handleConfirmDelete = async () => {
    if (!attachmentToDelete) return;
    try {
      await deleteMutation.mutateAsync({
        eventId,
        attachmentId: attachmentToDelete.id,
        storagePath: attachmentToDelete.storagePath,
        fileName: attachmentToDelete.fileName,
      });
      setAttachmentToDelete(null);
    } catch {
      // Handled in mutation toast
    }
  };

  // Helper for rendering file category badge and icon
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return <ImageIcon className="w-5 h-5 text-cyan-600 shrink-0" />;
      case "video":
        return <Video className="w-5 h-5 text-indigo-600 shrink-0" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-rose-600 shrink-0" />;
      case "word":
        return <FileText className="w-5 h-5 text-blue-600 shrink-0" />;
      case "excel":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
      case "powerpoint":
        return <Presentation className="w-5 h-5 text-amber-600 shrink-0" />;
      case "other":
        return <FileArchive className="w-5 h-5 text-purple-600 shrink-0" />;
      default:
        return <Paperclip className="w-5 h-5 text-slate-600 shrink-0" />;
    }
  };

  const filteredAttachments = attachments.filter((att) => {
    if (filterCategory === "ALL") return true;
    return att.fileCategory === filterCategory;
  });

  const isAnyUploading = uploadQueue.some((q) => q.status === "UPLOADING");

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-[#004D61]" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {canManage && allowUpload && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileSelect(e.target.files)}
              accept={ACCEPTED_FILE_EXTENSIONS_STRING}
              multiple
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              disabled={isAnyUploading}
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#004D61] hover:bg-[#003847] text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-xs"
            >
              {isAnyUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading Files...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Files</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Upload Drag & Drop Area */}
      {canManage && allowUpload && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>Default Category for Next Upload:</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#007A99]"
            >
              {Object.values(ATTACHMENT_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer bg-slate-50/70 ${
              isDragging
                ? "border-[#007A99] bg-[#E0F3F7]/40 scale-[0.99]"
                : "border-slate-300 hover:border-[#007A99] hover:bg-slate-50"
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E0F3F7] flex items-center justify-center text-[#007A99]">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  Drag and drop files here, or <span className="text-[#007A99] underline">browse from your computer</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Supports PDF, Word, Excel, PPT, TXT, ZIP, JPEG, PNG, WEBP, MP4, MOV (Up to 100 MB for videos, 50 MB for documents)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE UPLOAD QUEUE PROGRESS CARD */}
      {uploadQueue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#007A99]" />
              <span>Upload Queue ({uploadQueue.length} {uploadQueue.length === 1 ? "file" : "files"})</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUploadQueue((prev) => prev.filter((q) => q.status === "UPLOADING"))}
              className="text-[11px] h-7 text-slate-500 hover:text-slate-800"
            >
              Clear Completed
            </Button>
          </div>

          <div className="space-y-2">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(item.fileType)}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.fileName}</p>
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(item.fileSize)} &bull; {item.fileCategory}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "UPLOADING" && (
                      <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        <span>Uploading {item.progress}%</span>
                      </Badge>
                    )}

                    {item.status === "SUCCESS" && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                        <span>Uploaded successfully ✓</span>
                      </Badge>
                    )}

                    {item.status === "FAILED" && (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                        <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
                        <span>Upload failed</span>
                      </Badge>
                    )}

                    {item.status === "CANCELLED" && (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold">
                        Cancelled
                      </Badge>
                    )}

                    {/* Action buttons */}
                    {item.status === "UPLOADING" && (
                      <button
                        type="button"
                        onClick={() => handleCancelUpload(item.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 p-1 font-bold"
                        title="Cancel upload"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {item.status === "FAILED" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetryUpload(item.id)}
                        className="h-7 text-[11px] font-bold px-2 rounded-lg gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </Button>
                    )}

                    {(item.status === "SUCCESS" || item.status === "FAILED" || item.status === "CANCELLED") && (
                      <button
                        type="button"
                        onClick={() => handleDismissQueueItem(item.id)}
                        className="text-slate-400 hover:text-slate-700 p-1"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar during active upload */}
                {item.status === "UPLOADING" && (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#007A99] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, item.progress)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>{formatFileSize(item.bytesTransferred)} / {formatFileSize(item.totalBytes)}</span>
                      <span>{item.progress}%</span>
                    </div>
                  </div>
                )}

                {/* Error message detail */}
                {item.status === "FAILED" && item.errorMessage && (
                  <p className="text-[11px] text-rose-600 font-medium bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                    {item.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterCategory("ALL")}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 ${
            filterCategory === "ALL"
              ? "bg-[#004D61] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All ({attachments.length})
        </button>
        {Object.values(ATTACHMENT_CATEGORIES).map((cat) => {
          const count = attachments.filter((a) => a.fileCategory === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                filterCategory === cat
                  ? "bg-[#004D61] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{cat}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* ATTACHMENTS LISTING */}
      {isLoading ? (
        <div className="p-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#007A99]" />
          <p className="text-xs text-slate-500 font-medium">Loading event documentation...</p>
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2.5">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
          <p className="text-xs font-bold text-slate-700">No Attachments in this Category</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            {canManage && allowUpload
              ? "Drag and drop documents or click 'Upload Files' above to add photos, videos, reports, or spreadsheets."
              : "No documentation has been uploaded yet for this event."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredAttachments.map((att) => {
            const isImage = att.fileType === "image";
            return (
              <Card
                key={att.id}
                className="overflow-hidden border border-slate-200/90 rounded-2xl hover:shadow-md transition-shadow group flex flex-col justify-between"
              >
                {/* Image Thumbnail Preview (if image) */}
                {isImage && att.downloadUrl && (
                  <div
                    onClick={() => setPreviewAttachment(att)}
                    className="h-32 w-full bg-slate-100 overflow-hidden cursor-pointer relative group/img border-b border-slate-100"
                  >
                    <img
                      src={att.downloadUrl}
                      alt={att.fileName}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    {!isImage && getFileIcon(att.fileType)}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate" title={att.fileName}>
                        {att.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(att.fileSize)} &bull; {format(new Date(att.uploadedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-500 font-medium truncate max-w-[140px]" title={att.fileCategory}>
                      {att.fileCategory || "General Document"}
                    </span>
                    <span className="text-slate-400 truncate max-w-[100px]" title={att.uploadedByName}>
                      by {att.uploadedByName?.split(" ")[0] || "Faculty"}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isImage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewAttachment(att)}
                        className="h-7 px-2 text-[11px] text-slate-700 font-bold rounded-lg"
                      >
                        <Eye className="w-3 h-3 mr-1 text-slate-500" />
                        <span>View</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadOriginalAttachment(att)}
                      className="h-7 px-2 text-[11px] text-[#007A99] font-bold rounded-lg hover:text-[#004D61] hover:bg-[#E0F3F7]/50"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      <span>Download</span>
                    </Button>
                  </div>

                  {canManage && allowUpload && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachmentToDelete(att)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* IMAGE PREVIEW MODAL */}
      <Dialog open={Boolean(previewAttachment)} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl bg-black border-slate-800 text-white">
          <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-bold text-white truncate max-w-lg">
                {previewAttachment?.fileName}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400">
                {previewAttachment?.fileCategory} &bull; {formatFileSize(previewAttachment?.fileSize)}
              </DialogDescription>
            </div>
            {previewAttachment && (
              <Button
                type="button"
                size="sm"
                onClick={() => downloadOriginalAttachment(previewAttachment)}
                className="bg-[#007A99] hover:bg-[#006078] text-white rounded-xl text-xs h-8 font-bold gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </Button>
            )}
          </DialogHeader>
          <div className="p-4 flex items-center justify-center max-h-[70vh] overflow-auto">
            {previewAttachment?.downloadUrl && (
              <img
                src={previewAttachment.downloadUrl}
                alt={previewAttachment.fileName}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(attachmentToDelete)} onOpenChange={(open) => !open && setAttachmentToDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete Attachment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently remove{" "}
              <strong className="text-slate-800">{attachmentToDelete?.fileName}</strong> from the event documentation
              dossier? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAttachmentToDelete(null)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold gap-1.5"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  <span>Confirm Delete</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
