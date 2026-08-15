import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Award,
  Calendar,
  Clock,
  Download,
  Ticket,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { jsPDF } from "jspdf";
import { useAuth } from "@/lib/auth-context";
import { useStudentParticipation } from "@/lib/queries/analytics";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const StudentParticipationPage: React.FC = () => {
  const { firebaseUser, profile } = useAuth();
  const { data, isLoading } = useStudentParticipation(firebaseUser?.uid);

  // Generate Official Certificate of Participation PDF
  const handleDownloadCertificate = (item: any) => {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      // Certificate Border & Frame
      doc.setDrawColor(49, 46, 129); // Indigo 900
      doc.setLineWidth(3);
      doc.rect(10, 10, width - 20, height - 20);

      doc.setDrawColor(251, 191, 36); // Amber 400
      doc.setLineWidth(1);
      doc.rect(14, 14, width - 28, height - 28);

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(49, 46, 129);
      doc.text("THE APOLLO UNIVERSITY", width / 2, 35, { align: "center" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("DIRECTORATE OF STUDENT & ACADEMIC AFFAIRS", width / 2, 42, { align: "center" });

      // Certificate Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(30, 41, 59);
      doc.text("CERTIFICATE OF PARTICIPATION", width / 2, 65, { align: "center" });

      // Recipient
      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("This is to proudly certify that", width / 2, 80, { align: "center" });

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(49, 46, 129);
      doc.text(profile?.displayName || firebaseUser?.displayName || "Campus Scholar", width / 2, 95, {
        align: "center",
      });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      const subDetails = `Roll No: ${profile?.rollNumber || "AU-STUDENT"} | Department of ${profile?.department || "Technology"}`;
      doc.text(subDetails, width / 2, 103, { align: "center" });

      // Body text
      doc.setFontSize(13);
      doc.setTextColor(51, 65, 85);
      const text = `has actively participated and successfully completed the university event`;
      doc.text(text, width / 2, 118, { align: "center" });

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(`"${item.eventTitle}"`, width / 2, 130, { align: "center" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Category: ${item.category} | Date: ${format(new Date(item.date), "MMMM d, yyyy")} | Venue: ${item.venue}`,
        width / 2,
        140,
        { align: "center" }
      );

      // Signatures
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("_________________________", 60, 175, { align: "center" });
      doc.text("Dean / Faculty Coordinator", 60, 182, { align: "center" });

      doc.text("_________________________", width - 60, 175, { align: "center" });
      doc.text("Registrar / Vice Chancellor", width - 60, 182, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("courier", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(`Certificate ID: APL-CERT-${item.ticketCode}-${Date.now().toString().slice(-6)}`, width / 2, 195, {
        align: "center",
      });

      doc.save(`Apollo_Certificate_${item.eventTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
      toast.success("Certificate Downloaded", { description: `Participation certificate generated for ${item.eventTitle}.` });
    } catch (err: any) {
      toast.error("Certificate Generation Failed", { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Computing your campus transcript &amp; hours...</p>
      </div>
    );
  }

  const { totalAttended = 0, totalHours = 0, categoryDonut = [], attendedTimeline = [] } = data || {};

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="My Participation Transcript"
        description="Comprehensive record of campus events attended, accredited participation hours, and verified event certificates."
        badge={{ text: "Student Transcript", variant: "indigo" }}
        actions={
          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-9 bg-white">
            <Link to="/events">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Explore More Events</span>
            </Link>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Stat Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-6 rounded-3xl border-slate-200/90 shadow-sm bg-white flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Events Attended
              </span>
              <strong className="text-2xl font-black text-slate-900">{totalAttended}</strong>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border-slate-200/90 shadow-sm bg-white flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Campus Hours
              </span>
              <strong className="text-2xl font-black text-slate-900">{totalHours} hrs</strong>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border-slate-200/90 shadow-sm bg-white flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Issued Certificates
              </span>
              <strong className="text-2xl font-black text-slate-900">{attendedTimeline.length}</strong>
            </div>
          </Card>
        </div>

        {/* Charts & Timeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Category Breakdown Donut */}
          <Card className="p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
              Category Distribution
            </h3>

            {categoryDonut.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryDonut.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} Events`, "Attended"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No attendance data for this period.
              </div>
            )}
          </Card>

          {/* Right: Attended Events Timeline */}
          <Card className="lg:col-span-2 p-6 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
              <span>Attended Events &amp; Verified Certificates</span>
              <span className="text-xs font-normal text-slate-400">{attendedTimeline.length} completed</span>
            </h3>

            <div className="space-y-3">
              {attendedTimeline.length > 0 ? (
                attendedTimeline.map((item) => (
                  <div
                    key={item.eventId}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="indigo" className="text-[10px]">
                          {item.category}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {format(new Date(item.date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.eventTitle}</h4>
                      <p className="text-slate-500 text-[11px]">
                        {item.venue} &bull; Accredited {item.durationHours} hrs
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleDownloadCertificate(item)}
                        className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-8 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Certificate</span>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                  <p>No verified event attendances recorded yet.</p>
                  <Button asChild size="sm" variant="outline" className="rounded-xl text-xs mt-2">
                    <Link to="/events">Browse Live Events</Link>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default StudentParticipationPage;
