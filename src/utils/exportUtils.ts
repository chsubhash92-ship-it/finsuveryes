import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Question, Response } from '../supabase/client';

function buildRows(questions: Question[], responses: Response[]) {
  return responses.map(r => {
    const row: Record<string, unknown> = {
      'Submission Date': new Date(r.submitted_at).toLocaleString(),
      'Respondent Email': r.respondent_email || '',
    };
    questions.forEach(q => {
      if (q.type === 'section_divider') return;
      const answer = (r.answers as Record<string, unknown>)[q.id];
      row[q.label] = Array.isArray(answer) ? answer.join(', ') : (answer ?? '');
    });
    return row;
  });
}

export function exportCSV(formTitle: string, questions: Question[], responses: Response[]) {
  const rows = buildRows(questions, responses);
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${formTitle.replace(/\s+/g, '_')}_responses.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportExcel(formTitle: string, questions: Question[], responses: Response[]) {
  const rows = buildRows(questions, responses);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Responses');
  XLSX.writeFile(wb, `${formTitle.replace(/\s+/g, '_')}_responses.xlsx`);
}
