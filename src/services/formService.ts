import { supabase } from '../supabase/client';
import type { Form, Question } from '../supabase/client';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    + '-' + Math.random().toString(36).substring(2, 7);
}

export const formService = {
  async getForms(userId: string) {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getFormById(id: string) {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data, error };
  },

  async getFormBySlug(slug: string) {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    return { data, error };
  },

  async createForm(userId: string, title: string = 'Untitled Form') {
    const slug = generateSlug(title);
    const { data, error } = await supabase
      .from('forms')
      .insert({
        title,
        slug,
        created_by: userId,
        questions: [],
        is_published: false,
      })
      .select()
      .single();
    return { data, error };
  },

  async updateForm(id: string, updates: Partial<Omit<Form, 'id' | 'created_by' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('forms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteForm(id: string) {
    const { error } = await supabase.from('forms').delete().eq('id', id);
    return { error };
  },

  async duplicateForm(form: Form, userId: string) {
    const slug = generateSlug(form.title + ' copy');
    const { data, error } = await supabase
      .from('forms')
      .insert({
        title: form.title + ' (Copy)',
        description: form.description,
        slug,
        questions: form.questions,
        created_by: userId,
        is_published: false,
        collect_email: form.collect_email,
        theme_color: form.theme_color,
      })
      .select()
      .single();
    return { data, error };
  },

  async saveQuestions(formId: string, questions: Question[]) {
    const { data, error } = await supabase
      .from('forms')
      .update({ questions })
      .eq('id', formId)
      .select()
      .single();
    return { data, error };
  },
};
