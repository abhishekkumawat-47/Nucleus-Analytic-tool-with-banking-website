'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TweetBox from '@/components/TweetBox';
import Tweet from '@/components/Tweet';
import { tracker } from '@/lib/tracker';
import { BarChart3, Cloud, LogOut, Shield, Zap } from 'lucide-react';

export default function FeedPage() {
  const [tweets, setTweets] = useState([
    {
      id: '1',
      author: 'Elon Musk',
      handle: 'elonmusk',
      content: 'Funding secured for the analytics dashboard integration. 🚀',
      likes: 4200,
    },
    {
      id: '2',
      author: 'Pathways Architect',
      handle: 'devops_ninja',
      content: 'Just successfully fired off 3 events into Kafka via the tracker SDK.',
      likes: 125,
    }
  ]);

  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role || 'user';

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      tracker.setSession(session);
      tracker.track('view_feed', { session_source: document.referrer || 'direct' });
      
      if (localStorage.getItem('has_logged_in') !== 'true') {
        tracker.track('login', { ip: '111.111.111.111' });
        localStorage.setItem('has_logged_in', 'true');
      }
    }
  }, [session]);

  const handleNewTweet = (content: string) => {
    const authorName = session?.user?.name || 'Anonymous User';
    const authorHandle = session?.user?.email?.split('@')[0] || 'anonymous';
    
    setTweets([{
      id: Math.random().toString(),
      author: authorName,
      handle: authorHandle,
      content,
      likes: 0
    }, ...tweets]);
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-2xl bg-white border-x border-gray-200 min-h-screen shadow-sm">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-bold">Home</h1>
            
            <div className="flex items-center gap-2">
              {/* Role-based admin links */}
              {userRole === 'app_admin' && (
                <a
                  href="http://localhost:3001/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-full text-xs font-semibold transition-colors border border-orange-200"
                  title="Open detailed analytics dashboard"
                >
                  <BarChart3 size={14} />
                  <span>Analytics</span>
                </a>
              )}
              
              {userRole === 'super_admin' && (
                <a
                  href="http://localhost:3001/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-semibold transition-colors border border-blue-200"
                  title="Open company admin dashboard"
                >
                  <Cloud size={14} />
                  <span>Admin</span>
                </a>
              )}

              {/* User info & sign out */}
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-gray-700 leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{
                    userRole === 'app_admin' ? '🔒 App Admin' : 
                    userRole === 'super_admin' ? '☁️ Super Admin' : 
                    '👤 User'
                  }</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <TweetBox onTweet={handleNewTweet} />
        
        <div className="divide-y divide-gray-200">
          {tweets.map(t => (
            <Tweet 
              key={t.id}
              id={t.id}
              author={t.author}
              handle={t.handle}
              content={t.content}
              initialLikes={t.likes}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
