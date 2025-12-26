import React, { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Field, FieldError } from "~/components/ui/field";
import { toast } from "sonner";

interface SignupFormProps {
  onSuccess?: () => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const { signup, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError("");

    try {
      await signup(email, password, firstName, lastName);
      toast.success("Account created successfully");
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      // Set both toast and inline error for visibility
      setGeneralError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {generalError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isLoading}
            required
          />
          {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
        </Field>

        <Field>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
            required
          />
          {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
        </Field>
      </div>

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
        {isLoading ? "Creating Account..." : "Sign Up"}
      </Button>
    </form>
  );
}
