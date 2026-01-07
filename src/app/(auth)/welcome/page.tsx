"use client";
import { useRouter } from "next/navigation";
import { Apple } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();

  const handleOAuthClick = (provider: string) => {
    alert(`Coming soon! ${provider} OAuth integration is not yet available.`);
  };

  return (
    <div className="min-h-screen bg-[#6867B0] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-32 left-1/2 -translate-x-16">
        <div className="relative">
          {/* Large teal circle */}
          <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-cyan-400 absolute top-0 left-0"></div>
          {/* Medium white/cream circle */}
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gray-100 absolute top-4 left-20"></div>
          {/* Small white circle */}
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white absolute -bottom-2 left-28"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-sm z-10 text-center px-6">
        {/* Branding */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Myaou
        </h1>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Continue with Apple */}
          <button
            onClick={() => handleOAuthClick("Apple")}
            className="w-full bg-cyan-400 text-gray-900 font-medium py-3.5 px-6 rounded-xl hover:bg-cyan-300 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Apple className="w-5 h-5" />
            Continue with Apple
          </button>

          {/* Continue with Google */}
          <button
            onClick={() => handleOAuthClick("Google")}
            className="w-full bg-white text-gray-900 font-medium py-3.5 px-6 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Sign up with email */}
          <button
            onClick={() => router.push("/signup")}
            className="w-full bg-transparent text-white font-medium py-3.5 px-6 rounded-xl border-2 border-white hover:bg-white hover:text-purple-600 transition-colors shadow-lg"
          >
            Sign up with email
          </button>
        </div>

        {/* Footer Link */}
        <p className="mt-8 text-white text-sm">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="font-semibold underline hover:opacity-80 transition-opacity"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
