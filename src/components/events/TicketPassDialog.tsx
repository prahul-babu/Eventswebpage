import React from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, QrCode, CheckCircle2, Printer } from "lucide-react";
import type { Registration, Event } from "@/types";

interface TicketPassDialogProps {
  registration: Registration | null;
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TicketPassDialog: React.FC<TicketPassDialogProps> = ({
  registration,
  event,
  isOpen,
  onClose,
}) => {
  if (!registration || !event) return null;

  const handlePrint = () => {
    window.print();
  };

  const isCheckedIn = registration.checkedIn;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 rounded-3xl border-slate-200 shadow-2xl overflow-hidden bg-white">
        {/* Ticket Header Block */}
        <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-800 flex items-center justify-center text-amber-300">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">
              The Apollo University
            </span>
          </div>

          <DialogTitle className="text-xl font-extrabold text-white">
            Official Campus Entry Pass
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300 mt-1 line-clamp-1">
            {event.title}
          </DialogDescription>
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* QR Code Card */}
          <div className="p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-center space-y-3 relative">
            <div className="w-36 h-36 bg-white rounded-xl p-3 shadow-md border border-slate-100 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-lg flex flex-col items-center justify-center p-2 text-white text-[10px]">
                <QrCode className="w-24 h-24 text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Verification Ticket Code
              </div>
              <div className="font-mono text-lg font-extrabold tracking-widest text-indigo-900">
                {registration.ticketCode}
              </div>
            </div>

            {isCheckedIn ? (
              <Badge variant="emerald" className="gap-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Checked-In at Gate</span>
              </Badge>
            ) : (
              <Badge variant="indigo" className="text-xs">
                Ready for Scanner
              </Badge>
            )}
          </div>

          {/* Student & Event Meta Strip */}
          <div className="space-y-2.5 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500">Attendee:</span>
              <span className="font-bold text-slate-900">{registration.userDisplayName}</span>
            </div>
            {registration.userRollNumber && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Roll Number:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {registration.userRollNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500">Date & Time:</span>
              <span className="font-medium text-slate-800">
                {format(event.startAt, "MMM d, yyyy &bull; h:mm a")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Venue:</span>
              <span className="font-medium text-slate-800 text-right truncate max-w-[200px]">
                {event.venueLocation}
              </span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <DialogFooter className="p-4 border-t bg-slate-50/80 rounded-b-3xl flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs"
          >
            Close
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Pass</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
