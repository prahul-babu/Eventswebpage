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
} from "lucide-react";
import { useSendEventUpdate } from "@/lib/queries/updates";
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
  registrants = [],
}) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [inAppChannel, setInAppChannel] = useState(true);
  const [emailChannel, setEmailChannel] = useState(true);
  const [confirmStepOpen, setConfirmStepOpen] = useState(false);

  const sendMutation = useSendEventUpdate();

  const confirmedAttendees = registrants.filter(
    (r) => r.status === "CONFIRMED" || r.status === "ATTENDED" || !r.status
  );
  const confirmedCount = confirmedAttendees.length || event.registeredCount || 0;

  const handleOpenConfirm = () => {
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
      await sendMutation.mutateAsync({
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
    } catch (err: any) {
      // Toast handled by mutation
    }
  };

  return (
    <>
      {/* Main Send Event Update Form Dialog */}
      <Dialog open={open && !confirmStepOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl rounded-3xl p-6 space-y-4">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E0F3F7] text-[#007A99] flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Send Event Update
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Notify all registered students about an important update or venue change for <strong className="text-slate-800">"{event.title}"</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Recipient Audience Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#007A99]" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Target Audience</span>
                <span className="text-[11px] text-slate-500">
                  {confirmedCount > 0
                    ? `Dispatching to ${confirmedCount} confirmed student attendee${confirmedCount === 1 ? "" : "s"}`
                    : "No confirmed registrations yet. Update will be archived in the event feed."}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-bold bg-[#E0F3F7] text-[#007A99]">
              {confirmedCount} Registered
            </Badge>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5 text-xs">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Update Subject Headline *</span>
                <span className="text-[10px] text-slate-400 font-normal">{subject.length}/100</span>
              </Label>
              <Input
                placeholder="e.g. Venue Changed to Seminar Hall 2, Laptop Preparation..."
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 100))}
                className="text-xs rounded-xl h-10"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Announcement Message *</Label>
              <Textarea
                placeholder="Detail the instructions, timing adjustments, room change, or prerequisites..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="text-xs rounded-xl leading-relaxed"
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
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
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
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      Institutional Outlook Email
                    </span>
                    <span className="text-[10px] text-slate-400 block">Registered student university inboxes</span>
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
              className="rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Continue to Dispatch &rarr;</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Step Dialog (Section 14) */}
      <Dialog open={confirmStepOpen} onOpenChange={setConfirmStepOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Confirm Update Broadcast?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              You are about to dispatch <strong className="text-slate-900">"{subject}"</strong> to <strong className="text-slate-900">{confirmedCount} registered student(s)</strong>.
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
                <span>Branded HTML email to registered university Outlook inboxes</span>
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
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Send Update</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
