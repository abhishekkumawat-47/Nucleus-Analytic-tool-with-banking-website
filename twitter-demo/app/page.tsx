'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { User, Zap } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Once authenticated, redirect to feed
    if (status === 'authenticated') {
      router.replace('/feed');
    }
  }, [status, router]);

  const handleLogin = () => {
    signIn('google', { callbackUrl: '/feed' });
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="p-10 bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 text-center max-w-sm w-full transition-all duration-300">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <Zap className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">TwitClone</h1>
        <p className="text-gray-500 mb-10 text-sm">Sign in to join the conversation and access your feed</p>
        
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center space-x-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold p-4 rounded-full mb-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <User size={20} />
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}
