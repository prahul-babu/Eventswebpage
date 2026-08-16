import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useEventAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  downloadOriginalAttachment,
} from "@/lib/queries/attachments";
import type { EventAttachment } from "@/types/attachment";
import {
  formatFileSize,
  ATTACHMENT_CATEGORIES,
  ACCEPTED_FILE_EXTENSIONS_STRING,
  validateAttachmentFile,
} from "@/config/file-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface EventAttachmentsManagerProps {
  eventId: string;
  allowUpload?: boolean;
  title?: string;
  subtitle?: string;
}

export const EventAttachmentsManager: React.FC<EventAttachmentsManagerProps> = ({
  eventId,
  allowUpload = true,
  title = "Event Documentation & Attachments",
  subtitle = "Original uploaded files, media highlights, attendance sheets, and presentations.",
}) => {
  const { role, firebaseUser, profile } = useAuth();
  const { data: attachments = [], isLoading } = useEventAttachments(eventId);
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    ATTACHMENT_CATEGORIES.DOCUMENTATION
  );
  const [isDragging, setIsDragging] = useState(false);

  // Preview Dialog State
  const [previewAttachment, setPreviewAttachment] = useState<EventAttachment | null>(null);

  // Delete Confirmation State
  const [attachmentToDelete, setAttachmentToDelete] = useState<EventAttachment | null>(null);

  const canManage = role === "admin" || role === "faculty";

  // Handle File Input Change
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !firebaseUser) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate
      const validation = validateAttachmentFile(file);
      if (!validation.valid) {
        toast.error("File Validation Notice", {
          description: validation.error,
        });
        continue;
      }

      try {
        await uploadMutation.mutateAsync({
          eventId,
          file,
          fileCategory: selectedCategory,
          user: {
            uid: firebaseUser.uid,
            displayName: profile?.displayName || firebaseUser.displayName || "Campus Organiser",
            email: profile?.email || firebaseUser.email,
          },
        });
      } catch {
        // Handled in mutation
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

  // Helper for rendering file category badge and icon
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return <ImageIcon className="w-5 h-5 text-cyan-600" />;
      case "video":
        return <Video className="w-5 h-5 text-indigo-600" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-rose-600" />;
      case "word":
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "excel":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case "powerpoint":
        return <Presentation className="w-5 h-5 text-amber-600" />;
      default:
        return <Paperclip className="w-5 h-5 text-slate-600" />;
    }
  };

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
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#004D61] hover:bg-[#003847] text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-xs"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
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

      {/* Upload Drag & Drop Area (Only if upload enabled and authorized) */}
      {canManage && allowUpload && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-slate-50/70 ${
            isDragging
              ? "border-[#007A99] bg-[#E0F3F7]/50 scale-[1.01]"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-[#004D61] flex items-center justify-center mx-auto shadow-xs border border-slate-200">
              <Upload className="w-5 h-5 text-[#007A99]" />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">
                Drag &amp; drop files here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#007A99] hover:underline font-extrabold"
                >
                  browse from device
                </button>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports Images (JPG, PNG, WEBP), Videos (MP4, MOV, WEBM), PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), TXT &amp; ZIP up to 100MB.
              </p>
            </div>

            {/* Category Pill Selector */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {Object.values(ATTACHMENT_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                    selectedCategory === cat
                      ? "bg-[#004D61] text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attachments List / Grid */}
      {isLoading ? (
        <div className="py-12 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#007A99]" />
          <p className="text-xs text-slate-500">Loading documentation files...</p>
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Paperclip className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">No Attachments Uploaded Yet</h4>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Event documentation, photos, attendance logs, and presentation slides uploaded for this event will be organized here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attachments.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 max-w-xs">
                        <div className="p-1.5 rounded-lg bg-slate-100 shrink-0">
                          {getFileIcon(att.fileType)}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-slate-900 truncate block" title={att.fileName}>
                            {att.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {att.uploadedByName || "Campus Member"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="uppercase text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {att.fileType}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {formatFileSize(att.fileSize)}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px] truncate max-w-[140px]">
                      {att.fileCategory || "General"}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {format(new Date(att.uploadedAt), "MMM dd, yyyy")}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Preview / Open Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewAttachment(att)}
                          className="h-8 px-2.5 text-xs text-[#007A99] hover:bg-[#E0F3F7] rounded-lg font-bold gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{att.fileType === "pdf" ? "Open" : "Preview"}</span>
                        </Button>

                        {/* Download Original File Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => downloadOriginalAttachment(att)}
                          className="h-8 px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-bold gap-1 shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span>Download</span>
                        </Button>

                        {/* Delete Button (If Authorized) */}
                        {canManage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAttachmentToDelete(att)}
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack */}
          <div className="md:hidden space-y-2.5">
            {attachments.map((att) => (
              <Card key={att.id} className="p-3.5 rounded-2xl border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 shrink-0">
                      {getFileIcon(att.fileType)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={att.fileName}>
                        {att.fileName}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(att.fileSize)} &bull; {format(new Date(att.uploadedAt), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <span className="uppercase text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {att.fileType}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewAttachment(att)}
                    className="flex-1 h-8 text-xs text-[#007A99] border-[#007A99]/20 hover:bg-[#E0F3F7] rounded-xl font-bold gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => downloadOriginalAttachment(att)}
                    className="flex-1 h-8 text-xs bg-[#004D61] hover:bg-[#003847] text-white rounded-xl font-bold gap-1 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </Button>

                  {canManage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachmentToDelete(att)}
                      className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. PREVIEW DIALOG MODAL */}
      {/* ===================================================================== */}
      <Dialog
        open={Boolean(previewAttachment)}
        onOpenChange={(open) => !open && setPreviewAttachment(null)}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl bg-white border-slate-200">
          <DialogHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between">
            <div className="space-y-0.5 text-left">
              <DialogTitle className="text-sm font-extrabold text-slate-900 truncate max-w-lg">
                {previewAttachment?.fileName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {previewAttachment?.fileType.toUpperCase()} &bull;{" "}
                {formatFileSize(previewAttachment?.fileSize)} &bull; Uploaded on{" "}
                {previewAttachment?.uploadedAt
                  ? format(new Date(previewAttachment.uploadedAt), "MMMM dd, yyyy")
                  : "N/A"}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-6 max-h-[70vh] overflow-y-auto flex items-center justify-center bg-slate-100/50">
            {previewAttachment?.fileType === "image" ? (
              <img
                src={previewAttachment.downloadUrl}
                alt={previewAttachment.fileName}
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md mx-auto"
              />
            ) : previewAttachment?.fileType === "video" ? (
              <video
                src={previewAttachment.downloadUrl}
                controls
                autoPlay
                className="max-h-[60vh] max-w-full rounded-xl shadow-md mx-auto"
              >
                Your browser does not support the video tag.
              </video>
            ) : previewAttachment?.fileType === "pdf" ? (
              <div className="w-full h-[60vh] rounded-xl overflow-hidden border border-slate-200 bg-white">
                <iframe
                  src={`${previewAttachment.downloadUrl}#toolbar=1`}
                  title={previewAttachment.fileName}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="text-center py-8 space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 text-[#004D61] flex items-center justify-center mx-auto shadow-sm">
                  {previewAttachment && getFileIcon(previewAttachment.fileType)}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {previewAttachment?.fileName}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Direct in-browser interactive preview is not available for this file type. You can download and inspect the original file directly.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => previewAttachment && downloadOriginalAttachment(previewAttachment)}
                  className="bg-[#004D61] hover:bg-[#003847] text-white rounded-xl text-xs font-bold gap-1.5 h-10 px-5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Original ({formatFileSize(previewAttachment?.fileSize)})</span>
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 flex items-center justify-between sm:justify-between">
            <span className="text-[11px] text-slate-400">
              Original Format Verified &bull; Unaltered File
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewAttachment(null)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
              {previewAttachment && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => downloadOriginalAttachment(previewAttachment)}
                  className="bg-[#007A99] hover:bg-[#006883] text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Original</span>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* 2. DELETE CONFIRMATION MODAL */}
      {/* ===================================================================== */}
      <Dialog
        open={Boolean(attachmentToDelete)}
        onOpenChange={(open) => !open && setAttachmentToDelete(null)}
      >
        <DialogContent className="max-w-md rounded-2xl bg-white border-slate-200">
          <DialogHeader className="space-y-2 text-left">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-extrabold text-slate-900">
              Delete Attachment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900 font-bold">{attachmentToDelete?.fileName}</strong>? This action will remove the file from storage and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => setAttachmentToDelete(null)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!attachmentToDelete) return;
                try {
                  await deleteMutation.mutateAsync({
                    eventId,
                    attachmentId: attachmentToDelete.id,
                    storagePath: attachmentToDelete.storagePath,
                  });
                  setAttachmentToDelete(null);
                } catch {}
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold gap-1.5"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete File</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventAttachmentsManager;
