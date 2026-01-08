"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, AtSign, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";
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
    <div className="min-h-screen bg-[#6867B0] flex items-center justify-center p-4">
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
            icon={<Mail className="w-5 h-5" />}
            className="border-none"
          />
          <InputWithIcon
            name="username"
            placeholder="Username"
            required
            minLength={3}
            icon={<AtSign className="w-5 h-5" />}
            className="border-none"
          />
          <InputWithIcon
            name="password"
            type="password"
            placeholder="Password"
            required
            minLength={6}
            icon={<Lock className="w-5 h-5" />}
            className="border-none"
          />
          {error && (
            <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
              {error.includes("already registered") && (
                <Link href="/login" className="block mt-2 text-indigo-600 font-semibold hover:underline">
                  Go to login page →
                </Link>
              )}
            </div>
          )}
          <Button
            type="submit"
            className="w-full rounded-full bg-cyan-400 hover:bg-cyan-300 text-gray-900 font-semibold h-12 text-base"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
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
