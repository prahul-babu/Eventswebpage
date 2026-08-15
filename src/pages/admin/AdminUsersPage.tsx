import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Search,
  Download,
  MoreVertical,
  Eye,
  Shield,
  UserCheck,
  UserX,
  RotateCcw,
  Loader2,
  UserPlus,
} from "lucide-react";
import { useAdminUsersDirectory, useSetUserRole } from "@/lib/queries/adminUsers";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { User, UserRole, UserStatus } from "@/types";
import { toast } from "sonner";

export const AdminUsersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | UserStatus>("ALL");
  const [departmentFilter] = useState<string>("ALL");

  // Role modification modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("student");

  const { data: users, isLoading } = useAdminUsersDirectory({
    searchQuery,
    role: roleFilter,
    status: statusFilter,
    department: departmentFilter,
  });

  const setRoleMutation = useSetUserRole();

  // Export CSV of current filtered directory
  const handleExportCsv = () => {
    if (!users || users.length === 0) {
      toast.error("No users found to export.");
      return;
    }

    const headers = ["UID", "Name", "Email", "Role", "Department", "Roll/Employee ID", "Status", "Joined"];
    const rows = users.map((u) => [
      u.uid,
      `"${u.displayName.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      u.role,
      `"${u.department || "General"}"`,
      `"${u.rollNumber || u.employeeId || "N/A"}"`,
      u.status,
      u.createdAt ? format(new Date(u.createdAt), "yyyy-MM-dd") : "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Apollo_Users_Directory_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("User Directory Exported", { description: `Exported ${users.length} user records.` });
  };

  const handleUpdateStatus = async (user: User, status: UserStatus) => {
    try {
      await setRoleMutation.mutateAsync({
        targetUid: user.uid,
        role: user.role,
        status,
      });
    } catch {
      // Handled by toast
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;
    try {
      await setRoleMutation.mutateAsync({
        targetUid: selectedUser.uid,
        role: newRole,
        status: selectedUser.status === "PENDING" ? "ACTIVE" : selectedUser.status,
      });
      setRoleModalOpen(false);
      setSelectedUser(null);
    } catch {
      // Handled by toast
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Badge variant="amber" className="text-[10px] uppercase font-bold">Admin</Badge>;
      case "faculty":
        return <Badge variant="indigo" className="text-[10px] uppercase font-bold">Faculty</Badge>;
      case "student":
      default:
        return <Badge variant="secondary" className="text-[10px] uppercase font-bold">Student</Badge>;
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="emerald" className="text-[10px]">Active</Badge>;
      case "PENDING":
        return <Badge variant="amber" className="text-[10px]">Pending Approval</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive" className="text-[10px]">Suspended</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="University User Directory"
        description="Comprehensive roster of verified campus identities, role permissions, and active credential statuses."
        badge={{ text: "Identity & Roles", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-9 bg-white">
              <Link to="/admin/users/import">
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Roster Import</span>
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={handleExportCsv}
              className="rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5 h-9 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Directory CSV</span>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, ID..."
              className="h-9 pl-9 text-xs rounded-xl"
            />
          </div>

          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as any)}>
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="admin">Administrators</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Access Requests Fast Link */}
          <Button asChild variant="outline" size="sm" className="h-9 text-xs rounded-xl justify-between">
            <Link to="/admin/users/requests">
              <span>Access Requests Queue</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </Link>
          </Button>
        </div>

        {/* Directory Table */}
        <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Verified Microsoft Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department &amp; ID</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Loading university user directory...</span>
                    </td>
                  </tr>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                            {user.displayName?.slice(0, 2) || "AP"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {user.displayName}
                            </div>
                            <div className="text-[10px] text-slate-400">UID: {user.uid.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {user.email}
                      </td>

                      <td className="p-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{user.department || "General"}</div>
                        <div className="text-[10px] text-slate-400">
                          {user.rollNumber ? `Roll: ${user.rollNumber}` : user.employeeId ? `Emp ID: ${user.employeeId}` : "Campus"}
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">{getStatusBadge(user.status)}</td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "N/A"}
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
                              <Link to={`/admin/users/${user.uid}`} className="gap-2 cursor-pointer">
                                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                <span>View Deep Profile</span>
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole(user.role);
                                setRoleModalOpen(true);
                              }}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <Shield className="w-3.5 h-3.5 text-slate-500" />
                              <span>Change Role</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {user.status === "ACTIVE" ? (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(user, "SUSPENDED")}
                                className="gap-2 cursor-pointer text-rose-600 font-medium"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Suspend Account</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(user, "ACTIVE")}
                                className="gap-2 cursor-pointer text-emerald-600 font-medium"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Reactivate Account</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(user, "PENDING")}
                              className="gap-2 cursor-pointer text-amber-600"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset to Pending</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No users found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Role Change Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Modify User Authorization
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Assign role credentials for <strong className="text-slate-900">{selectedUser?.displayName}</strong> ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3 text-xs">
            <label className="font-bold text-slate-700">Assign Role</label>
            <Select value={newRole} onValueChange={(val) => setNewRole(val as UserRole)}>
              <SelectTrigger className="h-10 text-xs rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student (Read-only discovery &amp; registration)</SelectItem>
                <SelectItem value="faculty">Faculty (Event creation &amp; reporting)</SelectItem>
                <SelectItem value="admin">Administrator (Universal oversight &amp; settings)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRoleModalOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmRoleChange} disabled={setRoleMutation.isPending} className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Confirm Role Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminUsersPage;
