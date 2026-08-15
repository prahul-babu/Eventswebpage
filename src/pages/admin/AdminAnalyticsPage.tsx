import React, { useState } from "react";
import {
  Award,
  Loader2,
  Download,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAdminPlatformAnalytics } from "@/lib/queries/analytics";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const AdminAnalyticsPage: React.FC = () => {
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [dateRange, setDateRange] = useState("all");
  const { data, isLoading } = useAdminPlatformAnalytics(academicYear, dateRange);

  const handleExportCsv = () => {
    if (!data) return;

    const headers = ["Metric", "Value"];
    const rows = [
      ["Total Campus Users", data.totalUsers],
      ["Student Body", data.studentCount],
      ["Faculty Body", data.facultyCount],
      ["Total Campus Events", data.totalEvents],
      ["Total Registrations", data.totalRegistrations],
      ["Total Attended", data.totalAttended],
      ["Platform Attendance Rate", `${data.attendanceRate}%`],
      ["Student Engagement Rate", `${data.studentEngagementRate}%`],
      ["Gross Revenue Processed", `₹${data.totalRevenue}`],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Apollo_Institutional_Analytics_${academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Institutional Analytics Exported", { description: "CSV downloaded." });
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Aggregating institutional data streams...</p>
      </div>
    );
  }

  const {
    totalUsers = 0,
    studentCount = 0,
    facultyCount = 0,
    totalEvents = 0,
    totalRegistrations = 0,
    totalAttended = 0,
    totalRevenue = 0,
    attendanceRate = 0,
    studentEngagementRate = 0,
    eventsPerMonth = [],
    eventsByCategory = [],
    eventsByDepartment = [],
    registrationsTrend = [],
    topOrganisers = [],
  } = data || {};

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Institutional Platform Analytics"
        description="Campus-wide event engagement metrics, student participation rates, departmental activity, and revenue streams."
        badge={{ text: "Executive Insights", variant: "amber" }}
        actions={
          <Button
            size="sm"
            onClick={handleExportCsv}
            className="rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold gap-1.5 h-9 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Analytics CSV</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Global Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Filter Dataset:</span>
            <Select value={academicYear} onValueChange={setAcademicYear}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-36 bg-slate-50">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-26">AY 2025-26</SelectItem>
                <SelectItem value="2024-25">AY 2024-25</SelectItem>
                <SelectItem value="2023-24">AY 2023-24</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-40 bg-slate-50">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Full Academic Year</SelectItem>
                <SelectItem value="q1">Q1 (Aug - Oct)</SelectItem>
                <SelectItem value="q2">Q2 (Nov - Jan)</SelectItem>
                <SelectItem value="q3">Q3 (Feb - Apr)</SelectItem>
                <SelectItem value="q4">Q4 (May - Jul)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Dataset: <strong className="text-slate-700">{totalEvents} Events</strong> &bull; <strong className="text-slate-700">{totalRegistrations} Registrations</strong>
          </div>
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 rounded-3xl border-slate-200/90 shadow-sm bg-white space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Student Engagement Rate
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-black text-indigo-600">
                {studentEngagementRate}%
              </strong>
              <span className="text-xs text-slate-400">of student body</span>
            </div>
            <p className="text-[11px] text-slate-500">Students who attended &ge;1 event</p>
          </Card>

          <Card className="p-5 rounded-3xl border-slate-200/90 shadow-sm bg-white space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Average Attendance Rate
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-black text-emerald-600">
                {attendanceRate}%
              </strong>
              <span className="text-xs text-slate-400">({totalAttended} attendees)</span>
            </div>
            <p className="text-[11px] text-slate-500">Turnout vs total confirmed bookings</p>
          </Card>

          <Card className="p-5 rounded-3xl border-slate-200/90 shadow-sm bg-white space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Gross Revenue Realized
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-black text-amber-600 font-mono">
                ₹{totalRevenue.toLocaleString()}
              </strong>
            </div>
            <p className="text-[11px] text-slate-500">Processed via Razorpay gateway</p>
          </Card>

          <Card className="p-5 rounded-3xl border-slate-200/90 shadow-sm bg-white space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Campus User Community
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-black text-slate-900">
                {totalUsers}
              </strong>
              <span className="text-xs text-slate-400">({studentCount} stu / {facultyCount} fac)</span>
            </div>
            <p className="text-[11px] text-slate-500">Active SSO university accounts</p>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Events per Month by Status (Stacked Bar) */}
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b pb-2">
              <span>Events Volume by Lifecycle Status</span>
              <span className="text-[11px] font-normal text-slate-400">Monthly</span>
            </h3>

            {eventsPerMonth.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventsPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="published" name="Live / Published" stackId="a" fill="#4f46e5" />
                    <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" />
                    <Bar dataKey="draft" name="Drafts / Pending" stackId="a" fill="#e2e8f0" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No data for this period.
              </div>
            )}
          </Card>

          {/* Chart 2: Registrations & Revenue Trend */}
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b pb-2">
              <span>Registration Demand &amp; Inflow Trajectory</span>
              <span className="text-[11px] font-normal text-slate-400">Monthly</span>
            </h3>

            {registrationsTrend.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={registrationsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="registrations"
                      name="Registrations"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue (₹)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No data for this period.
              </div>
            )}
          </Card>

          {/* Chart 3: Events by Category */}
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
              Events by Category
            </h3>

            {eventsByCategory.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventsByCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Bar dataKey="count" fill="#ec4899" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No data for this period.
              </div>
            )}
          </Card>

          {/* Chart 4: Events by Department */}
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
              Events by School &amp; Department
            </h3>

            {eventsByDepartment.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventsByDepartment} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No data for this period.
              </div>
            )}
          </Card>
        </div>

        {/* Top 10 Faculty Organisers Leaderboard */}
        <Card className="rounded-3xl border-slate-200/90 bg-white shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Top 10 Faculty Event Hosts
              </h3>
            </div>
            <span className="text-xs text-slate-400">Ranked by Total Events Hosted</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Faculty Organiser</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3 text-center">Events Hosted</th>
                  <th className="p-3 text-right">Total Attendees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {topOrganisers.length > 0 ? (
                  topOrganisers.map((org, index) => (
                    <tr key={org.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-900 font-mono">#{index + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{org.name}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{org.email || "faculty@apollo.edu.in"}</td>
                      <td className="p-3 text-center">
                        <Badge variant="indigo" className="text-[10px] font-mono font-bold">
                          {org.eventsCount} Events
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        {org.registrationsCount}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No host activity recorded yet.
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
export default AdminAnalyticsPage;
