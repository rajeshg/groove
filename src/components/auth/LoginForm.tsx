import React, { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Field, FieldError } from "~/components/ui/field";
import { toast } from "sonner";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError("");

    try {
      await login(email, password);
      toast.success("Logged in successfully");
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      // Check for specific "Invalid email or password" message
      if (message === "Invalid email or password") {
        // Show as general error since it's ambiguous
        setGeneralError(message);
        toast.error(message);
      } else if (message.includes("email")) {
        setErrors({ email: message });
      } else if (message.includes("password")) {
        setErrors({ password: message });
      } else {
        // Set both toast and inline error for visibility
        setGeneralError(message);
        toast.error(message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <div
          data-testid="login-error"
          className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded"
        >
          {generalError}
        </div>
      )}

      <Field>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
        {errors.email && <FieldError>{errors.email}</FieldError>}
      </Field>

      <Field>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />
        {errors.password && <FieldError>{errors.password}</FieldError>}
      </Field>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Logging in..." : "Log In"}
      </Button>
    </form>
  );
}
