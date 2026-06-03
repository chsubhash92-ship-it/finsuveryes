import { supabase } from '../supabase/client';

export const responseService = {
  async getResponses(formId: string) {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false });
    return { data, error };
  },

  async submitResponse(
    formId: string,
    answers: Record<string, unknown>,
    respondentEmail?: string
  ) {
    const { data, error } = await supabase
      .from('responses')
      .insert({
        form_id: formId,
        answers,
        respondent_email: respondentEmail || null,
        device_info: navigator.userAgent,
      })
      .select()
      .single();
    return { data, error };
  },

  async deleteResponse(id: string) {
    const { error } = await supabase.from('responses').delete().eq('id', id);
    return { error };
  },

  async getResponseCount(formId: string) {
    const { count, error } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId);
    return { count, error };
  },

  async getAllResponsesForUser(userId: string) {
    const { data, error } = await supabase
      .from('responses')
      .select('*, forms!inner(created_by, title)')
      .eq('forms.created_by', userId)
      .order('submitted_at', { ascending: false })
      .limit(10);
    return { data, error };
  },
};
