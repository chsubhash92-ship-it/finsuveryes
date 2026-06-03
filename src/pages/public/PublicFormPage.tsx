import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, CheckCircle, AlertCircle, Star, ChevronDown, Calendar, Upload, Loader
} from 'lucide-react';
import { formService } from '../../services/formService';
import { responseService } from '../../services/responseService';
import { supabase } from '../../supabase/client';
import type { Form, Question } from '../../supabase/client';

function QuestionRenderer({
  question,
  value,
  onChange,
  error,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const inputClass = `w-full px-4 py-3 bg-white dark:bg-gray-700 border ${
    error ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
  } rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm`;

  if (question.type === 'section_divider') {
    return (
      <div className="pt-2 pb-1">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{question.label}</h3>
        {question.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{question.description}</p>}
        <div className="h-px bg-gray-200 dark:bg-gray-700 mt-3" />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {question.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{question.description}</p>
      )}

      {question.type === 'short_text' && (
        <input type="text" value={String(value || '')} onChange={e => onChange(e.target.value)} placeholder={question.placeholder} className={inputClass} />
      )}

      {question.type === 'paragraph' && (
        <textarea value={String(value || '')} onChange={e => onChange(e.target.value)} placeholder={question.placeholder} rows={4} className={`${inputClass} resize-none`} />
      )}

      {question.type === 'email' && (
        <input type="email" value={String(value || '')} onChange={e => onChange(e.target.value)} placeholder={question.placeholder || 'you@example.com'} className={inputClass} />
      )}

      {question.type === 'number' && (
        <input type="number" value={String(value || '')} onChange={e => onChange(e.target.value)} placeholder={question.placeholder} className={inputClass} />
      )}

      {question.type === 'phone' && (
        <input type="tel" value={String(value || '')} onChange={e => onChange(e.target.value)} placeholder={question.placeholder || '+1 (555) 000-0000'} className={inputClass} />
      )}

      {question.type === 'date' && (
        <input type="date" value={String(value || '')} onChange={e => onChange(e.target.value)} className={inputClass} />
      )}

      {question.type === 'dropdown' && (
        <div className="relative">
          <select value={String(value || '')} onChange={e => onChange(e.target.value)} className={`${inputClass} appearance-none pr-10`}>
            <option value="">Select an option...</option>
            {(question.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      )}

      {question.type === 'multiple_choice' && (
        <div className="space-y-2">
          {(question.options || []).map(opt => (
            <label key={opt} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                value === opt ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-500'
              }`}>
                {value === opt && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
              <input type="radio" name={question.id} value={opt} checked={value === opt} onChange={e => onChange(e.target.value)} className="sr-only" />
              <span className="text-sm text-gray-900 dark:text-white">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'checkboxes' && (
        <div className="space-y-2">
          {(question.options || []).map(opt => {
            const checked = Array.isArray(value) && (value as string[]).includes(opt);
            return (
              <label key={opt} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all">
                <div
                  onClick={() => {
                    const arr = Array.isArray(value) ? [...(value as string[])] : [];
                    onChange(checked ? arr.filter(v => v !== opt) : [...arr, opt]);
                  }}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                    checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-500'
                  }`}
                >
                  {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'yes_no' && (
        <div className="flex gap-3">
          {['Yes', 'No'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all border-2 ${
                value === opt
                  ? opt === 'Yes' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === 'rating' && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`w-11 h-11 rounded-xl border-2 font-semibold text-sm transition-all ${
                Number(value) >= n
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-500'
                  : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-amber-300'
              }`}
            >
              <Star className={`w-5 h-5 mx-auto ${Number(value) >= n ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          ))}
        </div>
      )}

      {question.type === 'linear_scale' && (
        <div>
          <input
            type="range"
            min={question.min ?? 1}
            max={question.max ?? 10}
            value={Number(value || question.min || 1)}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{question.min ?? 1}</span>
            <span className="text-blue-600 font-semibold">{String(value || question.min || 1)}</span>
            <span>{question.max ?? 10}</span>
          </div>
        </div>
      )}

      {question.type === 'file_upload' && (
        <label className="block">
          <div className="px-4 py-8 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl text-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-all">
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload a file</p>
            <p className="text-xs text-gray-400 mt-1">Max file size 10MB</p>
          </div>
          <input type="file" className="sr-only" onChange={e => onChange(e.target.files?.[0]?.name || '')} />
        </label>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);

  useEffect(() => {
    if (slug) loadForm();
  }, [slug]);

  const loadForm = async () => {
    setLoading(true);
    const { data } = await formService.getFormBySlug(slug!);
    if (!data) {
      setNotFound(true);
    } else {
      setForm(data);
      // Check submission count
      const { count } = await supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', data.id);
      setSubmissionCount(count || 0);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate
    const newErrors: Record<string, string> = {};
    const questions = (form.questions || []) as Question[];

    questions.forEach(q => {
      if (q.type === 'section_divider') return;
      if (!q.required) return;
      const val = answers[q.id];
      if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) {
        newErrors[q.id] = 'This field is required';
      }
    });

    if (form.collect_email && !email) {
      newErrors['_email'] = 'Email is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Check submission limit
    if (form.submission_limit && submissionCount >= form.submission_limit) {
      setErrors({ _limit: 'This form has reached its submission limit.' });
      return;
    }

    setSubmitting(true);
    const { error } = await responseService.submitResponse(
      form.id,
      answers,
      form.collect_email ? email : undefined
    );
    setSubmitting(false);

    if (!error) {
      setSubmitted(true);
    } else {
      setErrors({ _submit: 'Failed to submit. Please try again.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Form Not Found</h1>
          <p className="text-gray-500 dark:text-gray-400">This form doesn't exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  if (form.submission_limit && submissionCount >= form.submission_limit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Form Closed</h1>
          <p className="text-gray-500 dark:text-gray-400">This form has reached its submission limit.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-10 max-w-md w-full text-center border border-gray-100 dark:border-gray-700 shadow-xl"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Thank you!</h2>
          <p className="text-gray-500 dark:text-gray-400">Your response has been successfully submitted.</p>
        </motion.div>
      </div>
    );
  }

  const questions = (form.questions || []) as Question[];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Form Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm mb-4"
        >
          <div className="h-2" style={{ background: form.theme_color }} />
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{form.title}</h1>
            {form.description && <p className="text-sm text-gray-600 dark:text-gray-400">{form.description}</p>}
            {form.collect_email && <p className="text-xs text-gray-400 mt-2">* Required</p>}
          </div>
        </motion.div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email collection */}
          {form.collect_email && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6"
            >
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors['_email'] ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'} rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              />
              {errors['_email'] && <p className="mt-1.5 text-xs text-red-500">{errors['_email']}</p>}
            </motion.div>
          )}

          {/* Questions */}
          {questions.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={q.type === 'section_divider' ? '' : 'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6'}
            >
              <QuestionRenderer
                question={q}
                value={answers[q.id]}
                onChange={val => {
                  setAnswers(prev => ({ ...prev, [q.id]: val }));
                  if (errors[q.id]) setErrors(prev => { const e = { ...prev }; delete e[q.id]; return e; });
                }}
                error={errors[q.id]}
              />
            </motion.div>
          ))}

          {errors['_submit'] && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-600 dark:text-red-400">
              {errors['_submit']}
            </div>
          )}

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-end"
          >
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 font-semibold text-white rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
              style={{ background: form.theme_color }}
            >
              {submitting ? (
                <><Loader className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                'Submit'
              )}
            </button>
          </motion.div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Powered by FormCraft
        </div>
      </div>
    </div>
  );
}
