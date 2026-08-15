import React from "react";
import { GraduationCap, Loader2 } from "lucide-react";

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white selection:bg-indigo-500">
      {/* Ambient background glow */}
      <div className="absolute w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      
      <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-4">
        {/* Animated Brand Crest */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-900 via-indigo-700 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-900/40 border border-indigo-500/30">
            <GraduationCap className="h-8 w-8 text-amber-300 animate-bounce" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-sm -z-10 animate-pulse" />
        </div>

        {/* Brand Text */}
        <div className="space-y-1.5">
          <div className="text-xl font-extrabold tracking-tight text-slate-100">
            The Apollo University
          </div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
            Event Hub
          </div>
        </div>

        {/* Spinner & State */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 backdrop-blur-sm">
          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          <span>Verifying campus credentials & session...</span>
        </div>
      </div>
    </div>
  );
};
