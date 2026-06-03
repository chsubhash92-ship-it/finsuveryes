import React from 'react';
import type { Question, QuestionType } from '../../supabase/client';
import {
  Type, AlignLeft, Mail, Hash, Phone, ChevronDown, Circle,
  CheckSquare, Calendar, Upload, Star, BarChart2, ToggleLeft,
  Minus, GripVertical, Trash2, Copy, ChevronUp, AlertCircle, Plus, X
} from 'lucide-react';
import { motion } from 'framer-motion';

export const FIELD_TYPES: { type: QuestionType; label: string; icon: React.ElementType; group: string }[] = [
  { type: 'short_text', label: 'Short Text', icon: Type, group: 'Basic' },
  { type: 'paragraph', label: 'Paragraph', icon: AlignLeft, group: 'Basic' },
  { type: 'email', label: 'Email', icon: Mail, group: 'Basic' },
  { type: 'number', label: 'Number', icon: Hash, group: 'Basic' },
  { type: 'phone', label: 'Phone', icon: Phone, group: 'Basic' },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, group: 'Choice' },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: Circle, group: 'Choice' },
  { type: 'checkboxes', label: 'Checkboxes', icon: CheckSquare, group: 'Choice' },
  { type: 'yes_no', label: 'Yes / No', icon: ToggleLeft, group: 'Choice' },
  { type: 'date', label: 'Date', icon: Calendar, group: 'Advanced' },
  { type: 'file_upload', label: 'File Upload', icon: Upload, group: 'Advanced' },
  { type: 'rating', label: 'Rating', icon: Star, group: 'Advanced' },
  { type: 'linear_scale', label: 'Linear Scale', icon: BarChart2, group: 'Advanced' },
  { type: 'section_divider', label: 'Section Divider', icon: Minus, group: 'Layout' },
];

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  dragHandleProps?: Record<string, unknown>;
  onUpdate: (q: Question) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function QuestionCard({
  question, index, total, dragHandleProps,
  onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown
}: QuestionCardProps) {
  const typeInfo = FIELD_TYPES.find(t => t.type === question.type);

  const updateOption = (i: number, value: string) => {
    const options = [...(question.options || [])];
    options[i] = value;
    onUpdate({ ...question, options });
  };

  const addOption = () => onUpdate({ ...question, options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] });
  const removeOption = (i: number) => onUpdate({ ...question, options: (question.options || []).filter((_, idx) => idx !== i) });

  const hasOptions = ['dropdown', 'multiple_choice', 'checkboxes'].includes(question.type);
  const isDivider = question.type === 'section_divider';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm group hover:border-blue-200 dark:hover:border-blue-700 transition-all"
    >
      {isDivider ? (
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 touch-none">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={question.label}
                onChange={e => onUpdate({ ...question, label: e.target.value })}
                placeholder="Section title..."
                className="w-full text-sm font-semibold text-gray-700 dark:text-gray-300 bg-transparent border-0 outline-none placeholder-gray-300 dark:placeholder-gray-600"
              />
              <div className="h-px bg-gray-200 dark:bg-gray-600 mt-2" />
              <input
                type="text"
                value={question.description || ''}
                onChange={e => onUpdate({ ...question, description: e.target.value })}
                placeholder="Section description (optional)..."
                className="w-full mt-2 text-xs text-gray-500 dark:text-gray-400 bg-transparent border-0 outline-none placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 mt-1 touch-none flex-shrink-0">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">Q{index + 1}</span>
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {typeInfo && <typeInfo.icon className="w-3 h-3" />}
                  {typeInfo?.label}
                </span>
                {question.required && (
                  <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Required
                  </span>
                )}
              </div>
              <input
                type="text"
                value={question.label}
                onChange={e => onUpdate({ ...question, label: e.target.value })}
                placeholder="Question text..."
                className="w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-0 outline-none placeholder-gray-300 dark:placeholder-gray-600"
              />
              <input
                type="text"
                value={question.description || ''}
                onChange={e => onUpdate({ ...question, description: e.target.value })}
                placeholder="Helper text (optional)..."
                className="w-full mt-1 text-xs text-gray-500 dark:text-gray-400 bg-transparent border-0 outline-none placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>
          </div>

          {/* Placeholder for simple fields */}
          {['short_text', 'paragraph', 'email', 'number', 'phone'].includes(question.type) && (
            <input
              type="text"
              value={question.placeholder || ''}
              onChange={e => onUpdate({ ...question, placeholder: e.target.value })}
              placeholder="Placeholder text (optional)..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 outline-none focus:border-blue-300 dark:focus:border-blue-600 transition-colors"
            />
          )}

          {/* Options for choice fields */}
          {hasOptions && (
            <div className="space-y-2">
              {(question.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-500 flex-shrink-0" />
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button onClick={() => removeOption(i)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addOption}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add option
              </button>
            </div>
          )}

          {/* Rating preview */}
          {question.type === 'rating' && (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-8 h-8 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center text-sm text-gray-400">{i}</div>
              ))}
            </div>
          )}

          {/* Linear scale config */}
          {question.type === 'linear_scale' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Min:</span>
                <input
                  type="number"
                  value={question.min ?? 1}
                  onChange={e => onUpdate({ ...question, min: Number(e.target.value) })}
                  className="w-16 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Max:</span>
                <input
                  type="number"
                  value={question.max ?? 10}
                  onChange={e => onUpdate({ ...question, max: Number(e.target.value) })}
                  className="w-16 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Yes/No preview */}
          {question.type === 'yes_no' && (
            <div className="flex gap-3">
              <div className="px-6 py-2 border-2 border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 rounded-xl text-sm font-medium">Yes</div>
              <div className="px-6 py-2 border-2 border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 rounded-xl text-sm font-medium">No</div>
            </div>
          )}

          {/* Date preview */}
          {question.type === 'date' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-200 dark:border-gray-600 rounded-xl">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Date picker</span>
            </div>
          )}

          {/* File upload preview */}
          {question.type === 'file_upload' && (
            <div className="px-4 py-6 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl text-center">
              <Upload className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
              <span className="text-xs text-gray-400">File upload area</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <div
                onClick={() => onUpdate({ ...question, required: !question.required })}
                className={`w-9 h-5 rounded-full transition-all cursor-pointer ${
                  question.required ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                } relative`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${
                  question.required ? 'left-4.5 translate-x-0.5' : 'left-0.5'
                }`} />
              </div>
              Required
            </label>
            <div className="flex items-center gap-1">
              <button onClick={onMoveUp} disabled={index === 0} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button onClick={onMoveDown} disabled={index === total - 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                <ChevronUp className="w-4 h-4 rotate-180" />
              </button>
              <button onClick={onDuplicate} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
