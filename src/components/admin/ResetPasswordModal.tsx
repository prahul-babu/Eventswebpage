import React from "react";
import { KeyRound, Loader2, ShieldCheck, Mail } from "lucide-react";
import { useAdminResetUserPassword } from "@/lib/queries/adminUsers";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  open,
  onOpenChange,
  user,
}) => {
  const resetPasswordMutation = useAdminResetUserPassword();

  if (!user) return null;

  const handleConfirmReset = async () => {
    try {
      await resetPasswordMutation.mutateAsync({
        targetUid: user.uid,
        targetEmail: user.email,
        targetName: user.displayName || user.email,
      });
      onOpenChange(false);
    } catch {
      // Handled by toast in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
        <DialogHeader className="text-left space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight">
            Initiate Secure Password Reset
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed">
            Dispatch an official Apollo University credential reset authorization to{" "}
            <strong className="text-slate-800 font-semibold">{user.displayName || user.email}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {/* Identity Summary Card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Recipient Email</span>
              <span className="font-mono text-slate-800 font-bold">{user.email}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Current Credentials</span>
              <span className="font-mono text-slate-500 tracking-widest text-sm font-black">••••••••••••••</span>
            </div>
          </div>

          {/* Institutional Security Notice */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-2.5 text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-snug">
              <strong>Enterprise Zero-Knowledge Policy:</strong> Passwords are never stored in plaintext or accessible to administrators. A cryptographically signed single-use reset token will be delivered to the user's verified university mailbox.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmReset}
            disabled={resetPasswordMutation.isPending}
            className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 gap-1.5 shadow-xs"
          >
            {resetPasswordMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Dispatching Link...</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Send Reset Link</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
