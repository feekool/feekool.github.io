import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';
import { Forum, listForums, createForum } from '../lib/forum';
import { useTranslation } from '../lib/i18n';
import { useAuth } from '../lib/auth';
export function HomePage() {
  const [forums, setForums] = useState<Forum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newForumTitle, setNewForumTitle] = useState('');
  const [newForumDesc, setNewForumDesc] = useState('');
  const { t } = useTranslation();
  const { user } = useAuth();
  const loadForums = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await listForums();
      setForums(data);
    } catch (err: any) {
      console.error(err);
      setError(t('error'));
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadForums();
  }, []);
  const handleCreateForum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsCreating(true);
    try {
      const slug = newForumTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      
      const newForum = await createForum({
        slug,
        title: newForumTitle,
        description: newForumDesc,
        order: String(forums.length),
        createdBy: user.username,
        createdAt: new Date().toISOString()
      });
      
      // Добавляем новый форум в список
      setForums(prevForums => [...prevForums, newForum]);
      
      setShowCreateModal(false);
      setNewForumTitle('');
      setNewForumDesc('');
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
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={loadForums} className="text-blue-600 hover:underline">
          {t('retry')}
        </button>
      </div>);

  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('boards')}</h1>
        {user &&
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
          
            <Plus className="w-4 h-4" />
            {t('createBoard')}
          </button>
        }
      </div>

      {forums.length === 0 ?
      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('noBoards')}</p>
        </div> :

      <div className="grid gap-4 md:grid-cols-2">
          {forums.map((forum) =>
        <Link
          key={forum.slug}
          to={`/forum/${forum.slug}`}
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
          
              <h2 className="text-xl font-semibold mb-2 text-blue-600 dark:text-blue-400">
                {forum.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                {forum.description}
              </p>
            </Link>
        )}
        </div>
      }

      {showCreateModal &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mobile-form shadow-xl">
            <h2 className="text-xl font-bold mb-4">{t('createBoard')}</h2>
            <form onSubmit={handleCreateForum} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('title')}
                </label>
                <input
                type="text"
                required
                value={newForumTitle}
                onChange={(e) => setNewForumTitle(e.target.value)}
                className="w-full mobile-input border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('description')}
                </label>
                <textarea
                required
                value={newForumDesc}
                onChange={(e) => setNewForumDesc(e.target.value)}
                className="w-full mobile-textarea border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 resize-none" />
              
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