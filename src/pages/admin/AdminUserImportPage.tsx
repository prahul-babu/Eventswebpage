import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  Trash2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useImportRosterAllowlist, useSystemConfig } from "@/lib/queries/adminUsers";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ParsedRosterRow {
  id: string;
  email: string;
  name: string;
  role: "student" | "faculty";
  department: string;
  rollNumber?: string;
  employeeId?: string;
  year?: string;
  section?: string;
  isValid: boolean;
  validationError?: string;
}

export const AdminUserImportPage: React.FC = () => {
  const { data: config } = useSystemConfig();
  const importMutation = useImportRosterAllowlist();

  const [parsedRows, setParsedRows] = useState<ParsedRosterRow[]>([]);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "email,name,role,department,rollNumber,employeeId,year,section\n" +
      "rohan.sharma@student.apollouniversity.edu.in,Rohan Sharma,student,Computer Science,21CS101,,4th Year,A\n" +
      "dr.ananya@apollouniversity.edu.in,Dr. Ananya Ray,faculty,Electronics & Comm,,EMP9082,,\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Apollo_University_Roster_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.info("Roster Template Downloaded", {
      description: "Fill with campus emails and upload below.",
    });
  };

  // CSV File Parser with Papaparse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const allowedDomains = config?.allowedEmailDomains || ["apollouniversity.edu.in", "student.apollouniversity.edu.in"];
        const seenEmails = new Set<string>();

        const rows: ParsedRosterRow[] = results.data.map((raw: any, idx: number) => {
          const email = (raw.email || "").trim().toLowerCase();
          const name = (raw.name || "").trim();
          const role = ((raw.role || "").toLowerCase() === "faculty" ? "faculty" : "student") as "student" | "faculty";
          const department = (raw.department || "General").trim();
          const rollNumber = raw.rollNumber?.trim();
          const employeeId = raw.employeeId?.trim();
          const year = raw.year?.trim();
          const section = raw.section?.trim();

          let isValid = true;
          let validationError = "";

          if (!email || !email.includes("@")) {
            isValid = false;
            validationError = "Invalid email format";
          } else {
            const domain = email.split("@")[1];
            const isDomainAllowed = allowedDomains.some((d) => domain === d || domain.endsWith("." + d));
            if (!isDomainAllowed) {
              isValid = false;
              validationError = `Domain @${domain} not allowed`;
            } else if (seenEmails.has(email)) {
              isValid = false;
              validationError = "Duplicate email in CSV";
            }
          }

          if (!name) {
            isValid = false;
            validationError = "Name is required";
          }

          if (isValid) {
            seenEmails.add(email);
          }

          return {
            id: `row_${idx}`,
            email,
            name,
            role,
            department,
            rollNumber,
            employeeId,
            year,
            section,
            isValid,
            validationError,
          };
        });

        setParsedRows(rows);
        toast.success("CSV Parsed Successfully", {
          description: `Loaded ${rows.length} rows. Please verify preview before committing.`,
        });
      },
      error: (err) => {
        toast.error("CSV Parse Failed", { description: err.message });
      },
    });
  };

  const validRowsCount = useMemo(() => parsedRows.filter((r) => r.isValid).length, [parsedRows]);
  const invalidRowsCount = parsedRows.length - validRowsCount;

  // Submit to Cloud Function
  const handleCommitImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No Valid Rows to Import");
      return;
    }

    try {
      const res = await importMutation.mutateAsync({ records: validRows });
      setImportResult(res);
      setSummaryModalOpen(true);
      setParsedRows([]);
    } catch {
      // Handled by toast
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Institutional Roster Allowlist Import"
        description="Bulk provision student enrollment and faculty registries. Matched identities skip the onboarding gate upon Microsoft SSO sign-in."
        badge={{ text: "Bulk Provisioning", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="rounded-xl text-xs gap-1.5 h-9 bg-white"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Download CSV Template</span>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-9 bg-white">
              <Link to="/admin/users">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>User Directory</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Upload Dropzone */}
        <Card className="p-8 rounded-3xl border-2 border-dashed border-slate-300 bg-white text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Upload Campus Roster CSV</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select or drop your exported university registrar spreadsheet. Handles 1,000+ records seamlessly.
            </p>
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all">
              <Upload className="w-3.5 h-3.5" />
              <span>Select CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </Card>

        {/* Parsed Rows Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <Badge variant="emerald" className="text-xs font-bold">
                  {validRowsCount} Valid Rows
                </Badge>
                {invalidRowsCount > 0 && (
                  <Badge variant="destructive" className="text-xs font-bold">
                    {invalidRowsCount} Invalid / Skipped
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setParsedRows([])}
                  className="rounded-xl text-xs h-9"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Clear</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCommitImport}
                  disabled={importMutation.isPending || validRowsCount === 0}
                  className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 shadow-xs gap-1.5"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing Batches of 400...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Commit Import ({validRowsCount} Records)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">ID / Roll</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          row.isValid ? "hover:bg-slate-50" : "bg-rose-50/50"
                        }`}
                      >
                        <td className="p-3 whitespace-nowrap">
                          {row.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{row.validationError}</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 font-mono text-[11px]">{row.email}</td>
                        <td className="p-3 font-bold text-slate-900">{row.name}</td>
                        <td className="p-3 uppercase font-semibold text-slate-700">{row.role}</td>
                        <td className="p-3">{row.department}</td>
                        <td className="p-3 font-mono text-slate-500">{row.rollNumber || row.employeeId || "-"}</td>

                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setParsedRows((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Summary Modal */}
      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Roster Allowlist Updated
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Successfully wrote batch records to the institutional allowlist.
            </DialogDescription>
          </DialogHeader>

          {importResult && (
            <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs text-slate-700 border">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Processed:</span>
                <strong className="text-slate-900">{importResult.totalSubmitted}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 font-bold">Successfully Allowlisted:</span>
                <strong className="text-emerald-700">{importResult.importedCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Skipped / Failed:</span>
                <strong className="text-slate-900">{importResult.skippedCount}</strong>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button size="sm" onClick={() => setSummaryModalOpen(false)} className="w-full rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminUserImportPage;
