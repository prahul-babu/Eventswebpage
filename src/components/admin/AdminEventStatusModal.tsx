import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Event, EventStatus } from "@/types";
import { useAdminChangeEventStatus } from "@/lib/queries/adminEvents";
import { ShieldAlert, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdminEventStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
}

const ALL_STATUSES: { value: EventStatus; label: string; desc: string }[] = [
  { value: "DRAFT", label: "Draft", desc: "Private work in progress, not visible in catalog" },
  { value: "PENDING_APPROVAL", label: "Pending Approval", desc: "Submitted by faculty for institutional review" },
  { value: "PUBLISHED", label: "Published / Live", desc: "Visible in public catalog and search" },
  { value: "ONGOING", label: "Ongoing", desc: "Event is actively taking place on campus" },
  { value: "COMPLETED", label: "Completed", desc: "Event concluded; Post-event reporting open" },
  { value: "CANCELLED", label: "Cancelled", desc: "Event cancelled; triggers refund & cancellation notifications" },
  { value: "REJECTED", label: "Rejected", desc: "Declined by administration with revision notes" },
];

export const AdminEventStatusModal: React.FC<AdminEventStatusModalProps> = ({
  open,
  onOpenChange,
  event,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<EventStatus>("PUBLISHED");
  const [reason, setReason] = useState("");

  const changeStatusMutation = useAdminChangeEventStatus();

  useEffect(() => {
    if (event?.status) {
      setSelectedStatus(event.status);
      setReason("");
    }
  }, [event]);

  if (!event) return null;

  const handleConfirm = async () => {
    if (!selectedStatus) return;
    try {
      await changeStatusMutation.mutateAsync({
        eventId: event.id,
        newStatus: selectedStatus,
        reason: reason.trim() || "Administrative status update",
      });
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="text-left space-y-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Override Event Lifecycle Status
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Administrative status transition with institutional audit logging.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Target Event Summary */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <strong className="text-slate-900 block text-xs truncate max-w-[200px] sm:max-w-[240px]">
                {event.title}
              </strong>
              <span className="text-[10px] text-slate-400 font-mono">ID: {event.id}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">{event.status}</Badge>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <Badge variant="indigo" className="text-[10px]">{selectedStatus}</Badge>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Select New Lifecycle Status *</label>
            <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as EventStatus)}>
              <SelectTrigger className="h-10 text-xs rounded-xl">
                <SelectValue placeholder="Choose Status" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    <div className="flex flex-col text-left py-0.5">
                      <span className="font-bold text-slate-800">{s.label}</span>
                      <span className="text-[10px] text-slate-400">{s.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transition Reason */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Administrative Reason / Audit Note</label>
            <Textarea
              placeholder="e.g. Schedule confirmed with HoD, moving to Published status..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="text-xs rounded-xl"
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
            onClick={handleConfirm}
            disabled={changeStatusMutation.isPending || selectedStatus === event.status}
            className="w-full sm:w-auto rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
          >
            {changeStatusMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Confirm Status Transition</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
