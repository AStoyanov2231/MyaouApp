"use client";

import { useState } from "react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";

import { Mail, AtSign, Lock, Loader2, AlertCircle } from "lucide-react";

import { signup } from "../actions";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signup(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Sign up</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputWithIcon
            name="email"
            type="email"
            placeholder="Email"
            required
            icon={<Mail className="h-5 w-5" />}
            className="border-none"
          />
          <InputWithIcon
            name="username"
            placeholder="Username"
            required
            minLength={3}
            icon={<AtSign className="h-5 w-5" />}
            className="border-none"
          />
          <InputWithIcon
            name="password"
            type="password"
            placeholder="Password"
            required
            minLength={6}
            icon={<Lock className="h-5 w-5" />}
            className="border-none"
          />
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {error.includes("already registered") && (
                  <Link href="/login" className="block mt-2 text-primary font-semibold hover:underline">
                    Go to login page →
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}
          <Button
            type="submit"
            className="w-full rounded-full bg-accent hover:bg-accent/90 text-foreground font-semibold h-12 text-base"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create account"}
          </Button>
        </form>

        {/* Footer Link */}
        <p className="text-center mt-6 text-sm text-white">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
