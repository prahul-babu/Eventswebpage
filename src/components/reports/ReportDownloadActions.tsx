import React, { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventReport } from "@/types";
import { downloadEventReportPdf } from "@/lib/pdf/reportPdfGenerator";
import { downloadEventReportDocx } from "@/lib/docx/reportDocxGenerator";
import { toast } from "sonner";

interface ReportDownloadActionsProps {
  report: EventReport;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export const ReportDownloadActions: React.FC<ReportDownloadActionsProps> = ({
  report,
  size = "sm",
  className = "",
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      downloadEventReportPdf(report);
      toast.success("PDF Report Exported", {
        description: `Downloaded ${report.eventTitle} official report as PDF.`,
      });
    } catch (err: any) {
      console.error("[ReportDownloadActions] PDF export error:", err);
      toast.error("PDF Export Failed", {
        description: err.message || "Unable to generate PDF document.",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    try {
      await downloadEventReportDocx(report);
      toast.success("Word Document Exported", {
        description: `Downloaded ${report.eventTitle} official report as .docx.`,
      });
    } catch (err: any) {
      console.error("[ReportDownloadActions] Word export error:", err);
      toast.error("Word Export Failed", {
        description: err.message || "Unable to generate Word document.",
      });
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Download PDF Button */}
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={isExportingPdf}
        onClick={handleDownloadPdf}
        className="rounded-xl text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5 h-9 shadow-2xs"
        title="Download Official PDF Report"
      >
        {isExportingPdf ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-rose-600" />
        )}
        <span>Download PDF</span>
      </Button>

      {/* Download Word DOCX Button */}
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={isExportingDocx}
        onClick={handleDownloadDocx}
        className="rounded-xl text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5 h-9 shadow-2xs"
        title="Download Official Microsoft Word (.docx) Report"
      >
        {isExportingDocx ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5 text-blue-600" />
        )}
        <span>Download Word</span>
      </Button>
    </div>
  );
};

export default ReportDownloadActions;
