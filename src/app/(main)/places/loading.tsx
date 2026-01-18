import { Skeleton } from "@/components/ui/skeleton";

export default function PlacesLoading() {
  return (
    <div className="flex flex-1 relative h-screen">
      {/* Map skeleton with subtle animation */}
      <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
