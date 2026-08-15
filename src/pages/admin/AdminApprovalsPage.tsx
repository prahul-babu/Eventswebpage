import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  Clock,
  CheckCircle2,
  CheckSquare,
  Square,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  usePendingApprovals,
  useRecentlyReviewedEvents,
  useBulkApproveEvents,
} from "@/lib/queries/admin";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type QueueTab = "PENDING" | "APPROVED" | "REJECTED";

export const AdminApprovalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<QueueTab>("PENDING");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const { data: pendingEvents, isLoading: isPendingLoading } = usePendingApprovals();
  const { data: approvedEvents, isLoading: isApprovedLoading } = useRecentlyReviewedEvents("APPROVED");
  const { data: rejectedEvents, isLoading: isRejectedLoading } = useRecentlyReviewedEvents("REJECTED");

  const bulkApproveMutation = useBulkApproveEvents();

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
        <div className="flex items-center gap-2 border-b pb-3">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "PENDING"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Pending Queue</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "PENDING" ? "bg-white/20 text-white" : "bg-white text-slate-700"
              }`}
            >
              {pendingEvents?.length || 0}
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
            <span>Recently Approved</span>
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
            <span>Recently Rejected</span>
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
                          {/* Multi-select checkbox */}
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(event.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                          </td>

                          {/* Banner & Title */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0">
                                {event.bannerUrl ? (
                                  <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-indigo-900 flex items-center justify-center text-white">
                                    <Sparkles className="w-5 h-5 text-amber-300" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 max-w-[240px]">
                                <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  {event.title}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {event.organiserName} &bull; {event.department}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="p-4">
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                              {event.category}
                            </Badge>
                          </td>

                          {/* Schedule */}
                          <td className="p-4 whitespace-nowrap text-slate-600">
                            <div>{format(event.startAt, "MMM d, yyyy")}</div>
                            <div className="text-[10px] text-slate-400">{format(event.startAt, "h:mm a")}</div>
                          </td>

                          {/* Venue */}
                          <td className="p-4 max-w-[160px] truncate text-slate-600">
                            {event.venueLocation}
                          </td>

                          {/* Capacity & Fee */}
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{event.capacity} seats</div>
                            <div className="text-[11px] text-emerald-600 font-bold">
                              {event.isPaid ? `₹${event.price}` : "Free"}
                            </div>
                          </td>

                          {/* SLA Pill */}
                          <td className="p-4 whitespace-nowrap">
                            {getSlaBadge(event.createdAt)}
                          </td>

                          {/* Action Button */}
                          <td className="p-4 text-right whitespace-nowrap">
                            <Button
                              asChild
                              size="sm"
                              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 px-3.5 shadow-xs"
                            >
                              <Link to={`/admin/approvals/${event.id}`}>
                                <span>Review &rarr;</span>
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto stroke-1" />
                        <div className="font-bold text-slate-800">All Clear! Queue Empty</div>
                        <p className="text-xs text-slate-400">There are no pending events requiring administrative review.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* =================================================================== */}
        {/* TAB 2: RECENTLY APPROVED */}
        {/* =================================================================== */}
        {activeTab === "APPROVED" && (
          <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Event Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Organiser</th>
                    <th className="p-4">Event Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isApprovedLoading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Loading approved events...</span>
                      </td>
                    </tr>
                  ) : approvedEvents && approvedEvents.length > 0 ? (
                    approvedEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50/70">
                        <td className="p-4 font-bold text-slate-900 max-w-[260px] truncate">{event.title}</td>
                        <td className="p-4"><Badge variant="secondary" className="text-[10px]">{event.category}</Badge></td>
                        <td className="p-4 text-slate-600">{event.organiserName}</td>
                        <td className="p-4 text-slate-500">{format(event.startAt, "MMM d, yyyy")}</td>
                        <td className="p-4"><Badge variant="emerald">PUBLISHED</Badge></td>
                        <td className="p-4 text-right">
                          <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-indigo-600">
                            <Link to={`/events/${event.id}`}>View &rarr;</Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">No recently approved events.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* =================================================================== */}
        {/* TAB 3: RECENTLY REJECTED */}
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
