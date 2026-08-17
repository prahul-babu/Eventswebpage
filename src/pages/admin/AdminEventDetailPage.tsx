import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ShieldCheck,
  FileCheck,
  Megaphone,
  History,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building,
  Sparkles,
  UserPlus,
  Search,
  Info,
  FileText,
} from "lucide-react";
import { useEventDetail } from "@/lib/queries/events";
import { useEventRegistrants, useToggleAttendance } from "@/lib/queries/faculty";
import { useDeleteEvent } from "@/lib/queries/admin";
import {
  useAdminCancelRegistration,
  useAdminRestoreRegistration,
  useAdminBulkAttendance,
  useEventAuditLogs,
} from "@/lib/queries/adminEvents";
import { AdminEventStatusModal } from "@/components/admin/AdminEventStatusModal";
import { AdminDuplicateEventModal } from "@/components/admin/AdminDuplicateEventModal";
import { AdminManualRegisterModal } from "@/components/admin/AdminManualRegisterModal";
import { StudentRegistrationDetailsModal } from "@/components/admin/StudentRegistrationDetailsModal";
import { SendEventUpdateModal } from "@/components/events/SendEventUpdateModal";
import { EventUpdatesHistory } from "@/components/events/EventUpdatesHistory";
import { EventAttachmentsManager } from "@/components/attachments/EventAttachmentsManager";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Registration, RegistrationStatus, DEPARTMENTS } from "@/types";
import { toast } from "sonner";
import { safeFormatDate } from "@/lib/utils";

