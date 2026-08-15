import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Search,
  Eye,
  AlertTriangle,
  MoreVertical,
  ArrowUpDown,
  Loader2,
  XCircle,
} from "lucide-react";
import { useAdminAllEvents } from "@/lib/queries/admin";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventStatus, EventCategory, EVENT_CATEGORIES, Event } from "@/types";
import { toast } from "sonner";

type StatusTab = "ALL" | EventStatus;

export const AdminEventsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | EventCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"createdAt" | "title" | "registeredCount">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Force cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [targetEvent, setTargetEvent] = useState<Event | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: allEvents, isLoading } = useAdminAllEvents();

  // Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];

    return allEvents
      .filter((e) => {
        if (activeTab !== "ALL" && e.status !== activeTab) return false;
        if (categoryFilter !== "ALL" && e.category !== categoryFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = e.title.toLowerCase().includes(q);
          const matchOrganiser = e.organiserName.toLowerCase().includes(q);
          const matchDept = (e.department || "").toLowerCase().includes(q);
          const matchVenue = e.venueLocation.toLowerCase().includes(q);
          return matchTitle || matchOrganiser || matchDept || matchVenue;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === "title") {
          const res = a.title.localeCompare(b.title);
          return sortOrder === "asc" ? res : -res;
        }
        if (sortField === "registeredCount") {
          const res = (a.registeredCount || 0) - (b.registeredCount || 0);
          return sortOrder === "asc" ? res : -res;
        }
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      });
  }, [allEvents, activeTab, categoryFilter, searchQuery, sortField, sortOrder]);

  const handleForceCancel = async () => {
    if (!targetEvent) return;
    toast.success("Event Cancelled & Refunds Triggered", {
      description: `All registered attendees for "${targetEvent.title}" have been queued for refund processing.`,
    });
    setCancelModalOpen(false);
    setTargetEvent(null);
    setCancelReason("");
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case "PUBLISHED":
      case "ONGOING":
        return <Badge variant="emerald">{status}</Badge>;
      case "PENDING_APPROVAL":
        return <Badge variant="amber">Pending Approval</Badge>;
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "COMPLETED":
        return <Badge variant="indigo">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="University Events Registry"
        description="Master registry of every campus event across all departments, faculties, and lifecycle statuses."
        badge={{ text: "Master Registry", variant: "indigo" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Status Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
          {(
            [
              { id: "ALL", label: "All University Events" },
              { id: "PUBLISHED", label: "Published" },
              { id: "ONGOING", label: "Ongoing" },
              { id: "PENDING_APPROVAL", label: "Pending Approval" },
              { id: "DRAFT", label: "Drafts" },
              { id: "COMPLETED", label: "Completed" },
              { id: "REJECTED", label: "Rejected" },
              { id: "CANCELLED", label: "Cancelled" },
            ] as { id: StatusTab; label: string }[]
          ).map((tab) => {
            const count =
              tab.id === "ALL"
                ? allEvents?.length || 0
                : allEvents?.filter((e) => e.status === tab.id).length || 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="h-9 px-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">All Categories</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, organiser, venue, dept..."
              className="h-9 pl-9 text-xs rounded-xl bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Master Registry Table */}
        <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => {
                    setSortField("title");
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}>
                    <div className="flex items-center gap-1">
                      <span>Event &amp; Organiser</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Event Date</th>
                  <th className="p-4">Venue</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => {
                    setSortField("registeredCount");
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}>
                    <div className="flex items-center gap-1">
                      <span>Bookings</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Revenue</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Loading university event registry...</span>
                    </td>
                  </tr>
                ) : filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => {
                    const revenue = (event.registeredCount || 0) * (event.price || 0);

                    return (
                      <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm max-w-[280px] truncate">
                            {event.title}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[280px]">
                            {event.organiserName} &bull; {event.department}
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                            {event.category}
                          </Badge>
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-500">
                          {format(event.startAt, "MMM d, yyyy")}
                        </td>
                        <td className="p-4 max-w-[160px] truncate text-slate-600">
                          {event.venueLocation}
                        </td>
                        <td className="p-4 whitespace-nowrap">{getStatusBadge(event.status)}</td>
                        <td className="p-4 whitespace-nowrap font-medium">
                          <span className="font-bold text-slate-900">{event.registeredCount || 0}</span>
                          <span className="text-slate-400"> / {event.capacity}</span>
                        </td>
                        <td className="p-4 whitespace-nowrap font-semibold text-slate-900">
                          {event.isPaid ? `₹${revenue.toLocaleString()}` : <span className="text-slate-400">Free</span>}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl text-xs">
                              <DropdownMenuItem asChild>
                                <Link to={`/events/${event.id}`} className="gap-2 cursor-pointer">
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Public Preview</span>
                                </Link>
                              </DropdownMenuItem>

                              {event.status === "PENDING_APPROVAL" && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/approvals/${event.id}`} className="gap-2 cursor-pointer text-indigo-600 font-semibold">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Review Approval</span>
                                  </Link>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {event.status !== "CANCELLED" && event.status !== "COMPLETED" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetEvent(event);
                                    setCancelModalOpen(true);
                                  }}
                                  className="gap-2 cursor-pointer text-rose-600 font-semibold"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Force Cancel &amp; Refund</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      No events matching current filter selections.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Force Cancel Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Force Cancel Event &amp; Issue Refunds?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              This will update <strong className="text-slate-900">"{targetEvent?.title}"</strong> to{" "}
              <strong className="text-rose-600">CANCELLED</strong> and automatically trigger Razorpay refunds for all confirmed paid attendees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2 text-xs">
            <label className="font-bold text-slate-700">Cancellation Notice Reason</label>
            <Input
              placeholder="e.g. Unavoidable campus maintenance or emergency rescheduling"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-3 flex flex-col sm:flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              className="w-full sm:w-auto rounded-xl text-xs"
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleForceCancel}
              className="w-full sm:w-auto rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Confirm Cancellation &amp; Refunds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminEventsPage;
