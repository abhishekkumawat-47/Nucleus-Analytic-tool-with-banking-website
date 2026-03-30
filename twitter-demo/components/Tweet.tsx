'use client';

import { useState } from 'react';
import { tracker } from '@/lib/tracker';
import { Heart, MessageCircle, Repeat } from 'lucide-react';

interface TweetProps {
  id: string;
  author: string;
  handle: string;
  content: string;
  initialLikes: number;
}

export default function Tweet({ id, author, handle, content, initialLikes }: TweetProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState(0);
  const [reposts, setReposts] = useState(0);

  const handleLike = () => {
    if (!liked) {
      setLikes(l => l + 1);
      setLiked(true);
      
      // Track the interaction
      tracker.track('like_tweet', { target_tweet_id: id, author_handle: handle });
    }
  };

  const handleComment = () => {
    setComments(c => c + 1);
    tracker.track('comment_tweet', { target_tweet_id: id, author_handle: handle });
  };

  const handleRepost = () => {
    setReposts(r => r + 1);
    tracker.track('repost_tweet', { target_tweet_id: id, author_handle: handle });
  };

  return (
    <article className="border-b border-gray-100 p-5 hover:bg-gray-50/80 flex space-x-4 cursor-pointer transition-colors duration-200 group">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center text-blue-600 font-bold flex-shrink-0 shadow-inner border border-blue-100/50">
        {author[0]}
      </div>
      <div className="flex-1">
        <div className="flex space-x-2 items-center mb-0.5">
          <span className="font-bold text-gray-900 group-hover:underline decoration-gray-400 decoration-1 underline-offset-2">{author}</span>
          <span className="text-gray-500 font-medium">@{handle}</span>
          <span className="text-gray-400 text-sm">· 2h</span>
        </div>
        <p className="text-gray-800 leading-relaxed text-[15px]">{content}</p>
        
        <div className="flex justify-between mt-4 text-gray-500 max-w-md pr-10">
          <button 
            onClick={(e) => { e.stopPropagation(); handleComment(); }} 
            className="flex items-center space-x-2 group/btn transition"
          >
            <div className="p-2 -m-2 rounded-full group-hover/btn:bg-blue-50 group-hover/btn:text-blue-500 transition-colors">
              <MessageCircle size={18} />
            </div>
            <span className="text-sm font-medium group-hover/btn:text-blue-500 transition-colors">{comments > 0 ? comments : ''}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleRepost(); }} 
            className="flex items-center space-x-2 group/btn transition"
          >
            <div className="p-2 -m-2 rounded-full group-hover/btn:bg-green-50 group-hover/btn:text-green-500 transition-colors">
              <Repeat size={18} />
            </div>
            <span className="text-sm font-medium group-hover/btn:text-green-500 transition-colors">{reposts > 0 ? reposts : ''}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className={`flex items-center space-x-2 group/btn transition ${liked ? 'text-pink-500' : ''}`}
          >
            <div className={`p-2 -m-2 rounded-full transition-colors ${liked ? 'bg-pink-50/50' : 'group-hover/btn:bg-pink-50 group-hover/btn:text-pink-500'}`}>
              <Heart size={18} className={liked ? "scale-110 transition-transform" : "transition-transform"} fill={liked ? "currentColor" : "none"} />
            </div>
            <span className={`text-sm font-medium transition-colors ${liked ? 'text-pink-500' : 'group-hover/btn:text-pink-500'}`}>{likes > 0 ? likes : ''}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
