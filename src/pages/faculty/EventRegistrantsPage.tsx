import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Search,
  Download,
  Mail,
  Phone,
  Loader2,
  Megaphone,
} from "lucide-react";
import { useEventDetail } from "@/lib/queries/events";
import {
  useEventRegistrants,
  useToggleAttendance,
} from "@/lib/queries/faculty";
import { PageHeader } from "@/components/common/PageHeader";
import { SendEventUpdateModal } from "@/components/events/SendEventUpdateModal";
import { EventUpdatesHistory } from "@/components/events/EventUpdatesHistory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Registration, RegistrationStatus } from "@/types";
import { toast } from "sonner";

export const EventRegistrantsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading: isEventLoading } = useEventDetail(eventId);
  const { data: registrants, isLoading: isRegsLoading } = useEventRegistrants(eventId);

  const toggleAttendanceMutation = useToggleAttendance();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RegistrationStatus>("ALL");
  const [sendUpdateModalOpen, setSendUpdateModalOpen] = useState(false);

  // Filtering
  const filteredRegistrants = useMemo(() => {
    if (!registrants) return [];

    return registrants.filter((reg) => {
      if (statusFilter !== "ALL" && reg.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = reg.userDisplayName.toLowerCase().includes(query);
        const matchEmail = reg.userEmail.toLowerCase().includes(query);
        const matchRoll = (reg.userRollNumber || "").toLowerCase().includes(query);
        const matchTicket = reg.ticketCode.toLowerCase().includes(query);
        return matchName || matchEmail || matchRoll || matchTicket;
      }
      return true;
    });
  }, [registrants, statusFilter, searchQuery]);

  const confirmedCount = registrants?.filter(
    (r) => r.status === "CONFIRMED" || r.status === "ATTENDED" || !r.status
  ).length || 0;

  // Attendance Toggle
  const handleToggleAttendance = (reg: Registration) => {
    if (!eventId) return;
    toggleAttendanceMutation.mutate({
      registrationId: reg.id,
      eventId,
      checkedIn: !reg.checkedIn,
    });
  };

  // CSV Export Action
  const handleExportCSV = () => {
    if (!registrants || registrants.length === 0) {
      toast.info("No Registrations", { description: "There are no attendee records to export." });
      return;
    }

    const headers = [
      "Ticket Code",
      "Full Name",
      "Email",
      "Roll / Staff ID",
      "Department",
      "Phone",
      "Status",
      "Payment Status",
      "Amount Paid (INR)",
      "Attended",
      "Checked-In At",
      "Registration Date",
    ];

    const rows = registrants.map((r) => [
      `"${r.ticketCode}"`,
      `"${r.userDisplayName}"`,
      `"${r.userEmail}"`,
      `"${r.userRollNumber || ""}"`,
      `"${r.userDepartment || ""}"`,
      `"${r.userPhone || ""}"`,
      `"${r.status}"`,
      `"${r.isPaid ? "PAID" : "FREE"}"`,
      `"${r.amountPaid || 0}"`,
      `"${r.checkedIn ? "YES" : "NO"}"`,
      `"${r.checkedInAt ? format(r.checkedInAt, "yyyy-MM-dd HH:mm") : ""}"`,
      `"${format(r.registeredAt, "yyyy-MM-dd HH:mm")}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Apollo_${event?.title ? event.title.replace(/[^a-zA-Z0-9]/g, "_") : "Event"}_Registrants.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendee Roster Exported (CSV)");
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="emerald">Confirmed</Badge>;
      case "WAITLISTED":
        return <Badge variant="amber">Waitlisted</Badge>;
      case "PENDING_PAYMENT":
        return <Badge variant="secondary">Pending Payment</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isEventLoading) {
    return (
      <div className="max-w-7xl mx-auto py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#007A99] mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading event attendee roster...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={event?.title || "Event Registrants"}
        description={`Manage verified attendee roster, digital QR check-in status, and attendee communications for ${event?.venueLocation || "Campus Event"}.`}
        badge={{ text: "Attendee Operations", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl text-xs gap-1.5 h-9 bg-white shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Roster (CSV)</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setSendUpdateModalOpen(true)}
              className="rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold gap-1.5 h-9 shadow-2xs"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Send Event Update</span>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Summary Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/faculty/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007A99] hover:text-[#004D61]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Managed Events</span>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">
              Total Registrations: <strong className="text-slate-900">{registrants?.length || 0}</strong>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-emerald-700 font-bold">
              Confirmed: {confirmedCount}
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-indigo-700 font-bold">
              Checked-In: {registrants?.filter((r) => r.checkedIn).length || 0}
            </span>
          </div>
        </div>

        {/* Filter Card */}
        <Card className="p-4 sm:p-5 rounded-3xl border-slate-200 shadow-2xs bg-white">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by student name, roll number, email, or ticket code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl h-10"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(["ALL", "CONFIRMED", "WAITLISTED", "PENDING_PAYMENT", "CANCELLED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? "bg-[#004D61] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" ? "All Attendees" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Registrants Table */}
        <Card className="rounded-3xl border-slate-200 shadow-2xs overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Attendee Details</th>
                  <th className="p-4">Ticket Code</th>
                  <th className="p-4">Roll / ID</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Check-In</th>
                  <th className="p-4">Fee Paid</th>
                  <th className="p-4">Registration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isRegsLoading ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#007A99]" />
                      <span>Loading attendees...</span>
                    </td>
                  </tr>
                ) : filteredRegistrants.length > 0 ? (
                  filteredRegistrants.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Contact */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {reg.userDisplayName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5" />
                            {reg.userEmail}
                          </span>
                          {reg.userPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />
                              {reg.userPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ticket Code */}
                      <td className="p-4 whitespace-nowrap font-mono font-bold text-[#007A99]">
                        {reg.ticketCode}
                      </td>

                      {/* Roll Number */}
                      <td className="p-4 whitespace-nowrap font-mono text-slate-600">
                        {reg.userRollNumber || "—"}
                      </td>

                      {/* Department */}
                      <td className="p-4 whitespace-nowrap text-slate-600">
                        {reg.userDepartment || "—"}
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">{getStatusBadge(reg.status)}</td>

                      {/* Check-In Toggle */}
                      <td className="p-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(reg)}
                          disabled={toggleAttendanceMutation.isPending || reg.status !== "CONFIRMED"}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                            reg.checkedIn
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          } ${reg.status !== "CONFIRMED" ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {reg.checkedIn ? "✓ Checked-In" : "Check In"}
                        </button>
                      </td>

                      {/* Fee Paid */}
                      <td className="p-4 whitespace-nowrap font-semibold">
                        {reg.isPaid ? (
                          <span className="text-emerald-700">₹{reg.amountPaid}</span>
                        ) : (
                          <span className="text-slate-400">Free</span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        {format(reg.registeredAt, "MMM d, yyyy h:mm a")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      No attendees found matching filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Dispatched Event Updates & Announcement History */}
        {eventId && (
          <EventUpdatesHistory
            eventId={eventId}
            onOpenSendModal={() => setSendUpdateModalOpen(true)}
          />
        )}
      </div>

      {/* Send Event Update Modal */}
      {event && (
        <SendEventUpdateModal
          open={sendUpdateModalOpen}
          onOpenChange={setSendUpdateModalOpen}
          event={event}
          registrants={registrants}
        />
      )}
    </div>
  );
};

export default EventRegistrantsPage;
