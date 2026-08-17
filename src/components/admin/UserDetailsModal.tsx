import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User } from "@/types";
import { safeFormatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User as UserIcon,
  GraduationCap,
  Shield,
  KeyRound,
  Edit,
  ExternalLink,
} from "lucide-react";
import { ResetPasswordModal } from "./ResetPasswordModal";
import { EditUserModal } from "./EditUserModal";

interface UserDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  open,
  onOpenChange,
  user,
}) => {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  if (!user) return null;

  const isStudent = user.role === "student";
  const isFaculty = user.role === "faculty";
  const isAdmin = user.role === "admin";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left space-y-2 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center font-black text-xl uppercase shadow-sm">
                  {(user.displayName || user.email || "AP").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                    <span>{user.displayName || "Campus Member"}</span>
                    <Badge
                      variant={isAdmin ? "amber" : isFaculty ? "indigo" : "secondary"}
                      className="text-[10px] font-bold uppercase"
                    >
                      {user.role}
                    </Badge>
                    <Badge
                      variant={
                        user.status === "ACTIVE"
                          ? "emerald"
                          : user.status === "PENDING"
                          ? "amber"
                          : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {user.status}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-mono">
                    {user.email}
                  </DialogDescription>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditModalOpen(true)}
                  className="rounded-xl text-xs h-8 gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 shadow-xs"
                >
                  <Link to={`/admin/users/${user.uid}`}>
                    <span>Full Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* 1. Personal Information */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Personal Information</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Full Name</span>
                  <strong className="text-slate-800 text-xs">{user.displayName || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">University Email</span>
                  <span className="text-slate-700 font-mono text-xs">{user.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Mobile Contact</span>
                  <span className="text-slate-800 font-medium">
                    {user.phoneNumber || user.phone || "Not on record"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Alternate Email</span>
                  <span className="text-slate-600 font-mono">
                    {(user as any).alternateEmail || (user as any).personalEmail || "None provided"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Academic / Institutional Information */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isStudent ? "Academic Information" : "Institutional Information"}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isStudent ? (
                  <>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Roll Number</span>
                      <strong className="text-slate-900 font-mono uppercase">
                        {user.rollNumber || (user as any).studentId || "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Programme / Stream</span>
                      <span className="text-slate-800 font-medium">{user.department || "General"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">School</span>
                      <span className="text-slate-800">{(user as any).school || "School of Technology"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Year &amp; Section</span>
                      <span className="text-slate-800">
                        {(user as any).year || "N/A"} &bull; {(user as any).section || "N/A"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Employee ID</span>
                      <strong className="text-slate-900 font-mono uppercase">
                        {user.employeeId || (user as any).facultyId || "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Designation</span>
                      <span className="text-slate-800 font-medium">{user.designation || "Faculty Member"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Department</span>
                      <span className="text-slate-800">{user.department || "School of Technology"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">School</span>
                      <span className="text-slate-800">{(user as any).school || "School of Technology"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Account Governance & Security */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Account Credentials &amp; Security</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">User ID (UID)</span>
                  <span className="font-mono text-slate-700 text-[11px] block truncate">{user.uid}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Member Joined</span>
                  <span className="text-slate-800">{safeFormatDate(user.createdAt, "PPP", "N/A")}</span>
                </div>
              </div>

              {/* Masked Password & Reset Button */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Authentication Password</span>
                  <span className="font-mono text-slate-500 tracking-widest text-xs font-bold">••••••••••••</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResetModalOpen(true)}
                  className="rounded-xl text-xs h-8 gap-1 font-bold text-indigo-700 bg-white"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset Password</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <ResetPasswordModal
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        user={user}
      />

      {/* Edit User Modal */}
      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={user}
      />
    </>
  );
};
