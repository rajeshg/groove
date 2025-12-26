import { createFileRoute } from "@tanstack/react-router";
import { BoardDetailPage } from "~/components/BoardDetailPage";
import { useAuth } from "~/components/auth/AuthProvider";
import { z } from "zod";

const boardDetailSearchSchema = z.object({});

export const Route = createFileRoute("/boards_/$boardId")({
  validateSearch: (search: Record<string, unknown>) =>
    boardDetailSearchSchema.parse(search),
  component: BoardDetailComponent,
  ssr: false,
});

function BoardDetailComponent() {
  const { boardId } = Route.useParams();
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
        <div className="text-gray-600">Please log in to view this board</div>
      </div>
    );
  }

  return <BoardDetailPage boardId={boardId} />;
}
