import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  if (pathnames.length === 0) {
    return null;
  }

  const formatBreadcrumb = (str: string): string => {
    return str
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
      <ol className="flex items-center space-x-1.5 text-xs text-slate-500 flex-wrap">
        <li>
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-indigo-600 font-medium transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
        </li>

        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          return (
            <li key={to} className="flex items-center space-x-1.5">
              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              {isLast ? (
                <span className="font-semibold text-slate-800" aria-current="page">
                  {formatBreadcrumb(value)}
                </span>
              ) : (
                <Link
                  to={to}
                  className="hover:text-indigo-600 font-medium transition-colors"
                >
                  {formatBreadcrumb(value)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
