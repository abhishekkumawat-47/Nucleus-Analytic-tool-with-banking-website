'use client';

import { useState } from 'react';
import { tracker } from '@/lib/tracker';

export default function TweetBox({ onTweet }: { onTweet: (content: string) => void }) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    // Track the analytics event for the funnel
    tracker.track('post_tweet', { length: content.length, media_attached: false });

    onTweet(content);
    setContent('');
  };

  return (
    <div className="border-b border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex space-x-4">
        <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0"></div>
        <div className="flex-1">
          <textarea
            className="w-full text-xl outline-none resize-none pt-2"
            rows={2}
            placeholder="What is happening?!"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!content.trim()}
              className="bg-blue-500 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50 hover:bg-blue-600 transition"
            >
              Post
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
