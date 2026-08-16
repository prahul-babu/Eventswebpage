import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  Clock,
  CheckCircle2,
  CheckSquare,
  Square,
  Loader2,
  UserCheck,
  Eye,
  XCircle,
  Building2,
  User as UserIcon,
} from "lucide-react";
import {
  usePendingApprovals,
  useRecentlyReviewedEvents,
  useBulkApproveEvents,
} from "@/lib/queries/admin";
import {
  useAllFacultyApplications,
  usePendingFacultyApplications,
  useApproveFacultyApplication,
  useRejectFacultyApplication,
} from "@/lib/queries/adminUsers";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FacultyApplication } from "@/types";

type QueueTab = "PENDING" | "APPROVED" | "REJECTED" | "FACULTY_APPLICATIONS";

export const AdminApprovalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<QueueTab>("PENDING");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Faculty application modals & state
  const [selectedFacultyApp, setSelectedFacultyApp] = useState<FacultyApplication | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingEvents, isLoading: isPendingLoading } = usePendingApprovals();
  const { data: approvedEvents, isLoading: isApprovedLoading } = useRecentlyReviewedEvents("APPROVED");
  const { data: rejectedEvents, isLoading: isRejectedLoading } = useRecentlyReviewedEvents("REJECTED");

  const { data: facultyApps, isLoading: isFacultyLoading } = useAllFacultyApplications();
  const { data: pendingFacultyApps } = usePendingFacultyApplications();

  const bulkApproveMutation = useBulkApproveEvents();
  const approveFacultyMutation = useApproveFacultyApplication();
  const rejectFacultyMutation = useRejectFacultyApplication();

  // Multi-select helpers
  const handleToggleSelect = (id: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!pendingEvents) return;
    if (selectedEventIds.length === pendingEvents.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(pendingEvents.map((e) => e.id));
    }
  };

  const handleConfirmBulkApprove = async () => {
    if (selectedEventIds.length === 0) return;
    try {
      await bulkApproveMutation.mutateAsync({ eventIds: selectedEventIds });
      setSelectedEventIds([]);
      setBulkDialogOpen(false);
    } catch {
      // Handled by toast
    }
  };

  const handleOpenApproveModal = (app: FacultyApplication) => {
    setSelectedFacultyApp(app);
    setApproveModalOpen(true);
  };

  const handleConfirmApproveFaculty = async () => {
    if (!selectedFacultyApp) return;
    try {
      await approveFacultyMutation.mutateAsync({
        applicationId: selectedFacultyApp.applicationId || selectedFacultyApp.id,
        uid: selectedFacultyApp.uid,
        email: selectedFacultyApp.officialEmail,
        fullName: selectedFacultyApp.fullName,
      });
      setApproveModalOpen(false);
      setSelectedFacultyApp(null);
    } catch {
      // Handled by toast
    }
  };

  const handleOpenRejectModal = (app: FacultyApplication) => {
    setSelectedFacultyApp(app);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmRejectFaculty = async () => {
    if (!selectedFacultyApp) return;
    try {
      await rejectFacultyMutation.mutateAsync({
        applicationId: selectedFacultyApp.applicationId || selectedFacultyApp.id,
        uid: selectedFacultyApp.uid,
        email: selectedFacultyApp.officialEmail,
        reason: rejectionReason.trim() || "Institutional criteria not met",
      });
      setRejectModalOpen(false);
      setSelectedFacultyApp(null);
      setRejectionReason("");
    } catch {
      // Handled by toast
    }
  };

  const getSlaBadge = (createdAt: Date) => {
    const days = differenceInDays(new Date(), createdAt);
    if (days >= 5) {
      return (
        <Badge variant="destructive" className="text-[10px] gap-1">
          <Clock className="w-3 h-3" />
          <span>Waiting {days}d (Overdue)</span>
        </Badge>
      );
    }
    if (days >= 2) {
      return (
        <Badge variant="amber" className="text-[10px] gap-1">
          <Clock className="w-3 h-3" />
          <span>Waiting {days}d</span>
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] gap-1 text-slate-600">
        <Clock className="w-3 h-3 text-slate-400" />
        <span>Waiting {days}d</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Event Approvals Review Board"
        description="Verify event scheduling, institutional compliance, and venue bookings before publishing to the campus catalog."
        badge={{ text: "Administrative Gate", variant: "amber" }}
        actions={
          activeTab === "PENDING" && selectedEventIds.length > 0 ? (
            <Button
              size="sm"
              onClick={() => setBulkDialogOpen(true)}
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Selected ({selectedEventIds.length})</span>
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b pb-3 flex-wrap">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "PENDING"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Pending Event Queue</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "PENDING" ? "bg-white/20 text-white" : "bg-white text-slate-700"
              }`}
            >
              {pendingEvents?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("FACULTY_APPLICATIONS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "FACULTY_APPLICATIONS"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Faculty Approvals</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "FACULTY_APPLICATIONS" ? "bg-white/20 text-white" : "bg-white text-slate-700"
              }`}
            >
              {pendingFacultyApps?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "APPROVED"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Recently Approved Events</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "APPROVED" ? "bg-white/20 text-white" : "bg-white text-slate-700"
              }`}
            >
              {approvedEvents?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("REJECTED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "REJECTED"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Recently Rejected Events</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "REJECTED" ? "bg-white/20 text-white" : "bg-white text-slate-700"
              }`}
            >
              {rejectedEvents?.length || 0}
            </span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: PENDING APPROVALS QUEUE */}
        {/* =================================================================== */}
        {activeTab === "PENDING" && (
          <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-slate-500 hover:text-indigo-600"
                        title="Select All"
                      >
                        {pendingEvents && pendingEvents.length > 0 && selectedEventIds.length === pendingEvents.length ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-4">Event &amp; Organiser</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Schedule</th>
                    <th className="p-4">Venue</th>
                    <th className="p-4">Capacity &amp; Fee</th>
                    <th className="p-4">Review SLA</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isPendingLoading ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Loading approval queue...</span>
                      </td>
                    </tr>
                  ) : pendingEvents && pendingEvents.length > 0 ? (
                    pendingEvents.map((event) => {
                      const isSelected = selectedEventIds.includes(event.id);

                      return (
                        <tr
                          key={event.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? "bg-indigo-50/40" : ""
                          }`}
                        >
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(event.id)}
                              className="text-slate-400 hover:text-indigo-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm max-w-[240px] truncate">
                              {event.title}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[240px]">
                              {event.organiserName} • {event.department}
                            </div>
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <Badge variant="secondary" className="text-[10px]">
                              {event.category}
                            </Badge>
                          </td>

                          <td className="p-4 whitespace-nowrap text-slate-500">
                            <div>{format(event.startAt, "MMM d, yyyy")}</div>
                            <div className="text-[10px] text-slate-400">
                              {format(event.startAt, "h:mm a")}
                            </div>
                          </td>

                          <td className="p-4 whitespace-nowrap text-slate-600 font-medium">
                            {event.venueLocation}
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{event.capacity} seats</div>
                            <div className="text-[10px] text-slate-500">
                              {!event.price || event.price === 0 ? (
                                <span className="text-emerald-600 font-bold">Free Entry</span>
                              ) : (
                                `₹${event.price}`
                              )}
                            </div>
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            {getSlaBadge(event.createdAt)}
                          </td>

                          <td className="p-4 text-right whitespace-nowrap">
                            <Link to={`/admin/approvals/${event.id}`}>
                              <Button
                                size="sm"
                                className="h-8 rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold shadow-xs"
                              >
                                Review Dossier
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                        <div className="font-semibold text-slate-700">All Clear!</div>
                        <div className="text-xs text-slate-400 mt-1">
                          No pending event proposals awaiting administrative review.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* =================================================================== */}
        {/* TAB 2: FACULTY APPROVALS SECTION */}
        {/* =================================================================== */}
        {activeTab === "FACULTY_APPLICATIONS" && (
          <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Faculty Member</th>
                    <th className="p-4">Official Email</th>
                    <th className="p-4">Faculty ID</th>
                    <th className="p-4">Department &amp; School</th>
                    <th className="p-4">Designation</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Submitted Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isFacultyLoading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Loading faculty applications...</span>
                      </td>
                    </tr>
                  ) : facultyApps && facultyApps.length > 0 ? (
                    facultyApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            {app.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ID: {app.applicationId}
                          </div>
                        </td>

                        <td className="p-4 font-mono text-slate-700">
                          {app.officialEmail}
                        </td>

                        <td className="p-4 font-mono font-bold text-slate-800">
                          {app.employeeId || "—"}
                        </td>

                        <td className="p-4 text-slate-600">
                          <div className="font-medium text-slate-900">{app.department}</div>
                          <div className="text-[10px] text-slate-400">{app.school}</div>
                        </td>

                        <td className="p-4 text-slate-600">
                          <Badge variant="secondary" className="text-[10px]">
                            {app.designation}
                          </Badge>
                        </td>

                        <td className="p-4 text-slate-600">
                          {app.mobileNumber || "—"}
                        </td>

                        <td className="p-4 whitespace-nowrap text-slate-500">
                          {format(app.submittedAt, "MMM d, yyyy")}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          {app.status === "approved" ? (
                            <Badge variant="emerald" className="text-[10px]">
                              APPROVED
                            </Badge>
                          ) : app.status === "rejected" ? (
                            <Badge variant="destructive" className="text-[10px]">
                              REJECTED
                            </Badge>
                          ) : (
                            <Badge variant="amber" className="text-[10px] gap-1">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </Badge>
                          )}
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedFacultyApp(app);
                                setViewDetailsOpen(true);
                              }}
                              className="h-8 rounded-xl text-xs gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Details</span>
                            </Button>

                            {app.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenApproveModal(app)}
                                  className="h-8 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Approve</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleOpenRejectModal(app)}
                                  className="h-8 rounded-xl text-xs font-bold gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Reject</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                        <div className="font-semibold text-slate-700">No Faculty Applications</div>
                        <div className="text-xs text-slate-400 mt-1">
                          No pending faculty account registrations requiring review.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* =================================================================== */}
        {/* TAB 3: RECENTLY APPROVED EVENTS */}
        {/* =================================================================== */}
        {activeTab === "APPROVED" && (
          <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Event Title</th>
                    <th className="p-4">Organiser</th>
                    <th className="p-4">Approved At</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isApprovedLoading ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Loading approved events...</span>
                      </td>
                    </tr>
                  ) : approvedEvents && approvedEvents.length > 0 ? (
                    approvedEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50/70">
                        <td className="p-4 font-bold text-slate-900 max-w-[240px] truncate">{event.title}</td>
                        <td className="p-4 text-slate-600">{event.organiserName}</td>
                        <td className="p-4 text-slate-500">{event.approvedAt ? format(event.approvedAt, "MMM d, yyyy h:mm a") : "—"}</td>
                        <td className="p-4"><Badge variant="emerald">PUBLISHED</Badge></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400">No recently approved events.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* =================================================================== */}
        {/* TAB 4: RECENTLY REJECTED EVENTS */}
        {/* =================================================================== */}
        {activeTab === "REJECTED" && (
          <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Event Title</th>
                    <th className="p-4">Organiser</th>
                    <th className="p-4">Rejection Feedback</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isRejectedLoading ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Loading rejected events...</span>
                      </td>
                    </tr>
                  ) : rejectedEvents && rejectedEvents.length > 0 ? (
                    rejectedEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50/70">
                        <td className="p-4 font-bold text-slate-900 max-w-[240px] truncate">{event.title}</td>
                        <td className="p-4 text-slate-600">{event.organiserName}</td>
                        <td className="p-4 text-rose-700 text-xs font-medium max-w-[340px]">
                          {event.rejectionReason || "Revisions requested."}
                        </td>
                        <td className="p-4"><Badge variant="destructive">REJECTED</Badge></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400">No rejected events.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: VIEW FACULTY APPLICATION DETAILS */}
      {/* =================================================================== */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 bg-white">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Faculty Application Dossier
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Verify institutional credentials and identity before granting Faculty Portal access.
            </DialogDescription>
          </DialogHeader>

          {selectedFacultyApp && (
            <div className="space-y-4 py-2 text-xs">
              {/* Personal Information */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-indigo-700">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Personal Information</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Full Name</div>
                    <div className="font-bold text-slate-800 text-sm">{selectedFacultyApp.fullName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Official Email</div>
                    <div className="font-mono text-slate-800 font-semibold">{selectedFacultyApp.officialEmail}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Mobile Contact</div>
                    <div className="text-slate-800 font-medium">{selectedFacultyApp.mobileNumber || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Alternate Email</div>
                    <div className="font-mono text-slate-600">{selectedFacultyApp.alternateEmail || "None"}</div>
                  </div>
                </div>
              </div>

              {/* Institutional Information */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-indigo-700">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Institutional Information</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Faculty / Employee ID</div>
                    <div className="font-mono font-bold text-slate-900">{selectedFacultyApp.employeeId || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Designation</div>
                    <div className="font-semibold text-slate-800">{selectedFacultyApp.designation}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Department</div>
                    <div className="text-slate-800 font-medium">{selectedFacultyApp.department}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">School</div>
                    <div className="text-slate-800 font-medium">{selectedFacultyApp.school}</div>
                  </div>
                </div>
              </div>

              {/* Application Lifecycle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-indigo-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Application Status &amp; Metadata</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Submitted Date</div>
                    <div className="text-slate-800 font-medium">{format(selectedFacultyApp.submittedAt, "PPpp")}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Current Status</div>
                    <div>
                      {selectedFacultyApp.status === "APPROVED" || selectedFacultyApp.status === "approved" ? (
                        <Badge variant="emerald" className="text-[10px]">APPROVED</Badge>
                      ) : selectedFacultyApp.status === "REJECTED" || selectedFacultyApp.status === "rejected" ? (
                        <Badge variant="destructive" className="text-[10px]">REJECTED</Badge>
                      ) : (
                        <Badge variant="amber" className="text-[10px]">PENDING APPROVAL</Badge>
                      )}
                    </div>
                  </div>
                  {(selectedFacultyApp.status === "APPROVED" || selectedFacultyApp.status === "approved") && selectedFacultyApp.approvedAt && (
                    <div className="col-span-2 text-emerald-800 bg-emerald-50 p-2.5 rounded-xl">
                      <div className="text-[10px] font-bold uppercase">Approved On:</div>
                      <div>{format(selectedFacultyApp.approvedAt, "PPpp")}{selectedFacultyApp.approvedBy ? ` by ${selectedFacultyApp.approvedBy}` : ""}</div>
                    </div>
                  )}
                  {selectedFacultyApp.rejectionReason && (
                    <div className="col-span-2 text-rose-700 bg-rose-50 p-2.5 rounded-xl">
                      <div className="text-[10px] font-bold uppercase">Rejection Reason:</div>
                      <div>{selectedFacultyApp.rejectionReason}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewDetailsOpen(false)}
              className="rounded-xl text-xs"
            >
              Close Dossier
            </Button>
            {selectedFacultyApp &&
              (selectedFacultyApp.status === "PENDING_APPROVAL" ||
                selectedFacultyApp.status === "PENDING" ||
                selectedFacultyApp.status === "pending") && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setViewDetailsOpen(false);
                    handleOpenRejectModal(selectedFacultyApp);
                  }}
                  className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Reject Application
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setViewDetailsOpen(false);
                    handleOpenApproveModal(selectedFacultyApp);
                  }}
                  className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Approve Faculty Access
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL 2: CONFIRM FACULTY APPROVAL */}
      {/* =================================================================== */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Approve Faculty Access?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              {selectedFacultyApp
                ? `Are you sure you want to grant faculty portal access to ${selectedFacultyApp.fullName}?`
                : "Are you sure you want to grant faculty portal access?"}
            </DialogDescription>
          </DialogHeader>

          {selectedFacultyApp && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-1 my-2">
              <div className="font-bold text-emerald-950">{selectedFacultyApp.fullName}</div>
              <div className="font-mono text-emerald-800 text-[11px]">{selectedFacultyApp.officialEmail}</div>
              <div className="text-[11px] text-emerald-700">{selectedFacultyApp.department} • {selectedFacultyApp.designation}</div>
            </div>
          )}

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveModalOpen(false)}
              disabled={approveFacultyMutation.isPending}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmApproveFaculty}
              disabled={approveFacultyMutation.isPending}
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {approveFacultyMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <span>Approve Access</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL 3: REJECT FACULTY APPLICATION */}
      {/* =================================================================== */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Reject Faculty Application?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              {selectedFacultyApp
                ? `Are you sure you want to reject the faculty application for ${selectedFacultyApp.fullName}?`
                : "Are you sure you want to reject this faculty application?"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {selectedFacultyApp && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div className="font-bold text-slate-800">{selectedFacultyApp.fullName}</div>
                <div className="font-mono text-slate-500 text-[11px]">{selectedFacultyApp.officialEmail}</div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Please provide a valid institutional faculty ID."
                className="text-xs rounded-xl min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              disabled={rejectFacultyMutation.isPending}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmRejectFaculty}
              disabled={rejectFacultyMutation.isPending}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {rejectFacultyMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <span>Reject Application</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Approval Confirmation Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Bulk Approve {selectedEventIds.length} Events?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              This will publish all {selectedEventIds.length} selected events immediately to the student campus catalog. Organisers will be notified.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkDialogOpen(false)}
              disabled={bulkApproveMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmBulkApprove}
              disabled={bulkApproveMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {bulkApproveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  <span>Approving...</span>
                </>
              ) : (
                <span>Confirm Bulk Approval</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminApprovalsPage;
