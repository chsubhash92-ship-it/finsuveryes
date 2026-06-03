import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Download, Search, Trash2, FileText, Calendar,
  Filter, ChevronDown, X, BarChart2, Table, Terminal, Copy, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formService } from '../../services/formService';
import { responseService } from '../../services/responseService';
import { exportCSV, exportExcel } from '../../utils/exportUtils';
import type { Form, Response, Question } from '../../supabase/client';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function getAnswerAnalytics(question: Question, responses: Response[]) {
  if (!['dropdown', 'multiple_choice', 'checkboxes', 'yes_no', 'rating'].includes(question.type)) return null;

  const counts: Record<string, number> = {};
  responses.forEach(r => {
    const ans = (r.answers as Record<string, unknown>)[question.id];
    const vals = Array.isArray(ans) ? ans : ans != null ? [String(ans)] : [];
    vals.forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
    });
  });

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export default function ResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'analytics'>('table');
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiModalTab, setApiModalTab] = useState<'get' | 'post'>('get');
  const [copied, setCopied] = useState(false);

  const questions = (form?.questions || []).filter(q => q.type !== 'section_divider') as Question[];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_SUPABASE_URL.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

  const buildPythonAnswersDict = () => {
    if (!questions || questions.length === 0) {
      return '        # No questions in form';
    }
    return questions.map(q => {
      let val: string;
      switch (q.type) {
        case 'short_text':
          val = `"Sample ${q.label.replace(/"/g, '\\"')}"`;
          break;
        case 'paragraph':
          val = `"This is a sample paragraph response for: ${q.label.replace(/"/g, '\\"')}"`;
          break;
        case 'email':
          val = `"test@example.com"`;
          break;
        case 'number':
          val = String(q.max ? Math.floor((q.min || 0) + (q.max - (q.min || 0)) / 2) : 42);
          break;
        case 'phone':
          val = `"+1234567890"`;
          break;
        case 'dropdown':
        case 'multiple_choice':
          val = q.options && q.options.length > 0 ? `"${q.options[0].replace(/"/g, '\\"')}"` : `"Option 1"`;
          break;
        case 'checkboxes':
          val = q.options && q.options.length > 0 ? `["${q.options[0].replace(/"/g, '\\"')}"]` : `["Option 1"]`;
          break;
        case 'date':
          val = `"${new Date().toISOString().split('T')[0]}"`;
          break;
        case 'rating':
        case 'linear_scale':
          val = String(q.max ? Math.ceil(q.max / 2) : 5);
          break;
        case 'yes_no':
          val = "True";
          break;
        default:
          val = `"Sample Answer"`;
      }
      return `        "${q.id}": ${val}  # Field: ${q.label} (${q.type})`;
    }).join(',\n');
  };

  const pythonGetCode = `import requests
import json

# Supabase credentials and API endpoint
URL = "${supabaseUrl}/rest/v1/responses"
HEADERS = {
    "apikey": "${supabaseAnonKey}",
    "Authorization": "Bearer ${supabaseAnonKey}"
}
PARAMS = {
    "form_id": "eq.${formId}",
    "select": "*"
}

print(f"Fetching responses for Form ID: ${formId}...")

try:
    response = requests.get(URL, headers=HEADERS, params=PARAMS)
    response.raise_for_status()
    responses = response.json()
    print(f"\\n[Success] Retrieved {len(responses)} response(s):")
    for idx, r in enumerate(responses, 1):
        print(f"\\nResponse #{idx} (Submitted: {r.get('submitted_at')}):")
        print(json.dumps(r.get('answers'), indent=2))
except requests.exceptions.RequestException as e:
    print("[Error] Failed to fetch responses:", e)
`;

  const pythonPostCode = `import requests
import json

# Supabase credentials and API endpoint
URL = "${supabaseUrl}/rest/v1/responses"
HEADERS = {
    "apikey": "${supabaseAnonKey}",
    "Authorization": "Bearer ${supabaseAnonKey}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# The payload representing a form submission response.
# Each key in "answers" corresponds to a unique question ID.
payload = {
    "form_id": "${formId}",
    "answers": {
${buildPythonAnswersDict()}
    },
    "respondent_email": "tester@example.com"
}

print("Submitting test response...")

try:
    response = requests.post(URL, headers=HEADERS, json=payload)
    response.raise_for_status()
    print("[Success] Response submitted successfully!")
    print("Server Response:")
    print(json.dumps(response.json(), indent=2))
except requests.exceptions.RequestException as e:
    print("[Error] Failed to submit response:", e)
`;

  const handleCopyCode = () => {
    const code = apiModalTab === 'get' ? pythonGetCode : pythonPostCode;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (formId) loadData();
  }, [formId]);

  useEffect(() => {
    if (searchParams.get('apiTest') === 'true') {
      setShowApiModal(true);
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: formData }, { data: responseData }] = await Promise.all([
      formService.getFormById(formId!),
      responseService.getResponses(formId!),
    ]);
    if (formData) setForm(formData);
    if (responseData) setResponses(responseData);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await responseService.deleteResponse(id);
    setResponses(responses.filter(r => r.id !== id));
    setDeleteId(null);
  };



  const filtered = responses.filter(r => {
    if (!search) return true;
    const answersStr = JSON.stringify(r.answers).toLowerCase();
    return answersStr.includes(search.toLowerCase()) ||
      (r.respondent_email || '').toLowerCase().includes(search.toLowerCase());
  });

  const getAnswerDisplay = (q: Question, r: Response): string => {
    const ans = (r.answers as Record<string, unknown>)[q.id];
    if (ans == null) return '—';
    if (Array.isArray(ans)) return ans.join(', ');
    return String(ans);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/forms"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {form?.title || 'Responses'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{responses.length} total responses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(form?.title || 'form', questions, filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => exportExcel(form?.title || 'form', questions, filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => setShowApiModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm"
          >
            <Terminal className="w-4 h-4" />
            Python Test
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search responses..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              view === 'table' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            <Table className="w-4 h-4" /> Table
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              view === 'analytics' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart2 className="w-4 h-4" /> Analytics
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse" />)}
        </div>
      ) : responses.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <BarChart2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 dark:text-white mb-1">No responses yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Share your form to start collecting responses</p>
        </div>
      ) : view === 'table' ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  {form?.collect_email && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>}
                  {questions.slice(0, 4).map(q => (
                    <th key={q.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider max-w-48">
                      {q.label.length > 25 ? q.label.substring(0, 25) + '...' : q.label}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                <AnimatePresence>
                  {filtered.map(r => (
                    <React.Fragment key={r.id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                        onClick={() => setExpandedResponse(expandedResponse === r.id ? null : r.id)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(r.submitted_at), 'MMM d, HH:mm')}
                          </div>
                        </td>
                        {form?.collect_email && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.respondent_email || '—'}</td>
                        )}
                        {questions.slice(0, 4).map(q => (
                          <td key={q.id} className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-48">
                            <span className="truncate block">{getAnswerDisplay(q, r)}</span>
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedResponse === r.id ? 'rotate-180' : ''}`} />
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteId(r.id); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedResponse === r.id && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <td colSpan={questions.slice(0, 4).length + 3} className="px-4 py-4 bg-blue-50/50 dark:bg-blue-900/10">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {questions.map(q => (
                                  <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{q.label}</p>
                                    <p className="text-sm text-gray-900 dark:text-white">{getAnswerDisplay(q, r) || '—'}</p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Analytics View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {questions.map(q => {
            const data = getAnswerAnalytics(q, responses);
            if (!data) return null;
            return (
              <div key={q.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4 text-sm">{q.label}</h3>
                {data.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No responses yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: '12px', color: '#F9FAFB' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm */}
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
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">Delete Response</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                This will permanently delete this response. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all">Cancel</button>
                <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Python API Modal */}
      <AnimatePresence>
        {showApiModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowApiModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xl max-w-3xl w-full flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Python API Request Testing</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Test form data collection and submissions programmatically</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApiModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Prerequisites block */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-xl p-3.5 flex items-start gap-3">
                  <div className="text-blue-500 font-mono text-sm font-bold bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded mt-0.5">Note</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    Make sure you have the <code className="font-mono text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/20 px-1 py-0.5 rounded">requests</code> package installed. You can install it using:<br />
                    <code className="font-mono font-bold text-gray-800 dark:text-gray-200 mt-1 block">pip install requests</code>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-700/50">
                  <button
                    onClick={() => { setApiModalTab('get'); setCopied(false); }}
                    className={`pb-3 text-sm font-semibold transition-all border-b-2 px-4 ${
                      apiModalTab === 'get'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    GET (Fetch Responses)
                  </button>
                  <button
                    onClick={() => { setApiModalTab('post'); setCopied(false); }}
                    className={`pb-3 text-sm font-semibold transition-all border-b-2 px-4 ${
                      apiModalTab === 'post'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    POST (Submit Response)
                  </button>
                </div>

                {/* Code block */}
                <div className="relative bg-gray-950 rounded-xl border border-gray-800 overflow-hidden group">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-850">
                    <span className="text-xs text-gray-400 font-mono">requests_test.py</span>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-all border border-gray-700"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Code
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-gray-200 overflow-x-auto leading-relaxed max-h-[350px]">
                    <code>{apiModalTab === 'get' ? pythonGetCode : pythonPostCode}</code>
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700/50 flex justify-end">
                <button
                  onClick={() => setShowApiModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
