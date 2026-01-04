"use client";
import { useState } from "react";
import Link from "next/link";
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
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="username" label="Username" required minLength={3} />
        <Input name="email" type="email" label="Email" required />
        <Input name="password" type="password" label="Password" required minLength={6} />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Create Account
        </Button>
      </form>
      <p className="text-center mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
