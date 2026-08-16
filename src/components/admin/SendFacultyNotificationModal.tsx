import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Send,
  UserCheck,
  Mail,
  Smartphone,
  Sparkles,
  Loader2,
  Building2,
  BadgeAlert,
} from "lucide-react";
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
import {
  useSendAdminFacultyNotification,
  FacultyRecipient,
} from "@/lib/queries/adminNotifications";
import { toast } from "sonner";

interface SendFacultyNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faculty: FacultyRecipient | FacultyRecipient[];
  eventContext?: {
    eventId: string;
    eventTitle: string;
  };
  defaultSubject?: string;
  defaultMessage?: string;
}

const QUICK_TEMPLATES = [
  {
    label: "Documentation Required",
    subject: "Event Documentation Required",
    message: "Please upload the final event post-report, attendee attendance roster, and supporting financial/media files for administrative review.",
  },
  {
    label: "Approval Update",
    subject: "Event Proposal Approved & Ready for Scheduling",
    message: "Your event proposal has been officially approved by the School of Technology review committee. You may now manage registrations.",
  },
  {
    label: "Faculty Application",
    subject: "Faculty Portal Account Verification Status",
    message: "Your faculty portal access request has been reviewed. Please verify your departmental details and employee credentials in your profile.",
  },
  {
    label: "Venue & Logistic Advisory",
    subject: "Campus Venue & Resource Allocation Advisory",
    message: "Important coordination notice regarding university auditorium/lab booking and AV equipment requirements for your upcoming event.",
  },
];

export const SendFacultyNotificationModal: React.FC<SendFacultyNotificationModalProps> = ({
  open,
  onOpenChange,
  faculty,
  eventContext,
  defaultSubject = "",
  defaultMessage = "",
}) => {
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [inAppChannel, setInAppChannel] = useState(true);
  const [emailChannel, setEmailChannel] = useState(true);

  const sendMutation = useSendAdminFacultyNotification();

  const recipientsList: FacultyRecipient[] = Array.isArray(faculty) ? faculty : [faculty];
  const primaryRecipient = recipientsList[0];

  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setMessage(defaultMessage);
    }
  }, [open, defaultSubject, defaultMessage]);

  const handleApplyTemplate = (tmpl: typeof QUICK_TEMPLATES[0]) => {
    setSubject(tmpl.subject);
    setMessage(tmpl.message);
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Subject Required", { description: "Please enter a subject headline." });
      return;
    }
    if (!message.trim()) {
      toast.error("Message Required", { description: "Please enter the notification message." });
      return;
    }
    if (!inAppChannel && !emailChannel) {
      toast.error("Channel Required", { description: "Please select at least one dispatch channel." });
      return;
    }

    try {
      await sendMutation.mutateAsync({
        recipients: recipientsList,
        subject: subject.trim(),
        message: message.trim(),
        eventContext,
        channels: {
          inApp: inAppChannel,
          email: emailChannel,
        },
      });

      onOpenChange(false);
      setSubject("");
      setMessage("");
    } catch {
      // Handled by mutation toast
    }
  };

  if (!primaryRecipient && recipientsList.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl p-6 space-y-4">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E0F3F7] text-[#007A99] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Send Update to Faculty
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Dispatch an authoritative institutional notification and official Outlook email to faculty members.
          </DialogDescription>
        </DialogHeader>

        {/* Recipient Identified Information Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#007A99]" />
              <span className="text-xs font-bold text-slate-900">
                {recipientsList.length === 1
                  ? primaryRecipient.name || "Faculty Member"
                  : `${recipientsList.length} Selected Faculty Members`}
              </span>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-[#E0F3F7] text-[#007A99] font-bold">
              {primaryRecipient?.employeeId || "Faculty Member"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="font-mono truncate">{primaryRecipient?.email}</span>
            </div>
            {primaryRecipient?.department && (
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{primaryRecipient.department}</span>
              </div>
            )}
          </div>

          {eventContext && (
            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-[#004D61]">
              <BadgeAlert className="w-3.5 h-3.5 text-[#007A99]" />
              <span>Event Context: <strong>{eventContext.eventTitle}</strong></span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Templates */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#F5A623]" />
            Quick Suggestion Templates
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3.5 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Subject *</span>
              <span className="text-[10px] text-slate-400 font-normal">{subject.length}/100</span>
            </Label>
            <Input
              placeholder="e.g. Event Documentation Required, Application Status Update..."
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 100))}
              className="text-xs rounded-xl h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Message Content *</Label>
            <Textarea
              placeholder="Enter official instructions, requirements, or updates for this faculty member..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="text-xs rounded-xl leading-relaxed"
            />
          </div>

          {/* Dispatch Channels */}
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
                    <Smartphone className="w-3.5 h-3.5 text-[#007A99]" />
                    In-App Notification
                  </span>
                  <span className="text-[10px] text-slate-400 block">Header bell &amp; portal alerts</span>
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
                    <Mail className="w-3.5 h-3.5 text-[#004D61]" />
                    Official Outlook Email
                  </span>
                  <span className="text-[10px] text-slate-400 block">University faculty inbox</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendMutation.isPending}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSend}
            disabled={sendMutation.isPending || !subject.trim() || !message.trim()}
            className="bg-[#004D61] hover:bg-[#003847] text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending Update...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Notification</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
