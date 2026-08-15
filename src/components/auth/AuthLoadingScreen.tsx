import React from "react";
import { Loader2 } from "lucide-react";

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F0F9FB] text-slate-900 selection:bg-[#007A99]/20">
      {/* Soft ambient university background glow */}
      <div className="absolute w-96 h-96 bg-[#007A99]/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center space-y-5 text-center px-4 max-w-sm">
        {/* University Crest Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-200/80 inline-block">
          <img
            src="/apollo-logo.png"
            alt="The Apollo University"
            className="h-14 w-auto mx-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>

        {/* Brand Text */}
        <div className="space-y-1">
          <h2 className="text-lg font-black tracking-tight uppercase text-[#004D61]">
            The Apollo University
          </h2>
          <p className="text-xs font-semibold text-[#007A99]">
            School of Technology &bull; B.Tech Event Hub
          </p>
        </div>

        {/* Spinner & State */}
        <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-white/90 px-4 py-2 rounded-full border border-slate-200 shadow-xs backdrop-blur-sm">
          <Loader2 className="w-4 h-4 text-[#007A99] animate-spin" />
          <span className="font-medium">Loading Apollo Event Hub...</span>
        </div>
      </div>
    </div>
  );
};
export default AuthLoadingScreen;
