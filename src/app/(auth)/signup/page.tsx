"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, AtSign, Lock } from "lucide-react";
import { Button, Input } from "@/components/ui";
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
          <Input
            name="email"
            type="email"
            placeholder="Email"
            required
            icon={<Mail className="w-5 h-5" />}
            className="border-none"
          />
          <Input
            name="username"
            placeholder="Username"
            required
            minLength={3}
            icon={<AtSign className="w-5 h-5" />}
            className="border-none"
          />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            required
            minLength={6}
            icon={<Lock className="w-5 h-5" />}
            className="border-none"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="submit"
            className="w-full !bg-cyan-400 hover:!bg-cyan-300 !text-gray-900 font-semibold py-3.5 text-base"
            loading={loading}
          >
            Create account
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
