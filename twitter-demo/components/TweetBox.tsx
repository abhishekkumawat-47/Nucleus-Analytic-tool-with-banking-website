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
    <div className="border-b border-gray-100 p-5 bg-white transition-colors duration-200">
      <form onSubmit={handleSubmit} className="flex space-x-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 shadow-sm flex items-center justify-center text-white font-bold flex-shrink-0">
          U
        </div>
        <div className="flex-1">
          <textarea
            className="w-full text-xl outline-none resize-none pt-2 placeholder-gray-400 text-gray-800 bg-transparent transition-all duration-200 focus:placeholder-gray-300"
            rows={2}
            placeholder="What is happening?!"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between mt-3 border-t border-gray-100 pt-3">
            <div className="text-blue-400 text-sm font-medium flex gap-4 cursor-pointer hover:text-blue-500 transition-colors">
              {/* Optional: Add media upload icons here later if desired */}
            </div>
            <button
              type="submit"
              disabled={!content.trim()}
              className="bg-blue-500 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              Post
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
