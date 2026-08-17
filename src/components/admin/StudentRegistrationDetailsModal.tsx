import React from "react";
import { Registration } from "@/types";
import { safeFormatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";

interface StudentRegistrationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: Registration | null;
  eventTitle?: string;
  onToggleAttendance?: (reg: Registration) => void;
}

export const StudentRegistrationDetailsModal: React.FC<StudentRegistrationDetailsModalProps> = ({
  open,
  onOpenChange,
  registration,
  onToggleAttendance,
}) => {
  if (!registration) return null;

  const isCheckedIn = Boolean(registration.checkedIn || registration.status === "ATTENDED");
  const userYear = (registration as any).userYear;
  const paymentStatus = (registration as any).paymentStatus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="text-left space-y-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Attendee Registration Pass</span>
                <Badge
                  variant={isCheckedIn ? "emerald" : "secondary"}
                  className="text-[10px] font-bold"
                >
                  {isCheckedIn ? "Checked In" : registration.status || "Registered"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-mono">
                Ticket: {registration.ticketCode || "N/A"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* 1. Student Identity */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Student Details</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">Full Name</span>
                <strong className="text-slate-900">{registration.userDisplayName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Roll Number</span>
                <strong className="text-slate-900 font-mono uppercase">
                  {registration.userRollNumber || "N/A"}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Email Address</span>
                <span className="text-slate-700 font-mono text-[11px] truncate block">
                  {registration.userEmail}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Department &amp; Year</span>
                <span className="text-slate-800">
                  {registration.userDepartment || "General"} {userYear ? `(${userYear})` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Registration & Attendance Verification */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Booking &amp; Gate Verification</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">Registered On</span>
                <span className="text-slate-800">
                  {safeFormatDate(registration.registeredAt || (registration as any).createdAt, "PPp", "N/A")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Attendance Status</span>
                <span className={`font-bold ${isCheckedIn ? "text-emerald-700" : "text-amber-600"}`}>
                  {isCheckedIn ? "Verified & Present" : "Not Checked-In"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Payment</span>
                <span className="text-slate-800 font-medium">
                  {Number(registration.amountPaid) > 0 ? `₹${registration.amountPaid} (Paid)` : "Free Registration"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Payment Status</span>
                <Badge variant={paymentStatus === "SUCCESS" || Number(registration.amountPaid) === 0 ? "emerald" : "amber"} className="text-[10px]">
                  {paymentStatus || (Number(registration.amountPaid) > 0 ? "PAID" : "FREE")}
                </Badge>
              </div>
            </div>
          </div>

          {/* 3. Custom Form Answers (if available) */}
          {(registration as any).customAnswers && Object.keys((registration as any).customAnswers).length > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Custom Form Responses</span>
              <div className="space-y-1.5">
                {Object.entries((registration as any).customAnswers).map(([key, val]: [string, any]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500">{key}:</span>
                    <strong className="text-slate-800">{String(val)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {onToggleAttendance && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Quick Gate Action:</span>
            <Button
              size="sm"
              onClick={() => {
                onToggleAttendance(registration);
                onOpenChange(false);
              }}
              className={`rounded-xl text-xs font-bold ${
                isCheckedIn
                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              }`}
            >
              {isCheckedIn ? "Cancel Check-in" : "Mark Verified Turnout"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
