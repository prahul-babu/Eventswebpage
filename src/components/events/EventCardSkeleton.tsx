import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const EventCardSkeleton: React.FC = () => {
  return (
    <Card className="h-full flex flex-col overflow-hidden border-slate-200 shadow-sm bg-white">
      {/* 16:9 Banner Skeleton */}
      <div className="aspect-video w-full relative bg-slate-100 p-3 flex justify-between">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Content Body */}
      <CardContent className="p-4 flex-1 space-y-3">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />

        <div className="space-y-2 pt-2">
          <Skeleton className="h-3.5 w-4/5 rounded" />
          <Skeleton className="h-3.5 w-3/5 rounded" />
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="px-4 py-3 border-t bg-slate-50/50 flex items-center justify-between">
        <Skeleton className="h-4 w-12 rounded" />
        <Skeleton className="h-3.5 w-24 rounded" />
      </CardFooter>
    </Card>
  );
};
