import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Eye, Globe, EyeOff, ArrowLeft, Plus, Settings,
  Share2, CheckCircle, Loader, ChevronDown, ChevronUp, Link2, QrCode, X
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import QRCode from 'react-qr-code';
import { useAuth } from '../../context/AuthContext';
import { formService } from '../../services/formService';
import type { Form, Question, QuestionType } from '../../supabase/client';
import { FIELD_TYPES, QuestionCard } from '../../components/form-builder/QuestionCard';
import { nanoid } from '../../utils/nanoid';

function SortableQuestion({
  question, index, total, onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown
}: {
  question: Question; index: number; total: number;
  onUpdate: (q: Question) => void; onDelete: () => void;
  onDuplicate: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <QuestionCard
        question={question}
        index={index}
        total={total}
        dragHandleProps={{ ...attributes, ...listeners }}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isNew) {
      initNewForm();
    } else if (id) {
      loadForm(id);
    }
  }, [id]);

  const initNewForm = async () => {
    const { data } = await formService.createForm(user!.id, 'Untitled Form');
    if (data) {
      setForm(data);
      setQuestions(data.questions || []);
      navigate(`/dashboard/forms/${data.id}`, { replace: true });
    }
  };

  const loadForm = async (formId: string) => {
    setLoading(true);
    const { data } = await formService.getFormById(formId);
    if (data) {
      setForm(data);
      setQuestions(data.questions || []);
    }
    setLoading(false);
  };

  const addQuestion = (type: QuestionType) => {
    const defaultOptions = ['dropdown', 'multiple_choice', 'checkboxes'].includes(type)
      ? ['Option 1', 'Option 2', 'Option 3'] : undefined;
    const q: Question = {
      id: nanoid(),
      type,
      label: type === 'section_divider' ? 'Section Title' : 'Untitled Question',
      required: false,
      options: defaultOptions,
      min: type === 'linear_scale' ? 1 : undefined,
      max: type === 'linear_scale' ? 10 : undefined,
    };
    setQuestions(prev => [...prev, q]);
    setFieldPickerOpen(false);
  };

  const updateQuestion = (id: string, updated: Question) => {
    setQuestions(prev => prev.map(q => q.id === id ? updated : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const duplicateQuestion = (q: Question) => {
    const dup = { ...q, id: nanoid(), label: q.label + ' (Copy)' };
    setQuestions(prev => {
      const idx = prev.findIndex(x => x.id === q.id);
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  };

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id);
      if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === prev.length - 1)) return prev;
      const next = [...prev];
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions(prev => {
        const oldIdx = prev.findIndex(q => q.id === active.id);
        const newIdx = prev.findIndex(q => q.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    await formService.updateForm(form.id, {
      title: form.title,
      description: form.description,
      questions,
      is_published: form.is_published,
      collect_email: form.collect_email,
      submission_limit: form.submission_limit,
      theme_color: form.theme_color,
      slug: form.slug,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [form, questions]);

  // Auto-save
  useEffect(() => {
    if (!form || loading) return;
    const timer = setTimeout(handleSave, 2000);
    return () => clearTimeout(timer);
  }, [form, questions]);

  const handleTogglePublish = async () => {
    if (!form) return;
    const updated = { ...form, is_published: !form.is_published };
    setForm(updated);
    await formService.updateForm(form.id, { is_published: updated.is_published });
  };

  const shareUrl = form ? `${window.location.origin}/form/${form.slug}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!form) return null;

  const groups = ['Basic', 'Choice', 'Advanced', 'Layout'];

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50 px-4 lg:px-6 py-3.5 flex items-center gap-3 flex-shrink-0">
        <Link
          to="/dashboard/forms"
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-0 outline-none w-full min-w-0"
            placeholder="Form title..."
          />
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs ${form.is_published ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`}>
              {form.is_published ? 'Published' : 'Draft'}
            </span>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{questions.length} questions</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            {saving ? (
              <><Loader className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            ) : saved ? (
              <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Saved</>
            ) : (
              <><CheckCircle className="w-3.5 h-3.5" /> Auto-save on</>
            )}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          <button
            onClick={handleTogglePublish}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl transition-all ${
              form.is_published
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/30'
            }`}
          >
            {form.is_published ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            <span className="hidden sm:inline">{form.is_published ? 'Unpublish' : 'Publish'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Builder Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Form Header Edit */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-t-4 border-gray-100 dark:border-gray-700 shadow-sm mb-4 overflow-hidden"
            style={{ borderTopColor: form.theme_color }}>
            <div className="p-6">
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-0 outline-none border-b-2 border-transparent focus:border-blue-200 dark:focus:border-blue-700 transition-all pb-1"
                placeholder="Form title..."
              />
              <textarea
                value={form.description || ''}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full mt-3 text-sm text-gray-600 dark:text-gray-400 bg-transparent border-0 outline-none border-b border-transparent focus:border-gray-200 dark:focus:border-gray-600 transition-all resize-none"
                placeholder="Form description (optional)..."
                rows={2}
              />
            </div>
          </div>

          {/* Questions */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {questions.map((q, i) => (
                    <SortableQuestion
                      key={q.id}
                      question={q}
                      index={i}
                      total={questions.length}
                      onUpdate={updated => updateQuestion(q.id, updated)}
                      onDelete={() => deleteQuestion(q.id)}
                      onDuplicate={() => duplicateQuestion(q)}
                      onMoveUp={() => moveQuestion(q.id, 'up')}
                      onMoveDown={() => moveQuestion(q.id, 'down')}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Field Button */}
          <div className="mt-4 relative">
            <button
              onClick={() => setFieldPickerOpen(!fieldPickerOpen)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl text-sm font-medium transition-all group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              Add Question
              <ChevronDown className={`w-4 h-4 transition-transform ${fieldPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {fieldPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-20 p-4"
                >
                  {groups.map(group => {
                    const groupTypes = FIELD_TYPES.filter(t => t.group === group);
                    return (
                      <div key={group} className="mb-4 last:mb-0">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">{group}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {groupTypes.map(({ type, label, icon: Icon }) => (
                            <button
                              key={type}
                              onClick={() => addQuestion(type)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-left"
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {fieldPickerOpen && (
            <div className="fixed inset-0 z-[15]" onClick={() => setFieldPickerOpen(false)} />
          )}
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700/50 overflow-y-auto flex-shrink-0"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Form Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Slug */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Form URL Slug</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl">
                      <span className="text-xs text-gray-400">/form/</span>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        className="flex-1 text-sm text-gray-900 dark:text-white bg-transparent outline-none"
                      />
                    </div>
                  </div>

                  {/* Theme Color */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Theme Color</label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setForm({ ...form, theme_color: color })}
                          className={`w-7 h-7 rounded-xl transition-all ${form.theme_color === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110' : 'hover:scale-110'}`}
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Collect Email */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Collect Email</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ask respondents for email</p>
                    </div>
                    <button
                      onClick={() => setForm({ ...form, collect_email: !form.collect_email })}
                      className={`w-10 h-5.5 h-6 rounded-full transition-all relative ${form.collect_email ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.collect_email ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* Submission Limit */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Submission Limit</label>
                    <input
                      type="number"
                      value={form.submission_limit || ''}
                      onChange={e => setForm({ ...form, submission_limit: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Unlimited"
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* View Form */}
                  {form.is_published && (
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      Preview Form
                    </a>
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-900 dark:text-white">Share Form</h3>
                <button onClick={() => setShowShareModal(false)} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!form.is_published && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                  Publish your form first to share it with others.
                </div>
              )}

              <div className="flex gap-2 mb-5">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl">
                  <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{shareUrl}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    copied ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <button
                onClick={() => setShowQR(!showQR)}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
              >
                <QrCode className="w-4 h-4" />
                {showQR ? 'Hide' : 'Show'} QR Code
                <ChevronDown className={`w-4 h-4 transition-transform ${showQR ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showQR && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white p-4 rounded-xl border border-gray-200 dark:border-gray-600 flex justify-center">
                      <QRCode value={shareUrl} size={160} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
