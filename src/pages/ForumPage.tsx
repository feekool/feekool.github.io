import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Plus,
  Loader2,
  MessageCircle,
  Clock,
  User as UserIcon } from
'lucide-react';
import { Forum, Topic, getForum, listTopics, createTopic } from '../lib/forum';
import { useTranslation } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { MarkdownEditor } from '../components/MarkdownEditor';
export function ForumPage() {
  const { slug } = useParams<{
    slug: string;
  }>();
  const [forum, setForum] = useState<Forum | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicBody, setNewTopicBody] = useState('');
  const { t } = useTranslation();
  const { user } = useAuth();
  const loadData = async () => {
    if (!slug) return;
    setIsLoading(true);
    setError('');
    try {
      const [forumData, topicsData] = await Promise.all([
      getForum(slug),
      listTopics(slug)]
      );
      setForum(forumData);
      setTopics(topicsData);
    } catch (err: any) {
      console.error(err);
      setError(t('error'));
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, [slug]);
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !slug) return;
    setIsCreating(true);
    try {
      const newTopic = await createTopic({
        title: newTopicTitle,
        forumSlug: slug,
        author: user.username,
        body: newTopicBody
      });
      
      // Добавляем новый топик в начало списка (новые сверху)
      setTopics(prevTopics => [newTopic, ...prevTopics]);
      
      setShowCreateModal(false);
      setNewTopicTitle('');
      setNewTopicBody('');
    } catch (err: any) {
      console.error(err);
      alert(t('error'));
    } finally {
      setIsCreating(false);
    }
  };
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>);

  }
  if (error || !forum) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error || 'Forum not found'}</p>
        <Link to="/" className="text-blue-600 hover:underline">
          &larr; Back to {t('boards')}
        </Link>
      </div>);

  }
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <Link
              to="/"
              className="text-sm text-blue-600 hover:underline mb-2 inline-block">
              
              &larr; {t('boards')}
            </Link>
            <h1 className="text-2xl font-bold mb-2">{forum.title}</h1>
            <p className="text-gray-600 dark:text-gray-300">
              {forum.description}
            </p>
          </div>
          {user &&
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap">
            
              <Plus className="w-4 h-4" />
              {t('createTopic')}
            </button>
          }
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {topics.length === 0 ?
        <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('noTopics')}</p>
          </div> :

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {topics.map((topic) =>
          <Link
            key={topic.id}
            to={`/topic/${topic.id}`}
            className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            
                <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-2">
                  {topic.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    {topic.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(topic.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
          )}
          </div>
        }
      </div>

      {showCreateModal &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mobile-form shadow-xl">
            <h2 className="text-xl font-bold mb-4">{t('createTopic')}</h2>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('title')}
                </label>
                <input
                type="text"
                required
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="w-full mobile-input border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('content')}
                </label>
                <MarkdownEditor
                  value={newTopicBody}
                  onChange={setNewTopicBody}
                  placeholder="Markdown supported..."
                  rows={8}
                />
              
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                
                  {t('cancel')}
                </button>
                <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 disabled:opacity-50">
                
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}