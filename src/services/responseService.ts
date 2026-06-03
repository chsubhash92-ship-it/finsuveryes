import { supabase } from '../supabase/client';
import type { Response } from '../supabase/client';

export const responseService = {
  async getResponses(formId: string) {
    let allData: Response[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false })
        .range(from, from + limit - 1);

      if (error) {
        return { data: null, error };
      }

      if (data) {
        allData = [...allData, ...(data as Response[])];
        if (data.length < limit) {
          hasMore = false;
        } else {
          from += limit;
        }
      } else {
        hasMore = false;
      }
    }

    return { data: allData, error: null };
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
