'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import TweetBox from '@/components/TweetBox';
import Tweet from '@/components/Tweet';
import { tracker } from '@/lib/tracker';

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

  const { data: session } = useSession();

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

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-2xl bg-white border-x border-gray-200 min-h-screen shadow-sm">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md p-4 border-b border-gray-200 z-10">
          <h1 className="text-xl font-bold">Home</h1>
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
