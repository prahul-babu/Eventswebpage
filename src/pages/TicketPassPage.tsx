import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import {
  Download,
  FileText,
  Calendar as CalendarIcon,
  Share2,
  CheckCircle2,
  MapPin,
  Clock,
  Ticket,
  ArrowLeft,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStudentRegistrations } from "@/lib/queries/registrations";
import { generateEventReceiptPDF } from "@/lib/utils/receiptGenerator";
import { downloadEventICalFile } from "@/lib/utils/calendarGenerator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const TicketPassPage: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const { firebaseUser } = useAuth();
  const ticketRef = useRef<HTMLDivElement | null>(null);

  const { data: regsData, isLoading } = useStudentRegistrations(firebaseUser?.uid);
  const targetItem = regsData?.all.find((i) => i.registration.id === registrationId);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isExportingPng, setIsExportingPng] = useState(false);

  // Generate QR Code
  useEffect(() => {
    if (targetItem) {
      const qrPayload = JSON.stringify({
        registrationId: targetItem.registration.id,
        ticketCode: targetItem.registration.ticketCode,
        eventId: targetItem.event.id,
        attendee: targetItem.registration.userDisplayName,
      });

      QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 1,
        color: {
          dark: "#1E1B4B", // Indigo 950
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code error:", err));
    }
  }, [targetItem]);

  const handleDownloadPng = async () => {
    if (!ticketRef.current || !targetItem) return;
    try {
      setIsExportingPng(true);
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `Apollo_Pass_${targetItem.registration.ticketCode}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Ticket pass image downloaded!");
    } catch (err: any) {
      toast.error("Export Failed", { description: err.message || "Failed to generate pass image." });
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!targetItem) return;
    generateEventReceiptPDF({
      registration: targetItem.registration,
      event: targetItem.event,
    });
    toast.success("PDF receipt generated!");
  };

  const handleAddToCalendar = () => {
    if (!targetItem) return;
    downloadEventICalFile(targetItem.event, targetItem.registration);
    toast.success("Calendar invite (.ics) downloaded!");
  };

  const handleShare = async () => {
    if (!targetItem) return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Apollo Event Pass: ${targetItem.event.title}`,
          text: `My verified entry ticket code is ${targetItem.registration.ticketCode} for ${targetItem.event.title}!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Pass link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Generating digital entry pass...</p>
      </div>
    );
  }

  if (!targetItem) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Ticket className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
        <h2 className="text-xl font-bold text-slate-900">Ticket Pass Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested ticket pass was not found in your registrations.
        </p>
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/my-registrations">View My Registrations</Link>
        </Button>
      </div>
    );
  }

  const { event, registration } = targetItem;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/my-registrations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>My Registrations</span>
        </Link>

        <Badge variant="emerald" className="gap-1 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Registration Confirmed</span>
        </Badge>
      </div>

      {/* Confirmation Hero Banner */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Official Event Pass Ready
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Present this verified QR code pass or the 8-character code at the campus gate scanner for entry.
        </p>
      </div>

      {/* =================================================================== */}
      {/* PERFORATED DIGITAL TICKET CARD */}
      {/* =================================================================== */}
      <div
        ref={ticketRef}
        id="ticket-pass-card"
        className="max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 bg-white relative"
      >
        {/* Ticket Top: Event Header */}
        <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-800 flex items-center justify-center text-amber-300">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                The Apollo University
              </span>
            </div>

            <Badge variant="indigo" className="bg-white/20 text-white border-none text-[9px] uppercase">
              {event.category}
            </Badge>
          </div>

          <h2 className="text-lg font-bold text-white leading-snug line-clamp-2">
            {event.title}
          </h2>

          <div className="space-y-1.5 pt-4 text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{event.startAt ? `${format(new Date(event.startAt), "EEEE, MMMM d, yyyy")} • ${format(new Date(event.startAt), "h:mm a")}` : "Date TBA"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">{event.venueLocation}</span>
            </div>
          </div>
        </div>

        {/* Perforated Tear Line with Semicircle Notches */}
        <div className="relative h-6 bg-slate-100 flex items-center justify-between px-2">
          {/* Left Notch */}
          <div className="w-5 h-5 rounded-full bg-slate-50 -ml-5 border-r border-slate-200" />
          {/* Dashed Line */}
          <div className="flex-1 border-b-2 border-dashed border-slate-300 mx-3" />
          {/* Right Notch */}
          <div className="w-5 h-5 rounded-full bg-slate-50 -mr-5 border-l border-slate-200" />
        </div>

        {/* Ticket Bottom: QR Code & Monospace Ticket Code */}
        <div className="p-6 bg-white space-y-6 text-center">
          {/* QR Code */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-44 h-44 p-2 bg-white rounded-2xl border-2 border-slate-100 shadow-md flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Entry Pass QR Code" className="w-full h-full object-contain" />
              ) : (
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              )}
            </div>

            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Scan for verified gate admission
            </div>
          </div>

          {/* Ticket Code Monospace Block */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Verification Code
            </div>
            <div className="font-mono text-2xl font-extrabold tracking-widest text-indigo-950">
              {registration.ticketCode}
            </div>
          </div>

          {/* Attendee Credentials Strip */}
          <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Attendee:</span>
              <div className="font-bold text-slate-900 truncate">{registration.userDisplayName}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Roll / Staff ID:</span>
              <div className="font-mono font-semibold text-slate-900 truncate">
                {registration.userRollNumber || "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ACTION BUTTONS ROW */}
      {/* =================================================================== */}
      <div className="max-w-md mx-auto grid grid-cols-2 gap-3 pt-2">
        <Button
          size="sm"
          onClick={handleDownloadPng}
          disabled={isExportingPng}
          className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-10 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExportingPng ? "Saving PNG..." : "Download Pass (PNG)"}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadReceipt}
          className="rounded-xl text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1.5 h-10"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Receipt (PDF)</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleAddToCalendar}
          className="rounded-xl text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 h-10"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
          <span>Add to Calendar</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleShare}
          className="rounded-xl text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 h-10"
        >
          <Share2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Share Pass</span>
        </Button>
      </div>
    </div>
  );
};
export default TicketPassPage;
