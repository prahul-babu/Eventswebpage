import React from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, HelpCircle, LogOut } from "lucide-react";

export const AccountBlockedPage: React.FC = () => {
  const { profile, status, signOut, firebaseUser } = useAuth();

  const isSuspended = status === "SUSPENDED" || (profile && profile.status === "SUSPENDED");
  const isRejected = status === "REJECTED" || (profile && profile.status === "REJECTED");

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md">
        <Card className="border-rose-200 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-widest text-rose-700">
                Security & Compliance
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
                {isSuspended ? "Account Suspended" : isRejected ? "Access Request Rejected" : "Access Restricted"}
              </CardTitle>
            </div>

            <CardDescription className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed pt-1">
              {isSuspended
                ? "Your Apollo University Event Hub access has been temporarily suspended by an administrator."
                : isRejected
                ? "Your registration request was not approved for campus event access."
                : "Your account is not authorized to access protected resources."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6 sm:px-8">
            <Alert variant="destructive" className="border-rose-300 bg-rose-50 text-rose-900 text-xs">
              <AlertTitle className="font-semibold text-rose-950">Notice Details</AlertTitle>
              <AlertDescription className="text-rose-900/90 mt-1">
                {profile?.rejectionReason ||
                  "Please reach out to the university IT department or Dean of Student Affairs for assistance."}
              </AlertDescription>
            </Alert>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">Account:</span>
                <span className="font-mono text-slate-800">{firebaseUser?.email || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-rose-600 uppercase">{status || "RESTRICTED"}</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t bg-slate-50/80 px-6 sm:px-8 py-3.5 gap-2 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="text-slate-600 rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span>Sign Out</span>
            </Button>

            <Button
              asChild
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
            >
              <a href="mailto:it-support@apollo.edu.in?subject=Account%20Access%20Assistance">
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                <span>Contact IT Desk</span>
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
