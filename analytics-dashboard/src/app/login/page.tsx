'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Zap, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      const role = session.user.role;
      if (role === 'super_admin') router.replace('/admin');
      else if (role === 'app_admin') router.replace('/dashboard');
      else router.replace('/unauthorized');
    }
  }, [session, status, router]);

  const handleLogin = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: '/' });
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <Zap className="w-10 h-10 text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-6 selection:bg-blue-500/30">
      
      {/* Abstract Design Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full mb-12 flex flex-col items-center text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Zap className="w-10 h-10 text-blue-400" />
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
            Nucleus
          </h1>
        </div>
        <p className="text-gray-400 text-lg max-w-md">
          Enterprise Feature Intelligence &amp; Usage Analytics
        </p>
      </div>

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full">
        
        <div className="flex items-center space-x-3 mb-8">
          <ShieldCheck className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-medium text-white tracking-tight">Secure Sign-In required</h2>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="group relative w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-4 rounded-xl font-bold transition-all hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
          ) : (
            <>
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="mt-8 space-y-2">
          <p className="text-center text-xs text-gray-500 italic">
            Access is restricted to authorized administrators only.
          </p>
          <div className="text-center text-[10px] text-gray-600 space-y-1">
            <p>☁️ <strong>Super Admin</strong> — Aggregated cloud-level overview</p>
            <p>🔒 <strong>App Admin</strong> — Full detailed analytics for assigned app</p>
            <p>👤 <strong>Normal Users</strong> — App access only, no dashboards</p>
          </div>
        </div>

      </div>
    </div>
  );
}
