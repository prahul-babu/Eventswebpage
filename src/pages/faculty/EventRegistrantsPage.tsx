import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Search,
  Download,
  Mail,
  Phone,
  Send,
  Loader2,
} from "lucide-react";
import { useEventDetail } from "@/lib/queries/events";
import {
  useEventRegistrants,
  useToggleAttendance,
} from "@/lib/queries/faculty";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Registration, RegistrationStatus } from "@/types";
import { toast } from "sonner";

export const EventRegistrantsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading: isEventLoading } = useEventDetail(eventId);
  const { data: registrants, isLoading: isRegsLoading } = useEventRegistrants(eventId);

  const toggleAttendanceMutation = useToggleAttendance();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RegistrationStatus>("ALL");
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

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

  // Bulk Email Broadcast
  const handleSendBulkEmail = () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error("Incomplete Message", { description: "Please enter both subject and message." });
      return;
    }

    const confirmedCount = registrants?.filter((r) => r.status === "CONFIRMED").length || 0;
    toast.success("Broadcast Queued", {
      description: `Notification queued for ${confirmedCount} confirmed attendees.`,
    });
    setBulkEmailOpen(false);
    setEmailSubject("");
    setEmailMessage("");
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
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading event roster...</p>
      </div>
    );
  }

  const confirmedAttendees = registrants?.filter((r) => r.status === "CONFIRMED") || [];
  const checkedInCount = registrants?.filter((r) => r.checkedIn).length || 0;

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title={`Registrants: ${event?.title || "Campus Event"}`}
        description={`Track admissions, attendance verification, and send bulk updates to registered attendees.`}
        badge={{ text: "Attendee Roster", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="rounded-xl text-xs gap-1.5 h-9 bg-white"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setBulkEmailOpen(true)}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-9 shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Broadcast Email</span>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation back */}
        <Link
          to="/faculty/events"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Events</span>
        </Link>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Bookings</div>
            <div className="text-xl font-extrabold text-slate-900">{registrants?.length || 0}</div>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-emerald-600">Confirmed</div>
            <div className="text-xl font-extrabold text-emerald-700">{confirmedAttendees.length}</div>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-indigo-600">Attended / Checked-In</div>
            <div className="text-xl font-extrabold text-indigo-700">
              {checkedInCount} / {confirmedAttendees.length}
            </div>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Capacity Left</div>
            <div className="text-xl font-extrabold text-slate-900">
              {Math.max(0, (event?.capacity || 0) - confirmedAttendees.length)} seats
            </div>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(["ALL", "CONFIRMED", "WAITLISTED", "CANCELLED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                  statusFilter === status
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search attendee name, roll number, ticket..."
              className="h-9 pl-9 text-xs rounded-xl bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Registrants Table */}
        <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 w-12 text-center">Attended</th>
                  <th className="p-4">Attendee Info</th>
                  <th className="p-4">Roll / Staff ID</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Ticket Code</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isRegsLoading ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Loading attendees roster...</span>
                    </td>
                  </tr>
                ) : filteredRegistrants.length > 0 ? (
                  filteredRegistrants.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Check-in Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(reg.checkedIn)}
                          onChange={() => handleToggleAttendance(reg)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          title="Toggle gate check-in status"
                        />
                      </td>

                      {/* Attendee Info */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{reg.userDisplayName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{reg.userEmail}</div>
                        {reg.userPhone && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{reg.userPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Roll / Staff ID */}
                      <td className="p-4 font-mono font-semibold text-slate-800">
                        {reg.userRollNumber || "N/A"}
                      </td>

                      {/* Department */}
                      <td className="p-4 text-slate-600 truncate max-w-[160px]">
                        {reg.userDepartment || "General"}
                      </td>

                      {/* Ticket Code */}
                      <td className="p-4 font-mono font-bold text-indigo-900">
                        {reg.ticketCode}
                      </td>

                      {/* Registration Status */}
                      <td className="p-4">{getStatusBadge(reg.status)}</td>

                      {/* Payment */}
                      <td className="p-4">
                        {reg.isPaid ? (
                          <Badge variant="indigo" className="text-[10px]">
                            ₹{reg.amountPaid || 0}
                          </Badge>
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
      </div>

      {/* Bulk Email Broadcast Modal */}
      <Dialog open={bulkEmailOpen} onOpenChange={setBulkEmailOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader className="text-left space-y-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Broadcast Message to Confirmed Attendees
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Send an official notification &amp; email update to all {confirmedAttendees.length} confirmed registrants for this event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Subject</label>
              <Input
                placeholder="e.g. Venue Change & Preparation Instructions"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Message</label>
              <Textarea
                placeholder="Enter message body to be dispatched to student inboxes..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 flex flex-col sm:flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkEmailOpen(false)}
              className="w-full sm:w-auto rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendBulkEmail}
              className="w-full sm:w-auto rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Broadcast</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default EventRegistrantsPage;
