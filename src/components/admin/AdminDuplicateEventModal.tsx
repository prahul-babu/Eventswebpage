import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Event } from "@/types";
import { useAdminDuplicateEvent } from "@/lib/queries/adminEvents";
import { Copy, Loader2, Info } from "lucide-react";

interface AdminDuplicateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
}

export const AdminDuplicateEventModal: React.FC<AdminDuplicateEventModalProps> = ({
  open,
  onOpenChange,
  event,
}) => {
  const navigate = useNavigate();
  const [newTitle, setNewTitle] = useState("");
  const duplicateMutation = useAdminDuplicateEvent();

  useEffect(() => {
    if (event) {
      setNewTitle(`Copy of ${event.title}`);
    }
  }, [event]);

  if (!event) return null;

  const handleDuplicate = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await duplicateMutation.mutateAsync({
        sourceEventId: event.id,
        customTitle: newTitle.trim(),
      });
      onOpenChange(false);
      navigate(`/admin/events/${res.newEventId}`);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="text-left space-y-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Duplicate Event
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Create a cloned copy of this event configuration as a DRAFT.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-indigo-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-indigo-900">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>What gets copied?</span>
            </div>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              Description, category, venue, department, capacity, eligibility criteria, rules, and pricing structure will be cloned. Existing registrations, payments, attendance history, and reports will <strong>NOT</strong> be copied.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">New Event Title *</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Annual CodeSprint Hackathon 2027"
              className="h-10 text-xs rounded-xl font-bold"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending || !newTitle.trim()}
            className="w-full sm:w-auto rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
          >
            {duplicateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Duplicate &amp; Open Event</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
