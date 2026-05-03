import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, User as UserIcon, Clock, Send } from 'lucide-react';
import { Topic, Post, getTopic, listPosts, createPost } from '../lib/forum';
import { useTranslation } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { MarkdownContent } from '../components/MarkdownContent';
import { MarkdownEditor } from '../components/MarkdownEditor';
export function TopicPage() {
  const { id } = useParams<{
    id: string;
  }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();
  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const [topicData, postsData] = await Promise.all([
      getTopic(id),
      listPosts(id)]
      );
      setTopic(topicData);
      setPosts(postsData);
    } catch (err: any) {
      console.error(err);
      setError(t('error'));
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, [id]);
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !replyBody.trim()) return;
    setIsReplying(true);
    try {
      const newPost = await createPost({
        topicId: id,
        author: user.username,
        body: replyBody
      });
      
      // Добавляем новый пост в конец списка
      setPosts(prevPosts => [...prevPosts, newPost]);
      
      setReplyBody('');
    } catch (err: any) {
      console.error(err);
      alert(t('error'));
    } finally {
      setIsReplying(false);
    }
  };
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>);

  }
  if (error || !topic) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error || 'Topic not found'}</p>
        <Link to="/" className="text-blue-600 hover:underline">
          &larr; Back to {t('home')}
        </Link>
      </div>);

  }
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Link
          to={`/forum/${topic.forumSlug}`}
          className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          
          &larr; Back to {t('topics')}
        </Link>
        <h1 className="text-2xl font-bold">{topic.title}</h1>
      </div>

      {/* Original Topic Post */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 sm:w-48 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 flex flex-col items-center sm:items-start">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
              <UserIcon className="w-8 h-8" />
            </div>
            <span className="font-medium text-center sm:text-left w-full break-words">
              {topic.author}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(topic.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="p-6 flex-1">
            <MarkdownContent content={topic.body} />
          </div>
        </div>
      </div>

      {/* Replies */}
      {posts.map((post) =>
      <div
        key={post.id}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        
          <div className="flex flex-col sm:flex-row">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 sm:w-48 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 flex flex-col items-center sm:items-start">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                <UserIcon className="w-8 h-8" />
              </div>
              <span className="font-medium text-center sm:text-left w-full break-words">
                {post.author}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="p-6 flex-1">
              <MarkdownContent content={post.body} />
            </div>
          </div>
        </div>
      )}

      {/* Reply Form */}
      {user ?
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mobile-form mt-8">
          <h3 className="text-lg font-medium mb-4">{t('postReply')}</h3>
          <form onSubmit={handleReply}>
            <MarkdownEditor
              value={replyBody}
              onChange={setReplyBody}
              placeholder="Write your reply..."
              className="mb-4"
              rows={4}
            />
          
            <div className="flex justify-end">
              <button
              type="submit"
              disabled={isReplying || !replyBody.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 disabled:opacity-50 min-h-[44px]">
              
                {isReplying ?
              <Loader2 className="w-4 h-4 animate-spin" /> :

              <Send className="w-4 h-4" />
              }
                {t('reply')}
              </button>
            </div>
          </form>
        </div> :

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center mt-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You must be logged in to reply.
          </p>
          <Link
          to="/auth"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
          
            {t('login')}
          </Link>
        </div>
      }
    </div>);

}