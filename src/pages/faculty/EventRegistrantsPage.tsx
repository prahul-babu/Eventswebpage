import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
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
import { StudentRegistrationDetailsModal } from "@/components/admin/StudentRegistrationDetailsModal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Registration, RegistrationStatus, DEPARTMENTS } from "@/types";
import { toast } from "sonner";
import { safeFormatDate } from "@/lib/utils";

type SortField = "name" | "roll" | "ticket" | "date";
type SortOrder = "asc" | "desc";

export const EventRegistrantsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading: isEventLoading } = useEventDetail(eventId);
  const { data: registrants, isLoading: isRegsLoading } = useEventRegistrants(eventId);

  const toggleAttendanceMutation = useToggleAttendance();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RegistrationStatus>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [attendanceFilter, setAttendanceFilter] = useState<"ALL" | "CHECKED_IN" | "NOT_CHECKED_IN">("ALL");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [sendUpdateModalOpen, setSendUpdateModalOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

  // Filtering & Sorting
  const filteredRegistrants = useMemo(() => {
    if (!registrants) return [];

    let list = registrants.filter((reg) => {
      if (statusFilter !== "ALL" && reg.status !== statusFilter) {
        return false;
      }
      if (departmentFilter !== "ALL" && reg.userDepartment !== departmentFilter) {
        return false;
      }
      if (attendanceFilter === "CHECKED_IN" && !reg.checkedIn) {
        return false;
      }
      if (attendanceFilter === "NOT_CHECKED_IN" && reg.checkedIn) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = (reg.userDisplayName || "").toLowerCase().includes(query);
        const matchEmail = (reg.userEmail || "").toLowerCase().includes(query);
        const matchRoll = (reg.userRollNumber || "").toLowerCase().includes(query);
        const matchTicket = (reg.ticketCode || "").toLowerCase().includes(query);
        const matchDept = (reg.userDepartment || "").toLowerCase().includes(query);
        return matchName || matchEmail || matchRoll || matchTicket || matchDept;
      }
      return true;
    });

    list.sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case "name":
          comp = (a.userDisplayName || "").localeCompare(b.userDisplayName || "");
          break;
        case "roll":
          comp = (a.userRollNumber || "").localeCompare(b.userRollNumber || "");
          break;
        case "ticket":
          comp = (a.ticketCode || "").localeCompare(b.ticketCode || "");
          break;
        case "date":
        default: {
          const tA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
          const tB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
          comp = tA - tB;
          break;
        }
      }
      return sortOrder === "asc" ? comp : -comp;
    });

    return list;
  }, [registrants, statusFilter, departmentFilter, attendanceFilter, searchQuery, sortField, sortOrder]);

  const confirmedCount = registrants?.filter(
    (r) => r.status === "CONFIRMED" || r.status === "ATTENDED" || !r.status
  ).length || 0;
  const checkedInCount = registrants?.filter((r) => r.checkedIn).length || 0;
  const noShowsCount = Math.max(0, confirmedCount - checkedInCount);
  const cancelledCount = registrants?.filter((r) => r.status === "CANCELLED").length || 0;
  const totalRevenue = registrants?.reduce((acc, r) => acc + (Number(r.amountPaid) || 0), 0) || 0;
  const totalCapacity = event?.capacity || 0;
  const availableSeats = totalCapacity > 0 ? Math.max(0, totalCapacity - confirmedCount) : "Unlimited";

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
      "Registration Status",
      "Payment Status",
      "Amount Paid (INR)",
      "Attended / Checked-In",
      "Checked-In At",
      "Registration Date",
    ];

    const rows = filteredRegistrants.map((r) => [
      `"${r.ticketCode}"`,
      `"${r.userDisplayName}"`,
      `"${r.userEmail}"`,
      `"${r.userRollNumber || ""}"`,
      `"${r.userDepartment || ""}"`,
      `"${r.userPhone || ""}"`,
      `"${r.status || "CONFIRMED"}"`,
      `"${r.isPaid ? "PAID" : "FREE"}"`,
      `"${r.amountPaid || 0}"`,
      `"${r.checkedIn ? "YES" : "NO"}"`,
      `"${r.checkedInAt ? safeFormatDate(r.checkedInAt, "yyyy-MM-dd HH:mm", "") : ""}"`,
      `"${safeFormatDate(r.registeredAt, "yyyy-MM-dd HH:mm", "N/A")}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Apollo_${event?.title ? event.title.replace(/[^a-zA-Z0-9]/g, "_") : "Event"}_Registrations_${safeFormatDate(new Date(), "yyyyMMdd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendee Roster Exported (CSV)", {
      description: `Exported ${filteredRegistrants.length} attendee records.`,
    });
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
        title={event?.title || "Registered Students & Attendees"}
        description={`Manage verified attendee roster, digital QR check-in status, and attendee communications for ${event?.venueLocation || "Campus Event"}.`}
        badge={{ text: "Attendee Roster & Gate", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl text-xs gap-1.5 h-9 bg-white shadow-2xs font-bold"
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
              <span>Send Broadcast Update</span>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/admin/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007A99] hover:text-[#004D61]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events Master Registry</span>
          </Link>
        </div>

        {/* Event Statistics KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3.5 bg-white rounded-2xl border-slate-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Capacity</span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              {totalCapacity > 0 ? totalCapacity : "Unlimited"}
            </span>
          </Card>
          <Card className="p-3.5 bg-white rounded-2xl border-slate-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Bookings</span>
            <span className="text-base sm:text-lg font-black text-indigo-700">{registrants?.length || 0}</span>
          </Card>
          <Card className="p-3.5 bg-white rounded-2xl border-slate-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Available Seats</span>
            <span className="text-base sm:text-lg font-black text-slate-700">{availableSeats}</span>
          </Card>
          <Card className="p-3.5 bg-emerald-50/70 rounded-2xl border-emerald-100 shadow-2xs space-y-0.5">
            <span className="text-[10px] text-emerald-800 font-bold uppercase block">Turnout Verified</span>
            <span className="text-base sm:text-lg font-black text-emerald-700">{checkedInCount}</span>
          </Card>
          <Card className="p-3.5 bg-amber-50/70 rounded-2xl border-amber-100 shadow-2xs space-y-0.5">
            <span className="text-[10px] text-amber-800 font-bold uppercase block">No-shows / Cancelled</span>
            <span className="text-base sm:text-lg font-black text-amber-700">
              {noShowsCount} {cancelledCount > 0 ? `(${cancelledCount} canc.)` : ""}
            </span>
          </Card>
          <Card className="p-3.5 bg-slate-50 rounded-2xl border-slate-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Revenue</span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              {totalRevenue > 0 ? `₹${totalRevenue.toLocaleString()}` : "Free Event"}
            </span>
          </Card>
        </div>

        {/* Filters & Sort Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search student name, roll number, email, ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs rounded-xl h-9"
            />
          </div>

          {/* Department Filter */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Registration Status Filter */}
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Booking Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Attendance Turnout Filter */}
          <Select value={attendanceFilter} onValueChange={(val) => setAttendanceFilter(val as any)}>
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Attendance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Attendance</SelectItem>
              <SelectItem value="CHECKED_IN">Checked-In Only</SelectItem>
              <SelectItem value="NOT_CHECKED_IN">Pending Check-in</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Selector */}
          <Select
            value={`${sortField}_${sortOrder}`}
            onValueChange={(val) => {
              const [field, order] = val.split("_");
              setSortField(field as SortField);
              setSortOrder(order as SortOrder);
            }}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Registered: Newest</SelectItem>
              <SelectItem value="date_asc">Registered: Oldest</SelectItem>
              <SelectItem value="name_asc">Name: A to Z</SelectItem>
              <SelectItem value="roll_asc">Roll Number</SelectItem>
              <SelectItem value="ticket_asc">Ticket Code</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Registrants Table */}
        <Card className="rounded-3xl border-slate-200 shadow-2xs overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Student Attendee</th>
                  <th className="p-4">Ticket Code</th>
                  <th className="p-4">Roll Number</th>
                  <th className="p-4">Department &amp; Year</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Attendance Check-In</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Registered Date</th>
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
                    <tr
                      key={reg.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedRegistration(reg)}
                    >
                      {/* Name & Contact */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm hover:text-indigo-600 transition-colors">
                          {reg.userDisplayName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Mail className="w-2.5 h-2.5" />
                            {reg.userEmail}
                          </span>
                          {reg.userPhone && (
                            <span className="flex items-center gap-1 font-mono">
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
                      <td className="p-4 whitespace-nowrap font-mono text-slate-800 font-bold uppercase">
                        {reg.userRollNumber || "—"}
                      </td>

                      {/* Department */}
                      <td className="p-4 whitespace-nowrap text-slate-600">
                        <div>{reg.userDepartment || "General"}</div>
                        {(reg as any).userYear && <div className="text-[10px] text-slate-400">{(reg as any).userYear}</div>}
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">{getStatusBadge(reg.status)}</td>

                      {/* Check-In Toggle */}
                      <td className="p-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(reg)}
                          disabled={toggleAttendanceMutation.isPending || reg.status !== "CONFIRMED"}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                            reg.checkedIn
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                          } ${reg.status !== "CONFIRMED" ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {reg.checkedIn ? "✓ Verified Present" : "Mark Turnout"}
                        </button>
                      </td>

                      {/* Fee Paid */}
                      <td className="p-4 whitespace-nowrap font-semibold">
                        {Number(reg.amountPaid) > 0 ? (
                          <span className="text-emerald-700">₹{reg.amountPaid}</span>
                        ) : (
                          <span className="text-slate-400">Free</span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="p-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {safeFormatDate(reg.registeredAt, "MMM d, yyyy h:mm a", "N/A")}
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

      {/* Student Registration Details Modal */}
      <StudentRegistrationDetailsModal
        open={Boolean(selectedRegistration)}
        onOpenChange={(open) => !open && setSelectedRegistration(null)}
        registration={selectedRegistration}
        eventTitle={event?.title}
        onToggleAttendance={handleToggleAttendance}
      />

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
