import { createFileRoute } from "@tanstack/react-router";
import { BoardList } from "~/components/BoardList";
import { ActivityFeed } from "~/components/ActivityFeed";
import { useAuth } from "~/components/auth/AuthProvider";

export const Route = createFileRoute("/boards/")({
  component: BoardsIndexComponent,
  ssr: false,
});

function BoardsIndexComponent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Please log in to view boards</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white dark:bg-slate-950">
      {/* Boards Section */}
      <BoardList accountId={user.id} />

      {/* Activity Section - with top border separator and extra top padding */}
      <div className="border-t-2 border-slate-200 dark:border-slate-800 mt-8">
        <ActivityFeed />
      </div>
    </div>
  );
}