export const AdminEventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading: isEventLoading } = useEventDetail(eventId);
  const { data: registrants, isLoading: isRegsLoading } = useEventRegistrants(eventId);
  const { data: auditLogs, isLoading: isLogsLoading } = useEventAuditLogs(eventId);

  const toggleAttendanceMutation = useToggleAttendance();
  const cancelRegMutation = useAdminCancelRegistration();
  const restoreRegMutation = useAdminRestoreRegistration();
  const bulkAttendanceMutation = useAdminBulkAttendance();
  const deleteEventMutation = useDeleteEvent();

  // Tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "registrations" | "attendance" | "payments" | "reports" | "media" | "announcements" | "audit"
  >("overview");

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [manualRegisterModalOpen, setManualRegisterModalOpen] = useState(false);
  const [sendUpdateModalOpen, setSendUpdateModalOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Filters for Registrations & Attendance
  const [regSearch, setRegSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RegistrationStatus>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [attendanceFilter, setAttendanceFilter] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");

  // Compute metrics
  const totalCapacity = event?.capacity || 0;
  const confirmedCount = registrants?.filter((r) => r.status === "CONFIRMED" || r.status === "ATTENDED" || !r.status).length || 0;
  const checkedInCount = registrants?.filter((r) => r.checkedIn).length || 0;
  const absentCount = Math.max(0, confirmedCount - checkedInCount);
  const attendancePct = confirmedCount > 0 ? Math.round((checkedInCount / confirmedCount) * 100) : 0;
  const totalRevenue = registrants?.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0) || 0;
  const budgetAllocated = Number((event as any)?.budgetAllocated) || 0;
  const amountSpent = Number((event as any)?.amountSpent) || 0;
  const balanceRemaining = Math.max(0, budgetAllocated - amountSpent);

  // Filtered registrations
  const filteredRegistrants = useMemo(() => {
    if (!registrants) return [];
    return registrants.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (departmentFilter !== "ALL" && r.userDepartment !== departmentFilter) return false;
      if (attendanceFilter === "PRESENT" && !r.checkedIn) return false;
      if (attendanceFilter === "ABSENT" && r.checkedIn) return false;

      if (regSearch.trim()) {
        const q = regSearch.toLowerCase();
        const mName = (r.userDisplayName || "").toLowerCase().includes(q);
        const mEmail = (r.userEmail || "").toLowerCase().includes(q);
        const mRoll = (r.userRollNumber || "").toLowerCase().includes(q);
        const mTicket = (r.ticketCode || "").toLowerCase().includes(q);
        return mName || mEmail || mRoll || mTicket;
      }
      return true;
    });
  }, [registrants, statusFilter, departmentFilter, attendanceFilter, regSearch]);

  // Bulk attendance handler
  const handleBulkAttendance = async (markAs: boolean) => {
    if (!eventId || !registrants || registrants.length === 0) return;
    const confirmedIds = registrants.filter((r) => r.status === "CONFIRMED" || !r.status).map((r) => r.id);
    await bulkAttendanceMutation.mutateAsync({
      eventId,
      registrationIds: confirmedIds,
      markAs,
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!registrants || registrants.length === 0) {
      toast.info("No Registrations to export.");
      return;
    }
    const headers = [
      "Ticket Code",
      "Student Name",
      "Email",
      "Roll Number",
      "Department",
      "Booking Status",
      "Attendance",
      "Fee Paid",
      "Registration Date",
    ];
    const rows = filteredRegistrants.map((r) => [
      `"${r.ticketCode}"`,
      `"${r.userDisplayName}"`,
      `"${r.userEmail}"`,
      `"${r.userRollNumber || ""}"`,
      `"${r.userDepartment || "General"}"`,
      `"${r.status || "CONFIRMED"}"`,
      `"${r.checkedIn ? "PRESENT" : "ABSENT"}"`,
      `"${r.isPaid ? r.amountPaid : "0"}"`,
      `"${safeFormatDate(r.registeredAt, "yyyy-MM-dd HH:mm", "")}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Apollo_${event?.title ? event.title.replace(/[^a-zA-Z0-9]/g, "_") : "Event"}_Roster.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Attendee Roster Exported (CSV)");
  };

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    try {
      await deleteEventMutation.mutateAsync({ eventId, eventTitle: event?.title });
      navigate("/admin/events");
    } catch {}
  };

  if (isEventLoading) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading event control center...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto stroke-1" />
        <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
        <p className="text-xs text-slate-500">The requested event record does not exist in the database.</p>
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/admin/events">Back to Events Master Registry</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events Master Registry</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="rounded-xl text-xs gap-1.5 h-8">
            <Link to={`/events/${event.id}`}>
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Public View</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Hero Control Card */}
      <Card className="rounded-3xl border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge variant="indigo" className="text-[10px] font-bold uppercase">{event.category}</Badge>
              <Badge
                variant={
                  event.status === "PUBLISHED"
                    ? "emerald"
                    : event.status === "PENDING_APPROVAL"
                    ? "amber"
                    : event.status === "CANCELLED"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[10px] font-bold uppercase"
              >
                {event.status}
              </Badge>
              <span className="text-[10px] font-mono text-slate-400">ID: {event.id}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{event.title}</h1>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                {safeFormatDate(event.startAt, "MMM d, yyyy h:mm a", "TBA")}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                {event.venueLocation || "Campus"}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                {event.department || "General"}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 font-medium text-slate-700">
                Organizer: {event.organiserName} ({event.organiserEmail})
              </span>
            </div>
          </div>

          {/* Quick Actions Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              size="sm"
              onClick={() => navigate(`/admin/events/${event.id}/edit`)}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9 shadow-xs"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Event</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Change Status</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setDuplicateModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <Copy className="w-3.5 h-3.5 text-slate-600" />
              <span>Duplicate</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(true)}
              className="rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 h-9 gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b pb-1 text-xs overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Info },
          { id: "registrations", label: `Registrations (${registrants?.length || 0})`, icon: Users },
          { id: "attendance", label: `Attendance (${attendancePct}%)`, icon: CheckCircle2 },
          { id: "payments", label: `Payments (₹${totalRevenue.toLocaleString()})`, icon: DollarSign },
          { id: "reports", label: "Post-Event Report", icon: FileCheck },
          { id: "media", label: "Media & Assets", icon: Sparkles },
          { id: "announcements", label: "Announcements", icon: Megaphone },
          { id: "audit", label: `Audit Trail (${auditLogs?.length || 0})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* =================================================================== */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Event Description &amp; Agenda</span>
              </h3>
              <div
                className="prose prose-sm max-w-none text-xs text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description || "No description provided.") }}
              />
            </Card>

            {/* Logistics & Coordinators Card */}
            <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>Venue Logistics &amp; Coordination Team</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Delivery Mode &amp; Venue</span>
                  <strong className="text-slate-900">{event.venueType} &bull; {event.venueLocation}</strong>
                  {(event as any).roomBuilding && <p className="text-slate-500 mt-0.5">Room/Hall: {(event as any).roomBuilding}</p>}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Department &amp; School</span>
                  <strong className="text-slate-900">{event.department || "General"}</strong>
                  <p className="text-slate-500 mt-0.5">{(event as any).school || "School of Technology"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Faculty Coordinator</span>
                  <strong className="text-slate-800">{(event as any).facultyCoordinator || event.organiserName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Student Coordinators</span>
                  <strong className="text-slate-800">{(event as any).studentCoordinators || "N/A"}</strong>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Key Metrics & Financial Summary */}
          <div className="space-y-6">
            {/* Financial Overview Card */}
            <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Financial Summary</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Registration Fee:</span>
                  <strong className="text-slate-900">{event.isPaid ? `₹${event.price}` : "Free Entry"}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Gross Ticket Revenue:</span>
                  <strong className="text-emerald-700 font-mono">₹{totalRevenue.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Budget Allocated:</span>
                  <strong className="text-slate-900 font-mono">₹{budgetAllocated.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Amount Spent:</span>
                  <strong className="text-slate-900 font-mono">₹{amountSpent.toLocaleString()}</strong>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl flex justify-between items-center">
                  <span className="text-emerald-900 font-bold">Remaining Balance:</span>
                  <strong className="text-emerald-800 text-sm font-mono font-black">₹{balanceRemaining.toLocaleString()}</strong>
                </div>
              </div>
            </Card>

            {/* Capacity & Gate Status Card */}
            <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Gate &amp; Capacity Status</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Total Capacity:</span>
                  <strong className="text-slate-900">{totalCapacity > 0 ? totalCapacity : "Unlimited"}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Bookings:</span>
                  <strong className="text-indigo-700">{confirmedCount} confirmed</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Turnout Rate:</span>
                  <strong className="text-emerald-700">{attendancePct}% ({checkedInCount} attended)</strong>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: REGISTRATIONS */}
      {/* =================================================================== */}
      {activeTab === "registrations" && (
        <div className="space-y-4">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search attendee by name, roll number, email, ticket..."
                value={regSearch}
                onChange={(e) => setRegSearch(e.target.value)}
                className="pl-9 text-xs rounded-xl h-9"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-9 text-xs rounded-xl w-36">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Depts</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-9 text-xs rounded-xl w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={attendanceFilter} onValueChange={(v) => setAttendanceFilter(v as any)}>
                <SelectTrigger className="h-9 text-xs rounded-xl w-32">
                  <SelectValue placeholder="Attendance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Turnout</SelectItem>
                  <SelectItem value="PRESENT">Present Only</SelectItem>
                  <SelectItem value="ABSENT">Absent Only</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                onClick={() => setManualRegisterModalOpen(true)}
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Student</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="rounded-xl text-xs gap-1.5 h-9 font-bold"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV</span>
              </Button>
            </div>
          </div>

          {/* Registrations Table */}
          <Card className="rounded-3xl border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Student Attendee</th>
                    <th className="p-4">Ticket</th>
                    <th className="p-4">Roll Number</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Attendance</th>
                    <th className="p-4">Fee Paid</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isRegsLoading ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Loading attendees...</span>
                      </td>
                    </tr>
                  ) : filteredRegistrants.length > 0 ? (
                    filteredRegistrants.map((reg) => (
                      <tr
                        key={reg.id}
                        onClick={() => setSelectedRegistration(reg)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="p-4">
                          <strong className="text-slate-900 block">{reg.userDisplayName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{reg.userEmail}</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-indigo-600">{reg.ticketCode}</td>
                        <td className="p-4 font-mono font-bold text-slate-800 uppercase">{reg.userRollNumber || "—"}</td>
                        <td className="p-4 text-slate-600">{reg.userDepartment || "General"}</td>
                        <td className="p-4">
                          <Badge variant={reg.status === "CANCELLED" ? "destructive" : "emerald"} className="text-[10px]">
                            {reg.status || "CONFIRMED"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={reg.checkedIn ? "emerald" : "secondary"} className="text-[10px]">
                            {reg.checkedIn ? "✓ Present" : "Absent"}
                          </Badge>
                        </td>
                        <td className="p-4 font-semibold text-slate-800 font-mono">
                          {Number(reg.amountPaid) > 0 ? `₹${reg.amountPaid}` : "Free"}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {reg.status !== "CANCELLED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelRegMutation.mutate({ registrationId: reg.id, eventId: event.id })}
                                className="h-7 rounded-lg text-[10px] text-rose-600 hover:text-rose-700"
                              >
                                Cancel
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreRegMutation.mutate({ registrationId: reg.id, eventId: event.id })}
                                className="h-7 rounded-lg text-[10px] text-emerald-600 hover:text-emerald-700"
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        No attendees matching current filter selections.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: ATTENDANCE */}
      {/* =================================================================== */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 bg-white rounded-3xl border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Bookings</span>
              <strong className="text-2xl font-black text-slate-900">{confirmedCount}</strong>
            </Card>
            <Card className="p-4 bg-emerald-50/80 rounded-3xl border-emerald-100 shadow-2xs space-y-1">
              <span className="text-[10px] text-emerald-800 font-bold uppercase block">Present / Checked-In</span>
              <strong className="text-2xl font-black text-emerald-700">{checkedInCount}</strong>
            </Card>
            <Card className="p-4 bg-amber-50/80 rounded-3xl border-amber-100 shadow-2xs space-y-1">
              <span className="text-[10px] text-amber-800 font-bold uppercase block">Absent / No-shows</span>
              <strong className="text-2xl font-black text-amber-700">{absentCount}</strong>
            </Card>
            <Card className="p-4 bg-indigo-50/80 rounded-3xl border-indigo-100 shadow-2xs space-y-1">
              <span className="text-[10px] text-indigo-800 font-bold uppercase block">Turnout Rate</span>
              <strong className="text-2xl font-black text-indigo-700">{attendancePct}%</strong>
            </Card>
          </div>

          {/* Bulk Controls */}
          <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-600">
              Bulk actions for <strong>{confirmedCount}</strong> confirmed attendees:
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAttendance(true)}
                disabled={bulkAttendanceMutation.isPending}
                className="rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 h-9"
              >
                ✓ Mark All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAttendance(false)}
                disabled={bulkAttendanceMutation.isPending}
                className="rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 h-9"
              >
                Reset / Mark All Absent
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: PAYMENTS & REVENUE */}
      {/* =================================================================== */}
      {activeTab === "payments" && (
        <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
            <span>Payment Transactions Ledger</span>
            <span className="text-emerald-700 font-mono font-bold">Total: ₹{totalRevenue.toLocaleString()}</span>
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {registrants && registrants.filter((r) => Number(r.amountPaid) > 0).length > 0 ? (
              registrants
                .filter((r) => Number(r.amountPaid) > 0)
                .map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block">{r.userDisplayName}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">Ticket: {r.ticketCode}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <strong className="font-mono text-emerald-700">₹{r.amountPaid}</strong>
                      <Badge variant="emerald" className="text-[10px]">PAID</Badge>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                {event.isPaid ? "No paid transactions recorded yet." : "This is a free university event."}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* =================================================================== */}
      {/* TAB 5: POST-EVENT REPORT */}
      {/* =================================================================== */}
      {activeTab === "reports" && (
        <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>Post-Event Institutional Outcome Report</span>
            </h3>
            <Button asChild size="sm" className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8">
              <Link to={`/admin/reports/${event.id}`}>Open Full Report Review Console</Link>
            </Button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Administrators have complete review, endorsement, PDF generation, and Word DOCX export permissions for all post-event outcome documentation.
          </p>
        </Card>
      )}

      {/* =================================================================== */}
      {/* TAB 6: MEDIA & ASSETS */}
      {/* =================================================================== */}
      {activeTab === "media" && (
        <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Event Media &amp; Institutional Document Vault</span>
          </h3>
          <EventAttachmentsManager
            eventId={event.id}
            allowUpload={true}
          />
        </Card>
      )}

      {/* =================================================================== */}
      {/* TAB 7: ANNOUNCEMENTS */}
      {/* =================================================================== */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => setSendUpdateModalOpen(true)}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast Announcement</span>
            </Button>
          </div>
          <EventUpdatesHistory
            eventId={event.id}
            onOpenSendModal={() => setSendUpdateModalOpen(true)}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 8: AUDIT HISTORY */}
      {/* =================================================================== */}
      {activeTab === "audit" && (
        <Card className="rounded-3xl border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b">
            Event Audit History Log ({auditLogs?.length || 0} events)
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {isLogsLoading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <span>Loading audit trail...</span>
              </div>
            ) : auditLogs && auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="indigo" className="text-[10px] font-bold">{log.action}</Badge>
                      <span className="font-semibold text-slate-800">{log.actorEmail || log.actorUid}</span>
                    </div>
                    {log.details && (
                      <p className="text-[11px] text-slate-500 font-mono truncate max-w-xl">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {safeFormatDate(log.timestamp, "MMM d, yyyy h:mm a", "N/A")}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">No audit records logged for this event.</div>
            )}
          </div>
        </Card>
      )}

      {/* Modals */}
      <AdminEventStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        event={event}
      />

      <AdminDuplicateEventModal
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
        event={event}
      />

      <AdminManualRegisterModal
        open={manualRegisterModalOpen}
        onOpenChange={setManualRegisterModalOpen}
        event={event}
      />

      <StudentRegistrationDetailsModal
        open={Boolean(selectedRegistration)}
        onOpenChange={(o) => !o && setSelectedRegistration(null)}
        registration={selectedRegistration}
        eventTitle={event.title}
        onToggleAttendance={(r) => {
          if (eventId) {
            toggleAttendanceMutation.mutate({ registrationId: r.id, eventId, checkedIn: !r.checkedIn });
          }
        }}
      />

      <SendEventUpdateModal
        open={sendUpdateModalOpen}
        onOpenChange={setSendUpdateModalOpen}
        event={event}
        registrants={registrants}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Permanently Delete Event?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">"{event.title}"</strong>?
              <span className="block mt-2 text-rose-600 font-medium">
                This will delete the event document, cancel linked attendee passes, clean up updates, and record an audit log.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              className="w-full sm:w-auto rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteEvent}
              disabled={deleteEventMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              {deleteEventMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Permanent Deletion</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEventDetailPage;
