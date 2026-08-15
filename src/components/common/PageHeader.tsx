import React from "react";
import { Badge } from "@/components/ui/badge";

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline" | "amber" | "emerald" | "indigo";
  };
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  children,
}) => {
  return (
    <div className="border-b bg-white/70 backdrop-blur-sm py-6 sm:py-8 px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none">
              {title}
            </h1>
            {badge && (
              <Badge variant={badge.variant || "indigo"} className="text-xs">
                {badge.text}
              </Badge>
            )}
          </div>

          {description && (
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {children && <div className="max-w-7xl mx-auto mt-4">{children}</div>}
    </div>
  );
};
