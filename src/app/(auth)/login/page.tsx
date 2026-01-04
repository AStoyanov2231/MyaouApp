"use client";
import { useState } from "react";
import Link from "next/link";
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
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Welcome to PlaceChat</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="email" type="email" label="Email" required />
        <Input name="password" type="password" label="Password" required />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Sign In
        </Button>
      </form>
      <p className="text-center mt-4 text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline">Sign up</Link>
      </p>
    </div>
  );
}
