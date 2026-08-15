import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mb-2 shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold tracking-widest text-indigo-600 uppercase">
            Error 404
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            The campus event or resource you are looking for does not exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="default" className="w-full sm:w-auto">
            <Link to="/" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span>Return to Campus Hub</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto" onClick={() => window.history.back()}>
            <button type="button" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          </Button>
        </div>
      </div>
    </div>
  );
};
