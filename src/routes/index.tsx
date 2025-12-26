import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "~/components/auth/AuthProvider";
import { Button } from "~/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
  ssr: false,
});

function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome, {user.firstName}!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Get started with your kanban boards
          </p>
          <Link to="/boards">
            <Button size="lg">Go to Boards</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Kanban Board</h1>
        <p className="text-xl text-gray-600 mb-8">
          A modern, collaborative kanban board application
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/login">
            <Button>Login</Button>
          </Link>
          <Link to="/signup">
            <Button variant="outline">Sign Up</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
