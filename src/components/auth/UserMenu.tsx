import { useAuth } from "./AuthProvider";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

export function UserMenu() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/login" })}
          className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          Log in
        </Button>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate({ to: "/login" });
    } catch {
      toast.error("Failed to logout");
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoading}
      variant="ghost"
      className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
    >
      {isLoading ? "Logging out..." : "Log out"}
    </Button>
  );
}
