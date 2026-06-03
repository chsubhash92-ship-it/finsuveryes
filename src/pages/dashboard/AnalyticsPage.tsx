import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, FileText, Users } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { formService } from '../../services/formService';
import { supabase } from '../../supabase/client';
import { subDays, format } from 'date-fns';
import type { Form } from '../../supabase/client';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [responsesByDay, setResponsesByDay] = useState<{ date: string; responses: number }[]>([]);
  const [formDistribution, setFormDistribution] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: formsData } = await formService.getForms(user!.id);
    if (formsData) {
      setForms(formsData);
      const formIds = formsData.map(f => f.id);
      if (formIds.length === 0) { setLoading(false); return; }

      // Responses by day (30 days)
      const days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));
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
          return { date: format(day, 'MMM d'), responses: count || 0 };
        })
      );
      setResponsesByDay(dailyCounts);

      // Form distribution
      const dist = await Promise.all(
        formsData.slice(0, 6).map(async form => {
          const { count } = await supabase
            .from('responses')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', form.id);
          return { name: form.title.substring(0, 20), value: count || 0 };
        })
      );
      setFormDistribution(dist.filter(d => d.value > 0));
    }
    setLoading(false);
  };

  const totalResponses = responsesByDay.reduce((s, d) => s + d.responses, 0);
  const avgPerForm = forms.length > 0 ? Math.round(totalResponses / forms.length) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Response insights for the last 30 days</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Forms', value: forms.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Published', value: forms.filter(f => f.is_published).length, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Responses (30d)', value: totalResponses, icon: BarChart2, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
          { label: 'Avg / Form', value: avgPerForm, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm"
          >
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Area Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm mb-6"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Response Activity</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Last 30 days</p>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={responsesByDay}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" interval={4} />
              <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: '12px', color: '#F9FAFB' }} />
              <Area type="monotone" dataKey="responses" stroke="#3B82F6" strokeWidth={2.5} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Pie Chart */}
      {formDistribution.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Responses by Form</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Distribution across your forms</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={formDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {formDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: '12px', color: '#F9FAFB' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
