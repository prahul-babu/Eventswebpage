import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
  Trash2,
  Mail,
  KeyRound,
  Edit,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAdminUsersDirectory, useSetUserRole, useDeleteUser } from "@/lib/queries/adminUsers";
import { SendFacultyNotificationModal } from "@/components/admin/SendFacultyNotificationModal";
import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";
import { EditUserModal } from "@/components/admin/EditUserModal";
import { UserDetailsModal } from "@/components/admin/UserDetailsModal";
import type { FacultyRecipient } from "@/lib/queries/adminNotifications";
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
import { User, UserRole, UserStatus, DEPARTMENTS } from "@/types";
import { toast } from "sonner";
import { safeFormatDate } from "@/lib/utils";

type SortField = "name" | "email" | "role" | "department" | "joined" | "status";
type SortOrder = "asc" | "desc";

const PAGE_SIZE = 15;

export const AdminUsersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | UserStatus>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("joined");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Active Modals State
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("student");

  // Delete user modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Notify faculty modal
  const [notifyFacultyTarget, setNotifyFacultyTarget] = useState<FacultyRecipient | null>(null);

  const { data: rawUsers, isLoading } = useAdminUsersDirectory({
    searchQuery: "",
    role: "ALL",
    status: "ALL",
    department: "ALL",
  });

  const setRoleMutation = useSetUserRole();
  const deleteUserMutation = useDeleteUser();

  // Filtered & Sorted list with client-side instant responsiveness
  const filteredAndSortedUsers = useMemo(() => {
    if (!rawUsers) return [];

    let result = rawUsers.filter((u) => {
      // Role filter
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

      // Status filter
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;

      // Department filter
      if (departmentFilter !== "ALL" && u.department !== departmentFilter) return false;

      // Search query across: Full Name, Email, Roll Number, Employee ID, User ID (UID), Department
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (u.displayName || "").toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        const matchRoll = (u.rollNumber || (u as any).studentId || "").toLowerCase().includes(q);
        const matchEmp = (u.employeeId || (u as any).facultyId || "").toLowerCase().includes(q);
        const matchUid = (u.uid || "").toLowerCase().includes(q);
        const matchDept = (u.department || "").toLowerCase().includes(q);
        return matchName || matchEmail || matchRoll || matchEmp || matchUid || matchDept;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case "name":
          comp = (a.displayName || "").localeCompare(b.displayName || "");
          break;
        case "email":
          comp = (a.email || "").localeCompare(b.email || "");
          break;
        case "role":
          comp = (a.role || "").localeCompare(b.role || "");
          break;
        case "department":
          comp = (a.department || "").localeCompare(b.department || "");
          break;
        case "status":
          comp = (a.status || "").localeCompare(b.status || "");
          break;
        case "joined":
        default: {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comp = tA - tB;
          break;
        }
      }
      return sortOrder === "asc" ? comp : -comp;
    });

    return result;
  }, [rawUsers, roleFilter, statusFilter, departmentFilter, searchQuery, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedUsers.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedUsers, currentPage]);

  const handleExportCsv = () => {
    if (!filteredAndSortedUsers || filteredAndSortedUsers.length === 0) {
      toast.error("No users found to export.");
      return;
    }

    const headers = ["UID", "Name", "Email", "Role", "Department", "Roll/Employee ID", "Status", "Joined Date"];
    const rows = filteredAndSortedUsers.map((u) => [
      u.uid,
      `"${(u.displayName || "").replace(/"/g, '""')}"`,
      `"${u.email}"`,
      u.role,
      `"${u.department || "General"}"`,
      `"${u.rollNumber || u.employeeId || "N/A"}"`,
      u.status,
      safeFormatDate(u.createdAt, "yyyy-MM-dd", "N/A"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Apollo_Users_Directory_${safeFormatDate(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("User Directory Exported", {
      description: `Exported ${filteredAndSortedUsers.length} user records matching current filters.`,
    });
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
    if (!selectedUserForRole) return;
    try {
      await setRoleMutation.mutateAsync({
        targetUid: selectedUserForRole.uid,
        role: newRole,
        status: selectedUserForRole.status === "PENDING" ? "ACTIVE" : selectedUserForRole.status,
      });
      setRoleModalOpen(false);
      setSelectedUserForRole(null);
    } catch {
      // Handled by toast
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserMutation.mutateAsync({
        targetUid: userToDelete.uid,
        email: userToDelete.email,
        displayName: userToDelete.displayName,
      });
      setDeleteModalOpen(false);
      setUserToDelete(null);
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
        return <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200">Inactive</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="University User Directory"
        description="Comprehensive master roster of verified campus identities, role permissions, and active credential statuses."
        badge={{ text: "Identity & Governance", variant: "indigo" }}
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
        {/* Filters & Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search name, email, roll no, emp ID, UID..."
              className="h-9 pl-9 text-xs rounded-xl"
            />
          </div>

          {/* Role Filter */}
          <Select
            value={roleFilter}
            onValueChange={(val) => {
              setRoleFilter(val as any);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="faculty">Faculty Members</SelectItem>
              <SelectItem value="admin">Administrators</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as any);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="REJECTED">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Department Filter */}
          <Select
            value={departmentFilter}
            onValueChange={(val) => {
              setDepartmentFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Control */}
          <Select
            value={`${sortField}_${sortOrder}`}
            onValueChange={(val) => {
              const [field, order] = val.split("_");
              setSortField(field as SortField);
              setSortOrder(order as SortOrder);
            }}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <SelectValue placeholder="Sort" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="joined_desc">Joined: Newest</SelectItem>
              <SelectItem value="joined_asc">Joined: Oldest</SelectItem>
              <SelectItem value="name_asc">Name: A to Z</SelectItem>
              <SelectItem value="name_desc">Name: Z to A</SelectItem>
              <SelectItem value="email_asc">Email: A to Z</SelectItem>
              <SelectItem value="role_asc">Role: Student &rarr; Admin</SelectItem>
              <SelectItem value="status_asc">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Directory Table */}
        <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Verified University Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department &amp; Roll/Emp ID</th>
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
                ) : paginatedUsers && paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                            {user.displayName?.slice(0, 2) || "AP"}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDetails(user)}
                              className="font-bold text-slate-900 text-xs sm:text-sm text-left hover:text-indigo-600 transition-colors block"
                            >
                              {user.displayName || "Campus Member"}
                            </button>
                            <div className="text-[10px] text-slate-400 font-mono">UID: {user.uid.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {user.email}
                      </td>

                      <td className="p-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{user.department || "General"}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {user.rollNumber ? `Roll: ${user.rollNumber}` : user.employeeId ? `Emp ID: ${user.employeeId}` : "Campus Member"}
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">{getStatusBadge(user.status)}</td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {safeFormatDate(user.createdAt, "MMM d, yyyy", "N/A")}
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-2xl text-xs shadow-lg">
                            <DropdownMenuItem
                              onClick={() => setSelectedUserForDetails(user)}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View Details</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setSelectedUserForEdit(user)}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-600" />
                              <span>Edit User</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <Link to={`/admin/users/${user.uid}`} className="gap-2 cursor-pointer">
                                <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                                <span>View Deep Profile</span>
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserForRole(user);
                                setNewRole(user.role);
                                setRoleModalOpen(true);
                              }}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <Shield className="w-3.5 h-3.5 text-slate-600" />
                              <span>Change Role</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setSelectedUserForReset(user)}
                              className="gap-2 cursor-pointer text-indigo-700 font-bold"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Reset Password</span>
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
                                <span>Activate Account</span>
                              </DropdownMenuItem>
                            )}

                            {user.status === "ACTIVE" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(user, "REJECTED")}
                                className="gap-2 cursor-pointer text-slate-600 font-medium"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Deactivate Account</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(user, "PENDING")}
                              className="gap-2 cursor-pointer text-amber-600"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset to Pending</span>
                            </DropdownMenuItem>

                            {user.role === "faculty" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setNotifyFacultyTarget({
                                    uid: user.uid,
                                    name: user.displayName || "Faculty Member",
                                    email: user.email,
                                    department: user.department,
                                    employeeId: user.employeeId,
                                  });
                                }}
                                className="gap-2 cursor-pointer text-[#007A99] font-bold"
                              >
                                <Mail className="w-3.5 h-3.5 text-[#007A99]" />
                                <span>Send Notification</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteModalOpen(true);
                              }}
                              className="gap-2 cursor-pointer text-rose-600 focus:text-rose-700 font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete User</span>
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

          {/* Pagination Controls */}
          {filteredAndSortedUsers.length > PAGE_SIZE && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong> to{" "}
                <strong>{Math.min(currentPage * PAGE_SIZE, filteredAndSortedUsers.length)}</strong> of{" "}
                <strong>{filteredAndSortedUsers.length}</strong> users
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl text-xs h-8 px-2.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>
                <span className="px-2 font-bold text-slate-800">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl text-xs h-8 px-2.5"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        open={Boolean(selectedUserForDetails)}
        onOpenChange={(open) => !open && setSelectedUserForDetails(null)}
        user={selectedUserForDetails}
      />

      {/* Edit User Modal */}
      <EditUserModal
        open={Boolean(selectedUserForEdit)}
        onOpenChange={(open) => !open && setSelectedUserForEdit(null)}
        user={selectedUserForEdit}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        open={Boolean(selectedUserForReset)}
        onOpenChange={(open) => !open && setSelectedUserForReset(null)}
        user={selectedUserForReset}
      />

      {/* Role Change Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
          <DialogHeader className="text-left space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight">
              Change User Role Authorization
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to change the role for{" "}
              <strong className="text-slate-800 font-semibold">{selectedUserForRole?.displayName}</strong> ({selectedUserForRole?.email})?
              Changing their role modifies their campus access permissions immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3 text-xs">
            <label className="font-bold text-slate-700">Assign Institutional Role</label>
            <Select value={newRole} onValueChange={(val) => setNewRole(val as UserRole)}>
              <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student (Discovery, bookings, passes)</SelectItem>
                <SelectItem value="faculty">Faculty (Event creation &amp; reporting)</SelectItem>
                <SelectItem value="admin">Administrator (Universal oversight &amp; settings)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRoleModalOpen(false)} className="rounded-xl text-xs h-9">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRoleChange}
              disabled={setRoleMutation.isPending}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 shadow-xs"
            >
              {setRoleMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Role Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
          <DialogHeader className="text-left space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight">
              Delete User Identity Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete the user record for{" "}
              <strong className="text-slate-800 font-semibold">{userToDelete?.displayName}</strong> ({userToDelete?.email})?
              This action permanently deletes the user identity from the directory and records the deletion in the audit logs.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)} className="rounded-xl text-xs h-9">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleteUserMutation.isPending}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 shadow-xs"
            >
              {deleteUserMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Faculty Notification Modal */}
      {notifyFacultyTarget && (
        <SendFacultyNotificationModal
          open={Boolean(notifyFacultyTarget)}
          onOpenChange={(open) => !open && setNotifyFacultyTarget(null)}
          faculty={notifyFacultyTarget}
        />
      )}
    </div>
  );
};
export default AdminUsersPage;
