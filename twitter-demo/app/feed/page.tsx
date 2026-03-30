'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TweetBox from '@/components/TweetBox';
import Tweet from '@/components/Tweet';
import LocationConsent from '@/components/LocationConsent';
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
      <div className="w-full max-w-2xl bg-white border-x border-gray-100 min-h-screen shadow-sm sm:my-0">
        <header className="sticky top-0 bg-white/70 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] backdrop-blur-xl border-b border-gray-100 z-10 transition-colors">
          <div className="flex items-center justify-between p-4 px-5">
            <h1 className="text-xl font-extrabold tracking-tight">Home</h1>
            
            <div className="flex items-center gap-3">
              {/* User info & sign out */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900 leading-tight">{session?.user?.name || 'Anonymous'}</p>
                  <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">@{session?.user?.email?.split('@')[0] || 'user'}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="p-2.5 text-gray-500 bg-gray-50 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                  title="Sign out"
                >
                  <LogOut size={16} className="stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <TweetBox onTweet={handleNewTweet} />
        
        <div className="divide-y divide-gray-100 h-full pb-96">
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
      <LocationConsent />
    </div>
  );
}
