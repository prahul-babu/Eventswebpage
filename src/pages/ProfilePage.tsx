import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Mail, Building2, ShieldCheck, Phone, Hash } from "lucide-react";

export const ProfilePage: React.FC = () => {
  const { profile, firebaseUser, role, status } = useAuth();

  const displayName = profile?.displayName || firebaseUser?.displayName || "Campus Member";
  const userEmail = profile?.email || firebaseUser?.email || "";
  const department = profile?.department || "General Administration";
  const rollNumber = profile?.rollNumber;
  const employeeId = profile?.employeeId;
  const phoneNumber = profile?.phoneNumber || "Not provided";

  return (
    <div>
      <PageHeader
        title="My Campus Profile"
        description="View and manage your Apollo University institutional profile details and permissions."
        badge={{ text: role ? role.toUpperCase() : "STUDENT", variant: "indigo" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identity Summary Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 rounded-2xl bg-indigo-900 text-white flex items-center justify-center mx-auto mb-2 text-2xl font-bold shadow-md">
                {displayName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <CardTitle className="text-lg">{displayName}</CardTitle>
              <CardDescription className="text-xs font-mono">{userEmail}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2 text-xs border-t">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Account Status</span>
                <Badge variant={status === "ACTIVE" ? "emerald" : "amber"}>{status || "ACTIVE"}</Badge>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Institutional Role</span>
                <Badge variant="indigo" className="capitalize">{role || "student"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Academic & Verification Details */}
          <Card className="border-slate-200 shadow-sm md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Academic Credentials</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Official records synchronized with Microsoft Entra ID and campus registry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Department</span>
                  </div>
                  <div className="font-semibold text-slate-900">{department}</div>
                </div>

                {rollNumber && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-slate-500 flex items-center gap-1 mb-1">
                      <Hash className="w-3.5 h-3.5" />
                      <span>Roll Number</span>
                    </div>
                    <div className="font-mono font-semibold text-slate-900">{rollNumber}</div>
                  </div>
                )}

                {employeeId && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-slate-500 flex items-center gap-1 mb-1">
                      <Hash className="w-3.5 h-3.5" />
                      <span>Employee ID</span>
                    </div>
                    <div className="font-mono font-semibold text-slate-900">{employeeId}</div>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Mobile Contact</span>
                  </div>
                  <div className="font-semibold text-slate-900">{phoneNumber}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>SSO Provider</span>
                  </div>
                  <div className="font-semibold text-slate-900">Microsoft Entra ID</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
