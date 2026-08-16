import React, { useState } from "react";
import {
  Megaphone,
  Send,
  Users,
  Smartphone,
  Mail,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { useSendEventUpdate } from "@/lib/queries/updates";
import { useEventRegistrants } from "@/lib/queries/faculty";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Event, Registration } from "@/types";
import { toast } from "sonner";

interface SendEventUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
  registrants?: Registration[];
}

export const SendEventUpdateModal: React.FC<SendEventUpdateModalProps> = ({
  open,
  onOpenChange,
  event,
  registrants: propRegistrants,
}) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [inAppChannel, setInAppChannel] = useState(true);
  const [emailChannel, setEmailChannel] = useState(true);
  const [confirmStepOpen, setConfirmStepOpen] = useState(false);

  const sendMutation = useSendEventUpdate();

  // Always query database directly to ensure we have the live, exact registration roster
  const { data: fetchedRegistrants, isLoading: isRegsLoading } = useEventRegistrants(event?.id);

  const activeRegistrants =
    propRegistrants && propRegistrants.length > 0
      ? propRegistrants
      : fetchedRegistrants || [];

  const confirmedAttendees = activeRegistrants.filter((r) => {
    const s = String(r.status || "").toUpperCase().trim();
    return s === "CONFIRMED" || s === "ATTENDED" || s === "ACTIVE" || !r.status;
  });

  const confirmedCount = confirmedAttendees.length;

  const handleOpenConfirm = () => {
    if (confirmedCount === 0) {
      toast.error("No Confirmed Registrants", {
        description: "No confirmed students are registered for this event.",
      });
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject Required", { description: "Please enter an update subject headline." });
      return;
    }
    if (!message.trim()) {
      toast.error("Message Required", { description: "Please provide the update announcement message." });
      return;
    }
    if (!inAppChannel && !emailChannel) {
      toast.error("Channel Required", { description: "Please select at least one delivery channel." });
      return;
    }

    setConfirmStepOpen(true);
  };

  const handleDispatch = async () => {
    try {
      const result = await sendMutation.mutateAsync({
        eventId: event.id,
        subject: subject.trim(),
        message: message.trim(),
        channels: {
          inApp: inAppChannel,
          email: emailChannel,
        },
      });

      setConfirmStepOpen(false);
      onOpenChange(false);
      setSubject("");
      setMessage("");

      toast.success("Broadcast sent successfully", {
        description: `${result.notificationsCreated} student(s) notified in portal, ${result.emailsSent} email(s) queued.`,
      });
    } catch {
      // Toast error handled by mutation
    }
  };

  return (
    <>
      {/* Main Broadcast Message to Confirmed Attendees Form Dialog */}
      <Dialog open={open && !confirmStepOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl rounded-3xl p-6 space-y-4">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E0F3F7] text-[#007A99] flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Broadcast Message to Confirmed Attendees
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Send an official notification &amp; email update to all confirmed registrants for this event.
            </DialogDescription>
          </DialogHeader>

          {/* Event Context & Recipient Audience Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Event</span>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#007A99]" />
                  {event.title}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Recipients</span>
                <Badge
                  variant={confirmedCount > 0 ? "secondary" : "outline"}
                  className={`text-xs font-bold ${
                    confirmedCount > 0
                      ? "bg-[#E0F3F7] text-[#007A99] border-cyan-200"
                      : "text-slate-400 border-slate-200"
                  }`}
                >
                  <Users className="w-3 h-3 mr-1" />
                  {isRegsLoading ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `${confirmedCount} Confirmed Registrant${confirmedCount === 1 ? "" : "s"}`
                  )}
                </Badge>
              </div>
            </div>

            {/* Dynamic Recipient Notification Copy */}
            {!isRegsLoading && (
              <p className="text-[11px] text-slate-600">
                {confirmedCount > 0 ? (
                  <>
                    Send an official notification &amp; email update to all <strong>{confirmedCount}</strong> confirmed registrant{confirmedCount === 1 ? "" : "s"} for this event.
                  </>
                ) : (
                  <span className="text-amber-800 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    No confirmed students are registered for this event.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5 text-xs">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Subject *</span>
                <span className="text-[10px] text-slate-400 font-normal">{subject.length}/100</span>
              </Label>
              <Input
                placeholder="e.g. Venue Change, Reporting Time, Prerequisites..."
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 100))}
                className="text-xs rounded-xl h-10"
                disabled={confirmedCount === 0 || isRegsLoading}
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Message *</Label>
              <Textarea
                placeholder="Enter your announcement message detailing instructions, venue revisions, or schedule adjustments..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="text-xs rounded-xl leading-relaxed"
                disabled={confirmedCount === 0 || isRegsLoading}
              />
            </div>

            {/* Delivery Channels */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="font-bold text-slate-700 block">Dispatch Channels</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={inAppChannel}
                    onChange={(e) => setInAppChannel(e.target.checked)}
                    className="w-4 h-4 rounded text-[#007A99] focus:ring-[#007A99]"
                    disabled={confirmedCount === 0 || isRegsLoading}
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#007A99]" />
                      In-App Notification
                    </span>
                    <span className="text-[10px] text-slate-400 block">Header bell &amp; registered events</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={emailChannel}
                    onChange={(e) => setEmailChannel(e.target.checked)}
                    className="w-4 h-4 rounded text-[#007A99] focus:ring-[#007A99]"
                    disabled={confirmedCount === 0 || isRegsLoading}
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      Institutional Outlook Email
                    </span>
                    <span className="text-[10px] text-slate-400 block">Registered student inboxes</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleOpenConfirm}
              disabled={confirmedCount === 0 || isRegsLoading || !subject.trim() || !message.trim()}
              className="rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold gap-1.5 shadow-2xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Broadcast</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Step Dialog */}
      <Dialog open={confirmStepOpen} onOpenChange={setConfirmStepOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Confirm Broadcast to Attendees?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              You are about to dispatch <strong className="text-slate-900">"{subject}"</strong> to <strong className="text-slate-900">{confirmedCount} confirmed student attendee{confirmedCount === 1 ? "" : "s"}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Delivery Summary List */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border text-xs space-y-2 text-slate-700">
            <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider text-slate-400">
              Target Channels
            </span>
            {inAppChannel && (
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>In-app notification on Student Portal &amp; Registered Events</span>
              </div>
            )}
            {emailChannel && (
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Institutional Outlook HTML email to registered university inboxes</span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmStepOpen(false)}
              disabled={sendMutation.isPending}
              className="rounded-xl text-xs"
            >
              Back to Editing
            </Button>
            <Button
              size="sm"
              onClick={handleDispatch}
              disabled={sendMutation.isPending}
              className="rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold gap-1.5 shadow-2xs"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Send Broadcast</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default SendEventUpdateModal;
