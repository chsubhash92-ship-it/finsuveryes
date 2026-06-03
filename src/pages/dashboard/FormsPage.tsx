import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FileText, MoreVertical, Edit2, Trash2, Copy,
  Share2, Globe, EyeOff, Clock, MessageSquare, ExternalLink, CheckCircle, BarChart2, Terminal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formService } from '../../services/formService';
import { supabase } from '../../supabase/client';
import type { Form } from '../../supabase/client';
import { format } from 'date-fns';

interface FormWithCount extends Form {
  responseCount?: number;
}

export default function FormsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadForms();
  }, [user]);

  const loadForms = async () => {
    setLoading(true);
    const { data } = await formService.getForms(user!.id);
    if (data) {
      const withCounts = await Promise.all(
        data.map(async form => {
          const { count } = await supabase
            .from('responses')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', form.id);
          return { ...form, responseCount: count || 0 };
        })
      );
      setForms(withCounts);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    const { data } = await formService.createForm(user!.id, 'Untitled Form');
    if (data) navigate(`/dashboard/forms/${data.id}`);
  };

  const handleDelete = async (id: string) => {
    await formService.deleteForm(id);
    setForms(forms.filter(f => f.id !== id));
    setDeleteId(null);
  };

  const handleDuplicate = async (form: Form) => {
    const { data } = await formService.duplicateForm(form, user!.id);
    if (data) {
      setForms(prev => [{ ...data, responseCount: 0 }, ...prev]);
    }
    setActiveMenu(null);
  };

  const handleTogglePublish = async (form: Form) => {
    const { data } = await formService.updateForm(form.id, { is_published: !form.is_published });
    if (data) setForms(forms.map(f => f.id === form.id ? { ...f, is_published: data.is_published } : f));
    setActiveMenu(null);
  };

  const handleCopyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    setActiveMenu(null);
  };

  const filtered = forms.filter(f =>
    f.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Forms</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{forms.length} forms total</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
        >
          <Plus className="w-4 h-4" />
          New Form
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search forms..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-24 text-center"
        >
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-900 dark:text-white font-semibold mb-1">
            {search ? 'No forms match your search' : 'No forms yet'}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
            {search ? 'Try a different search term' : 'Create your first form to get started'}
          </p>
          {!search && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Form
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((form, i) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all group relative"
              >
                {/* Color Bar */}
                <div className="h-2 rounded-t-2xl" style={{ background: form.theme_color }} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{form.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {form.description || 'No description'}
                      </p>
                    </div>
                    {/* Menu Button */}
                    <div className="relative flex-shrink-0 z-20">
                      <button
                        onClick={() => setActiveMenu(activeMenu === form.id ? null : form.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {activeMenu === form.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden"
                          >
                            <button
                              onClick={() => { navigate(`/dashboard/forms/${form.id}`); setActiveMenu(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" /> Edit Form
                            </button>
                            <button
                              onClick={() => { navigate(`/dashboard/forms/${form.id}/responses`); setActiveMenu(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <BarChart2 className="w-4 h-4" /> View Responses
                            </button>
                            <button
                              onClick={() => { navigate(`/dashboard/forms/${form.id}/responses?apiTest=true`); setActiveMenu(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <Terminal className="w-4 h-4" /> Python Request Test
                            </button>
                            <button
                              onClick={() => handleDuplicate(form)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <Copy className="w-4 h-4" /> Duplicate
                            </button>
                            <button
                              onClick={() => handleTogglePublish(form)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              {form.is_published ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                              {form.is_published ? 'Unpublish' : 'Publish'}
                            </button>
                            {form.is_published && (
                              <button
                                onClick={() => handleCopyLink(form.slug, form.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Share2 className="w-4 h-4" />
                                {copied === form.id ? 'Copied!' : 'Copy Link'}
                              </button>
                            )}
                            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                            <button
                              onClick={() => { setDeleteId(form.id); setActiveMenu(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {form.questions?.length || 0} questions
                    </div>
                    <Link
                      to={`/dashboard/forms/${form.id}/responses`}
                      onClick={e => e.stopPropagation()}
                      className="relative z-20 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {form.responseCount} responses
                    </Link>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                      <Clock className="w-3 h-3" />
                      {format(new Date(form.updated_at || form.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        form.is_published
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {form.is_published ? 'Published' : 'Draft'}
                      </span>
                      {form.is_published && (
                        <Link
                          to={`/form/${form.slug}`}
                          target="_blank"
                          className="relative z-20 p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Click to edit overlay */}
                <Link
                  to={`/dashboard/forms/${form.id}`}
                  className="absolute inset-0 z-10 rounded-2xl"
                  style={{ top: '2px' }}
                  onClick={e => activeMenu === form.id && e.preventDefault()}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Close menu on outside click */}
      {activeMenu && (
        <div className="fixed inset-0 z-[5]" onClick={() => setActiveMenu(null)} />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">Delete Form</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                This will permanently delete the form and all its responses. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
