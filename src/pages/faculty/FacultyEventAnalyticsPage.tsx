import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Users,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Loader2,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useFacultyEventAnalytics } from "@/lib/queries/analytics";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const FacultyEventAnalyticsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { data, isLoading } = useFacultyEventAnalytics(eventId);

  const handleExportCsv = () => {
    if (!data) return;

    const headers = ["Metric", "Value"];
    const rows = [
      ["Event Title", `"${data.eventTitle}"`],
      ["Category", data.category],
      ["Total Registrations", data.totalRegistered],
      ["Total Attended", data.totalAttended],
      ["Attendance Rate", `${data.attendanceRate}%`],
      ["Capacity", data.capacity],
      ["Revenue Collected", `₹${data.revenueCollected}`],
      ["Revenue Target", `₹${data.revenueTarget}`],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Event_Analytics_${data.eventTitle.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Analytics Data Exported", { description: "CSV downloaded." });
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Aggregating event analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <p className="text-xs text-slate-500">Event analytics not available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title={`${data.eventTitle} — Analytics`}
        description="Live attendance rates, registration trajectory, academic demographic breakdowns, and revenue realization."
        badge={{ text: "Event Intelligence", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-9 bg-white">
              <Link to="/faculty/events">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>My Events</span>
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={handleExportCsv}
              className="rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold gap-1.5 h-9 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Analytics CSV</span>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-5 rounded-3xl border-slate-200/90 shadow-sm bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Registrations
              </span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-black text-slate-900">{data.totalRegistered}</strong>
              <span className="text-xs text-slate-400">/ {data.capacity} seats</span>
            </div>
          </Card>

          <Card className="p-5 rounded-3xl border-slate-200/90 shadow-sm bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Attendance Rate
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-black text-emerald-600">{data.attendanceRate}%</strong>
              <span className="text-xs text-slate-400">({data.totalAttended} checked in)</span>
            </div>
          </Card>

          <Card className="p-5 rounded-3xl border-slate-200/90 shadow-sm bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Gross Revenue
              </span>
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-black text-slate-900 font-mono">
                ₹{data.revenueCollected.toLocaleString()}
              </strong>
              {data.revenueTarget > 0 && (
                <span className="text-xs text-slate-400">/ ₹{data.revenueTarget.toLocaleString()}</span>
              )}
            </div>
          </Card>

          <Card className="p-5 rounded-3xl border-slate-200/90 shadow-sm bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Check-in Gate
              </span>
              <Badge variant="emerald" className="text-[10px]">Live</Badge>
            </div>
            <Button asChild size="sm" className="w-full rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8">
              <Link to={`/faculty/events/${eventId}/check-in`}>Open Scanner Gate</Link>
            </Button>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Registrations Trajectory Over Time */}
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Registrations Over Time</span>
              </h3>
            </div>

            {data.registrationsOverTime.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.registrationsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                      formatter={(val: any) => [`${val} Bookings`, "Registrations"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      name="Cumulative Registrations"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No registration timeline data for this period.
              </div>
            )}
          </Card>

          {/* Chart 2: Departmental Breakdown */}
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Departmental Distribution</span>
              </h3>
            </div>

            {data.departmentBreakdown.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.departmentBreakdown} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                      formatter={(val: any) => [`${val} Attendees`, "Students"]}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No departmental data for this period.
              </div>
            )}
          </Card>

          {/* Chart 3: Academic Year Distribution */}
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Academic Year Breakdown</span>
              </h3>
            </div>

            {data.yearBreakdown.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.yearBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                      formatter={(val: any) => [`${val} Students`, "Registrations"]}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No year-wise data for this period.
              </div>
            )}
          </Card>

          {/* Chart 4: Payment Status Split */}
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-600" />
                <span>Payment &amp; Booking Split</span>
              </h3>
            </div>

            {data.paymentSplit.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.paymentSplit}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.paymentSplit.map((entry, index) => (
                        <Cell key={`pay-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} Passes`, "Status"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No transaction data for this period.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
export default FacultyEventAnalyticsPage;
