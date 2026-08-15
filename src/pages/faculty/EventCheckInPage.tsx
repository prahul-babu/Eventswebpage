import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { format } from "date-fns";
import {
  Camera,
  Flashlight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Search,
  RotateCcw,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import {
  useLiveEventAttendance,
  useCheckInAttendeeMutation,
  useUndoCheckInMutation,
} from "@/lib/queries/attendance";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ScanRecord {
  id: string;
  name: string;
  rollNumber?: string;
  department?: string;
  ticketCode: string;
  time: Date;
  status: "SUCCESS" | "DUPLICATE" | "INVALID";
  message?: string;
}

export const EventCheckInPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { event, registrations, totalConfirmed, totalAttended, isLoading } =
    useLiveEventAttendance(eventId);

  const checkInMutation = useCheckInAttendeeMutation();
  const undoMutation = useUndoCheckInMutation();

  const [activeTab, setActiveTab] = useState<"scanner" | "manual">("scanner");
  const [torchOn, setTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanRecord | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Initialize Html5Qrcode Scanner
  useEffect(() => {
    if (activeTab !== "scanner" || !eventId) {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {});
        setIsScanning(false);
      }
      return;
    }

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          // Extract code from raw string or QR payload (e.g. APL-TKT:eventId:uid:code)
          let codeToVerify = decodedText.trim();
          if (codeToVerify.includes(":")) {
            const parts = codeToVerify.split(":");
            codeToVerify = parts[parts.length - 1];
          }

          try {
            const res = await checkInMutation.mutateAsync({
              eventId,
              ticketCode: codeToVerify,
            });

            const record: ScanRecord = {
              id: res.registrationId || Date.now().toString(),
              name: res.attendeeName,
              rollNumber: res.rollNumber,
              department: res.department,
              ticketCode: res.ticketCode,
              time: new Date(),
              status: res.alreadyCheckedIn ? "DUPLICATE" : "SUCCESS",
              message: res.alreadyCheckedIn
                ? `Already checked in at ${format(new Date(res.checkedInAt), "h:mm a")}`
                : "Pass verified & check-in confirmed",
            };

            setLastScanResult(record);
            setScanHistory((prev) => [record, ...prev.slice(0, 4)]);
          } catch (err: any) {
            const record: ScanRecord = {
              id: Date.now().toString(),
              name: "Unknown Attendee",
              ticketCode: codeToVerify,
              time: new Date(),
              status: "INVALID",
              message: err.message || "Invalid pass or wrong event",
            };
            setLastScanResult(record);
            setScanHistory((prev) => [record, ...prev.slice(0, 4)]);
          } finally {
            // Delay next scan slightly to prevent accidental double-reads
            setTimeout(() => {
              isProcessingRef.current = false;
            }, 1800);
          }
        },
        () => {
          // Frame scanner ignore
        }
      )
      .then(() => {
        setIsScanning(true);
      })
      .catch((err) => {
        console.warn("[Scanner] Camera start note:", err);
      });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [activeTab, eventId]);

  // Torch Toggle
  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn(!torchOn);
    } catch {
      toast.info("Torch not supported on this device/camera.");
    }
  };

  const handleManualCheckIn = async (ticketCode: string) => {
    if (!eventId) return;
    try {
      const res = await checkInMutation.mutateAsync({
        eventId,
        ticketCode,
      });

      const record: ScanRecord = {
        id: res.registrationId,
        name: res.attendeeName,
        rollNumber: res.rollNumber,
        department: res.department,
        ticketCode: res.ticketCode,
        time: new Date(),
        status: res.alreadyCheckedIn ? "DUPLICATE" : "SUCCESS",
        message: res.alreadyCheckedIn
          ? `Already checked in at ${format(new Date(res.checkedInAt), "h:mm a")}`
          : "Checked In",
      };

      setLastScanResult(record);
      setScanHistory((prev) => [record, ...prev.slice(0, 4)]);
    } catch {
      // Error handled by mutation toast
    }
  };

  const handleUndo = async (ticketCode: string) => {
    if (!eventId) return;
    try {
      await undoMutation.mutateAsync({ eventId, ticketCode });
    } catch {
      // Handled by toast
    }
  };

  // Filtered manual list
  const filteredRegistrations = registrations.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = (r.userDisplayName || "").toLowerCase().includes(q);
    const matchRoll = (r.userRollNumber || "").toLowerCase().includes(q);
    const matchCode = (r.ticketCode || "").toLowerCase().includes(q);
    return matchName || matchRoll || matchCode;
  });

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Initializing check-in gateway...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to={`/faculty/events/${eventId}/registrants`}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Gate</span>
        </Link>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("scanner")}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
              activeTab === "scanner"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            QR Scanner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
              activeTab === "manual"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            Manual Roster
          </button>
        </div>
      </div>

      {/* Event Header & Live Counter */}
      <Card className="p-4 rounded-3xl bg-slate-900 text-white border-0 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
              Live Check-in Gate
            </span>
            <h1 className="text-sm font-black truncate">{event?.title || "Campus Event"}</h1>
          </div>
          <Badge variant="emerald" className="text-[10px] shrink-0 font-mono">
            {event?.category || "Event"}
          </Badge>
        </div>

        {/* Counter Meter */}
        <div className="bg-slate-800/90 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300">Checked In:</span>
          </div>
          <div className="text-sm font-black font-mono">
            <span className="text-emerald-400">{totalAttended}</span>
            <span className="text-slate-400"> / {totalConfirmed} confirmed</span>
          </div>
        </div>
      </Card>

      {/* Tab 1: Scanner View */}
      {activeTab === "scanner" && (
        <div className="space-y-4">
          {/* Camera Viewfinder */}
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-square border-2 border-indigo-500/30 shadow-inner flex flex-col items-center justify-center">
            <div id="reader" className="w-full h-full" />

            {/* Torch Toggle Overlay */}
            <button
              type="button"
              onClick={toggleTorch}
              className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                torchOn ? "bg-amber-400 text-slate-950 shadow-lg" : "bg-black/60 text-white"
              }`}
            >
              <Flashlight className="w-5 h-5" />
            </button>
          </div>

          {/* Big Result Banner */}
          {lastScanResult ? (
            <Card
              className={`p-4 rounded-3xl border-2 transition-all animate-in fade-in zoom-in-95 duration-200 ${
                lastScanResult.status === "SUCCESS"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-950"
                  : lastScanResult.status === "DUPLICATE"
                  ? "bg-amber-500/10 border-amber-500 text-amber-950"
                  : "bg-rose-500/10 border-rose-500 text-rose-950"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-md ${
                    lastScanResult.status === "SUCCESS"
                      ? "bg-emerald-600"
                      : lastScanResult.status === "DUPLICATE"
                      ? "bg-amber-600"
                      : "bg-rose-600"
                  }`}
                >
                  {lastScanResult.status === "SUCCESS" ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : lastScanResult.status === "DUPLICATE" ? (
                    <AlertTriangle className="w-7 h-7" />
                  ) : (
                    <XCircle className="w-7 h-7" />
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        lastScanResult.status === "SUCCESS"
                          ? "text-emerald-700"
                          : lastScanResult.status === "DUPLICATE"
                          ? "text-amber-700"
                          : "text-rose-700"
                      }`}
                    >
                      {lastScanResult.status === "SUCCESS"
                        ? "Checked In"
                        : lastScanResult.status === "DUPLICATE"
                        ? "Duplicate Pass"
                        : "Invalid Ticket"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {format(lastScanResult.time, "h:mm:ss a")}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 truncate">
                    {lastScanResult.name}
                  </h3>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {lastScanResult.rollNumber && (
                      <span className="font-mono font-bold text-slate-800">
                        {lastScanResult.rollNumber}
                      </span>
                    )}
                    {lastScanResult.department && (
                      <span className="truncate max-w-[160px] text-slate-500">
                        &bull; {lastScanResult.department}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 pt-0.5">{lastScanResult.message}</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 rounded-3xl bg-slate-50 border-dashed border-2 border-slate-200 text-center space-y-1">
              <Camera className="w-6 h-6 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-700">Ready to Scan Passes</div>
              <p className="text-[11px] text-slate-400">Position student ticket QR in the frame above.</p>
            </Card>
          )}

          {/* Last 5 Scans Feed */}
          {scanHistory.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Recent Scans (Last 5)
              </span>
              <div className="space-y-1.5">
                {scanHistory.map((s, idx) => (
                  <div
                    key={`${s.id}-${idx}`}
                    className="p-2.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          s.status === "SUCCESS"
                            ? "bg-emerald-500"
                            : s.status === "DUPLICATE"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                      />
                      <span className="font-bold text-slate-800 truncate">{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({s.ticketCode})</span>
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0">
                      {format(s.time, "h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Manual Check-In Search List */}
      {activeTab === "manual" && (
        <div className="space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name, roll number, ticket..."
              className="h-10 pl-9 text-xs rounded-2xl bg-white"
            />
          </div>

          {/* Registrations List */}
          <div className="space-y-2">
            {filteredRegistrations.length > 0 ? (
              filteredRegistrations.map((reg) => {
                const isCheckedIn = reg.checkedIn || reg.status === "ATTENDED";
                const isRecent = Boolean(
                  reg.checkedInAt &&
                    Date.now() - new Date(reg.checkedInAt as any).getTime() < 5 * 60 * 1000
                );

                return (
                  <Card
                    key={reg.id}
                    className="p-3 rounded-2xl bg-white border-slate-200 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {reg.userDisplayName}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                        <span>{reg.userRollNumber || reg.ticketCode}</span>
                        {reg.userDepartment && <span className="truncate">&bull; {reg.userDepartment}</span>}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {isCheckedIn ? (
                        <>
                          <Badge variant="emerald" className="text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Checked In</span>
                          </Badge>
                          {isRecent && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUndo(reg.ticketCode)}
                              disabled={undoMutation.isPending}
                              className="h-7 px-2 text-[10px] text-amber-600 hover:text-amber-800 rounded-lg"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              <span>Undo</span>
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleManualCheckIn(reg.ticketCode)}
                          disabled={checkInMutation.isPending}
                          className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                        >
                          Check In
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No matching attendees found for "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default EventCheckInPage;
