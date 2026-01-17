"use client";

import { useState } from "react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";

import { AtSign, Lock, Loader2, AlertCircle, Apple, Mail } from "lucide-react";

import { login, signInWithGoogle, signInWithApple } from "../actions";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"apple" | "google" | null>(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setEmailNotConfirmed(false);

    const formData = new FormData(e.currentTarget);

    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.emailNotConfirmed) {
      setEmailNotConfirmed(true);
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setOauthLoading("apple");
    setError("");
    const result = await signInWithApple();
    if (result?.error) {
      setError(result.error);
      setOauthLoading(null);
    }
  }

  async function handleGoogleSignIn() {
    setOauthLoading("google");
    setError("");
    const result = await signInWithGoogle();
    if (result?.error) {
      setError(result.error);
      setOauthLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {emailNotConfirmed ? (
          /* Email Confirmation Prompt */
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full mb-4">
              <Mail className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Confirm your email</h2>
            <p className="text-white/70 mb-6">
              Please check your inbox and click the confirmation link before logging in.
            </p>
            <Button
              onClick={() => setEmailNotConfirmed(false)}
              className="px-6 py-3 rounded-full bg-accent text-foreground font-semibold hover:bg-accent/90"
            >
              Try again
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Login</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputWithIcon
                name="email"
                type="email"
                placeholder="Email"
                required
                icon={<AtSign className="h-5 w-5" />}
                className="border-none"
              />
              <InputWithIcon
                name="password"
                type="password"
                placeholder="Password"
                required
                icon={<Lock className="h-5 w-5" />}
                className="border-none"
              />
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full rounded-full bg-accent hover:bg-accent/90 text-foreground font-semibold h-12 text-base"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log in"}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-white/30" />
              <span className="px-4 text-white/70 text-sm">or continue with</span>
              <div className="flex-1 border-t border-white/30" />
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleAppleSignIn}
                disabled={loading || oauthLoading !== null}
                variant="secondary"
                className="w-full rounded-full bg-background hover:bg-muted text-foreground font-medium h-12"
              >
                {oauthLoading === "apple" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Apple className="h-5 w-5" />
                )}
                Continue with Apple
              </Button>
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || oauthLoading !== null}
                variant="secondary"
                className="w-full rounded-full bg-background hover:bg-muted text-foreground font-medium h-12"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </Button>
            </div>

            {/* Footer Link */}
            <p className="text-center mt-6 text-sm text-white">
              Don&apos;t have an account?{" "}
              <Link href="/welcome" className="text-white font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
