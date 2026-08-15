import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Plus,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useFacultyEvents, useFacultyDashboardMetrics } from "@/lib/queries/faculty";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const FacultyDashboardPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const { data: metrics, isLoading: isMetricsLoading } = useFacultyDashboardMetrics(firebaseUser?.uid);
  const { data: events, isLoading: isEventsLoading } = useFacultyEvents(firebaseUser?.uid);

  const getStatusBadge = (status: string) => {
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
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Faculty Management Portal"
        description="Oversee departmental symposiums, track live attendee counts, revenue collections, and manage administrative approval workflows."
        badge={{ text: "Organiser Suite", variant: "indigo" }}
        actions={
          <Button asChild size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-md">
            <Link to="/faculty/events/new">
              <Plus className="w-4 h-4" />
              <span>Create New Event</span>
            </Link>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* 1. Stat Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-slate-200/90 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-4 sm:p-5 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Hosted</div>
              <div className="text-2xl font-extrabold text-slate-900">
                {isMetricsLoading ? "..." : metrics?.totalEvents ?? 0}
              </div>
              <div className="text-[10px] text-slate-500">All campus events</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-4 sm:p-5 space-y-1">
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Review</div>
              <div className="text-2xl font-extrabold text-amber-700">
                {isMetricsLoading ? "..." : metrics?.pendingApprovalCount ?? 0}
              </div>
              <div className="text-[10px] text-slate-500">With Admin Board</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-4 sm:p-5 space-y-1">
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Published</div>
              <div className="text-2xl font-extrabold text-emerald-700">
                {isMetricsLoading ? "..." : metrics?.publishedCount ?? 0}
              </div>
              <div className="text-[10px] text-slate-500">Live in catalog</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-4 sm:p-5 space-y-1">
              <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Total Attendees</div>
              <div className="text-2xl font-extrabold text-indigo-900">
                {isMetricsLoading ? "..." : metrics?.totalRegistrations ?? 0}
              </div>
              <div className="text-[10px] text-slate-500">Booked passes</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 shadow-sm rounded-2xl bg-white col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-5 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revenue</div>
              <div className="text-2xl font-extrabold text-emerald-600">
                ₹{isMetricsLoading ? "..." : (metrics?.totalRevenue ?? 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500">Razorpay settlements</div>
            </CardContent>
          </Card>
        </div>

        {/* 2. "Needs Your Attention" Panel */}
        {metrics &&
          (metrics.needsAttention.rejectedEvents.length > 0 ||
            metrics.needsAttention.closingSoonEvents.length > 0 ||
            metrics.needsAttention.completedAwaitingReport.length > 0) && (
            <Card className="border-amber-200 bg-amber-50/40 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-amber-100 bg-amber-100/50">
                <CardTitle className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Needs Your Attention</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {/* Rejected Events */}
                {metrics.needsAttention.rejectedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-white rounded-2xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px]">Action Required: Rejected</Badge>
                        <span className="font-bold text-xs text-slate-900">{event.title}</span>
                      </div>
                      <p className="text-xs text-rose-700 font-medium">
                        Admin Feedback: {event.rejectionReason || "Please review event details and resubmit."}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="rounded-xl text-xs shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50">
                      <Link to={`/faculty/events/${event.id}/edit`}>Edit &amp; Resubmit</Link>
                    </Button>
                  </div>
                ))}

                {/* Closing Soon Events */}
                {metrics.needsAttention.closingSoonEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-white rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="amber" className="text-[10px]">Closing Soon</Badge>
                        <span className="font-bold text-xs text-slate-900">{event.title}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Registration closes on {format(event.registrationDeadline, "MMM d, h:mm a")} ({event.registeredCount} / {event.capacity} seats filled).
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="rounded-xl text-xs shrink-0">
                      <Link to={`/faculty/events/${event.id}/registrants`}>View Registrants</Link>
                    </Button>
                  </div>
                ))}

                {/* Completed Events Awaiting Report */}
                {metrics.needsAttention.completedAwaitingReport.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="indigo" className="text-[10px]">Awaiting Report</Badge>
                        <span className="font-bold text-xs text-slate-900">{event.title}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Event concluded. Generate attendance &amp; institutional outcome report.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="rounded-xl text-xs shrink-0">
                      <Link to="/faculty/reports">Create Report</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        {/* 3. Recent Events Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Recent Events</h2>
              <p className="text-xs text-slate-500">Track registration velocity and event status updates.</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              <Link to="/faculty/events" className="flex items-center gap-1">
                <span>View all ({events?.length || 0})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Event Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Schedule</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Registrations</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isEventsLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Loading events...</span>
                      </td>
                    </tr>
                  ) : events && events.length > 0 ? (
                    events.slice(0, 5).map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 font-bold text-slate-900 max-w-[240px] truncate">
                          {event.title}
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-[10px]">{event.category}</Badge>
                        </td>
                        <td className="p-4 text-slate-500">
                          {format(event.startAt, "MMM d, yyyy")}
                        </td>
                        <td className="p-4">{getStatusBadge(event.status)}</td>
                        <td className="p-4 font-medium">
                          <strong>{event.registeredCount || 0}</strong> / {event.capacity || 0}
                        </td>
                        <td className="p-4 text-right">
                          <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-indigo-600 hover:text-indigo-800">
                            <Link to={`/faculty/events/${event.id}/registrants`}>Roster &rarr;</Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No events hosted yet. Click "Create New Event" to begin!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default FacultyDashboardPage;
