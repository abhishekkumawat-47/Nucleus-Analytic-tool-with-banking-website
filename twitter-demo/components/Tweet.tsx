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
    <div className="border-b border-gray-200 p-4 hover:bg-gray-50 flex space-x-4 cursor-pointer">
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold flex-shrink-0">
        {author[0]}
      </div>
      <div className="flex-1">
        <div className="flex space-x-1 items-center">
          <span className="font-bold text-gray-900">{author}</span>
          <span className="text-gray-500">@{handle}</span>
        </div>
        <p className="text-gray-800 mt-1">{content}</p>
        
        <div className="flex justify-between mt-3 text-gray-500 max-w-md">
          <button onClick={handleComment} className="flex items-center space-x-2 hover:text-blue-500 transition">
            <MessageCircle size={18} />
            <span className="text-sm">{comments}</span>
          </button>
          <button onClick={handleRepost} className="flex items-center space-x-2 hover:text-green-500 transition">
            <Repeat size={18} />
            <span className="text-sm">{reposts}</span>
          </button>
          <button 
            onClick={handleLike}
            className={`flex items-center space-x-2 transition ${liked ? 'text-pink-500' : 'hover:text-pink-500'}`}
          >
            <Heart size={18} fill={liked ? "currentColor" : "none"} />
            <span className="text-sm">{likes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
