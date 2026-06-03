import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileText, BarChart2, Clock, TrendingUp, Plus, ArrowRight, CheckCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { formService } from '../../services/formService';
import { supabase } from '../../supabase/client';
import type { Form } from '../../supabase/client';
import { format, subDays } from 'date-fns';

interface StatCard {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  change?: string;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [responsesByDay, setResponsesByDay] = useState<{ date: string; count: number }[]>([]);
  const [formResponseCounts, setFormResponseCounts] = useState<{ name: string; responses: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    const { data: formsData } = await formService.getForms(user!.id);
    if (formsData) {
      setForms(formsData);

      // Get response counts for each form
      const counts = await Promise.all(
        formsData.slice(0, 5).map(async form => {
          const { count } = await supabase
            .from('responses')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', form.id);
          return { name: form.title.substring(0, 20) + (form.title.length > 20 ? '...' : ''), responses: count || 0 };
        })
      );
      setFormResponseCounts(counts);

      // Get total responses
      const formIds = formsData.map(f => f.id);
      if (formIds.length > 0) {
        const { count } = await supabase
          .from('responses')
          .select('*', { count: 'exact', head: true })
          .in('form_id', formIds);
        setTotalResponses(count || 0);

        // Get responses by day for last 7 days
        const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
        const dailyCounts = await Promise.all(
          days.map(async day => {
            const start = new Date(day); start.setHours(0, 0, 0, 0);
            const end = new Date(day); end.setHours(23, 59, 59, 999);
            const { count } = await supabase
              .from('responses')
              .select('*', { count: 'exact', head: true })
              .in('form_id', formIds)
              .gte('submitted_at', start.toISOString())
              .lte('submitted_at', end.toISOString());
            return { date: format(day, 'MMM d'), count: count || 0 };
          })
        );
        setResponsesByDay(dailyCounts);
      }
    }
    setLoading(false);
  };

  const stats: StatCard[] = [
    {
      title: 'Total Forms',
      value: forms.length,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      title: 'Published Forms',
      value: forms.filter(f => f.is_published).length,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      title: 'Total Responses',
      value: totalResponses,
      icon: BarChart2,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-900/30',
    },
    {
      title: 'This Week',
      value: responsesByDay.reduce((sum, d) => sum + d.count, 0),
      icon: TrendingUp,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/30',
    },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {greeting}, {profile?.username || 'there'}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening with your forms.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-7 w-12 block" /> : stat.value}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stat.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Response Trend</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={responsesByDay}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ background: '#1F2937', border: 'none', borderRadius: '12px', color: '#F9FAFB' }}
              />
              <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2.5} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm"
        >
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Forms</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">By responses</p>
          </div>
          {formResponseCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={formResponseCounts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#9CA3AF" width={80} />
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: 'none', borderRadius: '12px', color: '#F9FAFB' }}
                />
                <Bar dataKey="responses" fill="#06B6D4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
              No data yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Forms */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Forms</h3>
          <Link
            to="/dashboard/forms"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No forms yet. Create your first form!</p>
            <Link
              to="/dashboard/forms/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Form
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {forms.slice(0, 5).map(form => (
              <div key={form.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: form.theme_color + '20' }}>
                  <FileText className="w-5 h-5" style={{ color: form.theme_color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{form.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {form.questions?.length || 0} questions · {format(new Date(form.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  form.is_published
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {form.is_published ? 'Published' : 'Draft'}
                </span>
                <Link
                  to={`/dashboard/forms/${form.id}`}
                  className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
