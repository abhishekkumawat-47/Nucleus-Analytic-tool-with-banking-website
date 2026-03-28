'use client';

import { signIn } from 'next-auth/react';
import { User } from 'lucide-react';

export default function LoginPage() {
  const handleLogin = () => {
    signIn('google', { callbackUrl: '/feed' });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-sm w-full">
        <h1 className="text-3xl font-bold text-blue-500 mb-2">TwitClone</h1>
        <p className="text-gray-500 mb-8">Sign in with actual credentials</p>
        
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full mb-4 transition"
        >
          <User size={20} />
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}
