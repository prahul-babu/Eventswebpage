import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Mail,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { usePendingAccessRequests, useSetUserRole } from "@/lib/queries/adminUsers";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, UserRole } from "@/types";
import { toast } from "sonner";

export const AdminUserRequestsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests, isLoading } = usePendingAccessRequests();
  const setRoleMutation = useSetUserRole();

  const filteredRequests = useMemo(() => {
    if (!requests) return [];

    return requests.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (u.displayName || "").toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        const matchDept = (u.department || "").toLowerCase().includes(q);
        const matchId =
          (u.rollNumber || "").toLowerCase().includes(q) ||
          (u.employeeId || "").toLowerCase().includes(q);
        return matchName || matchEmail || matchDept || matchId;
      }
      return true;
    });
  }, [requests, roleFilter, searchQuery]);

  const handleApprove = async (targetUid: string, role: UserRole) => {
    try {
      await setRoleMutation.mutateAsync({
        targetUid,
        role,
        status: "ACTIVE",
      });
    } catch {
      // Handled by toast
    }
  };

  const handleConfirmReject = async () => {
    if (!targetUser) return;
    if (rejectionReason.trim().length < 10) {
      toast.error("Reason Required", {
        description: "Please provide a rejection explanation of at least 10 characters.",
      });
      return;
    }

    try {
      await setRoleMutation.mutateAsync({
        targetUid: targetUser.uid,
        role: targetUser.role,
        status: "REJECTED",
        rejectionReason: rejectionReason.trim(),
      });
      setRejectModalOpen(false);
      setTargetUser(null);
      setRejectionReason("");
    } catch {
      // Handled by toast
    }
  };

  const getSlaBadge = (createdAt: Date) => {
    const days = differenceInDays(new Date(), new Date(createdAt));
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
        title="Pending Access Requests"
        description="Verify student and faculty onboarding requests authenticated via Microsoft Entra ID before granting role-based access."
        badge={{ text: "Onboarding Gate", variant: "amber" }}
        actions={
          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-9 bg-white">
            <Link to="/admin/users">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Full User Directory</span>
            </Link>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as any)}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-white w-48">
                <SelectValue placeholder="Filter by Requested Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Requested Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, roll/emp ID..."
              className="h-9 pl-9 text-xs rounded-xl bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Requests Queue Cards */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
            <span>Loading pending access requests...</span>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((user) => {
              const appliedDate = user.createdAt ? new Date(user.createdAt) : new Date();

              return (
                <Card
                  key={user.uid}
                  className="rounded-3xl border border-slate-200/90 bg-white shadow-xs p-5 space-y-4 hover:shadow-md transition-shadow"
                >
                  {/* Top Row: User Avatar & Role Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-900 text-white flex items-center justify-center font-black text-sm uppercase shadow-xs">
                        {user.displayName?.slice(0, 2) || "AP"}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                          {user.displayName || "Applicant"}
                        </h3>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[170px]">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={user.role === "faculty" ? "indigo" : "secondary"}
                      className="text-[10px] font-bold uppercase"
                    >
                      {user.role}
                    </Badge>
                  </div>

                  {/* Details Grid */}
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs text-slate-600 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Department:</span>
                      <strong className="text-slate-800">{user.department || "Unassigned"}</strong>
                    </div>

                    {user.rollNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Roll Number:</span>
                        <strong className="text-slate-800 font-mono">{user.rollNumber}</strong>
                      </div>
                    )}

                    {user.employeeId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Employee ID:</span>
                        <strong className="text-slate-800 font-mono">{user.employeeId}</strong>
                      </div>
                    )}

                    {(user.phoneNumber || user.phone) && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="text-slate-700">{user.phoneNumber || user.phone}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1 border-t">
                      <span className="text-slate-400">Applied:</span>
                      <span className="text-[11px] text-slate-600">{format(appliedDate, "MMM d, h:mm a")}</span>
                    </div>
                  </div>

                  {/* SLA Badge & Action Bar */}
                  <div className="flex items-center justify-between pt-1">
                    {getSlaBadge(appliedDate)}

                    <button
                      type="button"
                      onClick={() => {
                        setTargetUser(user);
                        setRejectModalOpen(true);
                      }}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1"
                    >
                      Reject
                    </button>
                  </div>

                  {/* Approval Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApprove(user.uid, user.role)}
                      disabled={setRoleMutation.isPending}
                      className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      <span>Approve ({user.role})</span>
                    </Button>

                    <Select
                      onValueChange={(newRole) => handleApprove(user.uid, newRole as UserRole)}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200">
                        <SelectValue placeholder="Correct Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Approve as Student</SelectItem>
                        <SelectItem value="faculty">Approve as Faculty</SelectItem>
                        <SelectItem value="admin">Approve as Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-16 text-center space-y-3 rounded-3xl border-slate-200 bg-white">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto stroke-1" />
            <h3 className="font-bold text-slate-900">Access Queue Clear</h3>
            <p className="text-xs text-slate-400">All student and faculty access requests have been cleared.</p>
          </Card>
        )}
      </div>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-1">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Reject Access Request?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide an explanation to the applicant (e.g. invalid roll number or departmental mismatch).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2 text-xs">
            <label className="font-bold text-slate-700">Rejection Explanation *</label>
            <Textarea
              placeholder="e.g. Roll number does not match current semester CSE records. Please visit Dean's office."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmReject} disabled={setRoleMutation.isPending} className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold">
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminUserRequestsPage;
