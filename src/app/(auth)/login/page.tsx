"use client";
import { useState } from "react";
import Link from "next/link";
import { AtSign, Lock } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { login } from "../actions";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(new FormData(e.currentTarget));
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Login</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="email"
            type="email"
            placeholder="Email"
            required
            icon={<AtSign className="w-5 h-5" />}
            className="border-none"
          />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            required
            icon={<Lock className="w-5 h-5" />}
            className="border-none"
          />
          {error && (
            <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full !bg-cyan-400 hover:!bg-cyan-300 !text-gray-900 font-semibold py-3.5 text-base"
            loading={loading}
          >
            Log in
          </Button>
        </form>

        {/* Footer Link */}
        <p className="text-center mt-6 text-sm text-white">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-white font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
