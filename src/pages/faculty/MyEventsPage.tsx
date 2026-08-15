import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Users,
  Edit,
  Eye,
  Send,
  RotateCcw,
  MoreVertical,
  ArrowUpDown,
  Loader2,
  FileText,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useFacultyEvents,
  useWithdrawEvent,
  useSubmitEventForApproval,
} from "@/lib/queries/faculty";
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
import { EventStatus } from "@/types";

type StatusTab = "ALL" | EventStatus;

export const MyEventsPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const { data: events, isLoading } = useFacultyEvents(firebaseUser?.uid, firebaseUser?.email);

  const withdrawMutation = useWithdrawEvent();
  const submitMutation = useSubmitEventForApproval();

  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"createdAt" | "title" | "registeredCount">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filtering & Sorting
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    return events
      .filter((event) => {
        // Tab Filter
        if (activeTab !== "ALL" && event.status !== activeTab) {
          return false;
        }

        // Search Filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchTitle = event.title.toLowerCase().includes(query);
          const matchCategory = event.category.toLowerCase().includes(query);
          const matchLocation = event.venueLocation.toLowerCase().includes(query);
          return matchTitle || matchCategory || matchLocation;
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
        // default: createdAt
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      });
  }, [events, activeTab, searchQuery, sortField, sortOrder]);

  const handleWithdraw = async (eventId: string) => {
    try {
      await withdrawMutation.mutateAsync({ eventId });
    } catch {
      // Error handled by mutation toast
    }
  };

  const handleSubmitForApproval = async (eventId: string) => {
    try {
      await submitMutation.mutateAsync({ eventId });
    } catch {
      // Error handled by mutation toast
    }
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
        title="Departmental Events Catalog"
        description="Manage your event submissions, monitor registrations, edit event metadata, and check in students."
        badge={{ text: "Event Registry", variant: "indigo" }}
        actions={
          <Button asChild size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-md">
            <Link to="/faculty/events/new">
              <Plus className="w-4 h-4" />
              <span>Create New Event</span>
            </Link>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
            {(
              [
                { id: "ALL", label: "All Events" },
                { id: "DRAFT", label: "Drafts" },
                { id: "PENDING_APPROVAL", label: "Pending" },
                { id: "PUBLISHED", label: "Published" },
                { id: "COMPLETED", label: "Completed" },
                { id: "REJECTED", label: "Rejected" },
              ] as { id: StatusTab; label: string }[]
            ).map((tab) => {
              const count =
                tab.id === "ALL"
                  ? events?.length || 0
                  : events?.filter((e) => e.status === tab.id).length || 0;

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

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or venue..."
              className="h-9 pl-9 text-xs rounded-xl bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Events Data Table */}
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
                      <span>Event Title</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Event Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => {
                    setSortField("registeredCount");
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}>
                    <div className="flex items-center gap-1">
                      <span>Registrations</span>
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
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Loading your events catalog...</span>
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
                          <div className="text-[10px] text-slate-400 truncate max-w-[280px]">
                            {event.venueLocation}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-[10px] uppercase">{event.category}</Badge>
                        </td>
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                          {format(event.startAt, "MMM d, yyyy")}
                        </td>
                        <td className="p-4 whitespace-nowrap">{getStatusBadge(event.status)}</td>
                        <td className="p-4 whitespace-nowrap font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{event.registeredCount || 0}</span>
                            <span className="text-slate-400">/ {event.capacity}</span>
                          </div>
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
                              {/* View Details / Live Page */}
                              <DropdownMenuItem asChild>
                                <Link to={`/events/${event.id}`} className="gap-2 cursor-pointer">
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Public Preview</span>
                                </Link>
                              </DropdownMenuItem>

                              {/* Registrants Roster */}
                              <DropdownMenuItem asChild>
                                <Link to={`/faculty/events/${event.id}/registrants`} className="gap-2 cursor-pointer">
                                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>View Registrants</span>
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Editing logic according to Rule 6 */}
                              {(event.status === "DRAFT" || event.status === "REJECTED" || event.status === "PUBLISHED") && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/faculty/events/${event.id}/edit`} className="gap-2 cursor-pointer">
                                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Edit Event</span>
                                  </Link>
                                </DropdownMenuItem>
                              )}

                              {/* Submit for Approval if Draft/Rejected */}
                              {(event.status === "DRAFT" || event.status === "REJECTED") && (
                                <DropdownMenuItem
                                  onClick={() => handleSubmitForApproval(event.id)}
                                  className="gap-2 cursor-pointer text-indigo-600 font-semibold"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Submit for Approval</span>
                                </DropdownMenuItem>
                              )}

                              {/* Withdraw if Pending */}
                              {event.status === "PENDING_APPROVAL" && (
                                <DropdownMenuItem
                                  onClick={() => handleWithdraw(event.id)}
                                  className="gap-2 cursor-pointer text-amber-600 font-semibold"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Withdraw to Edit</span>
                                </DropdownMenuItem>
                              )}

                              {/* Submit Report if Completed */}
                              {event.status === "COMPLETED" && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    to={`/faculty/events/${event.id}/report`}
                                    className="gap-2 cursor-pointer text-indigo-600 font-bold"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Submit Post-Event Report</span>
                                  </Link>
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
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No events matching "{activeTab}" filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default MyEventsPage;
