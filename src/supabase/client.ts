import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string;
          email?: string;
          created_at?: string;
        };
        Update: {
          username?: string;
          email?: string;
        };
      };
      forms: {
        Row: {
          id: string;
          title: string;
          description: string;
          slug: string;
          questions: Question[];
          created_by: string;
          is_published: boolean;
          collect_email: boolean;
          submission_limit: number | null;
          theme_color: string;
          created_at: string;
          updated_at: string;
        };
      };
      responses: {
        Row: {
          id: string;
          form_id: string;
          answers: Record<string, unknown>;
          respondent_email: string | null;
          ip_address: string | null;
          device_info: string | null;
          submitted_at: string;
        };
      };
    };
  };
};

export type Question = {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  description?: string;
};

export type QuestionType =
  | 'short_text'
  | 'paragraph'
  | 'email'
  | 'number'
  | 'phone'
  | 'dropdown'
  | 'multiple_choice'
  | 'checkboxes'
  | 'date'
  | 'file_upload'
  | 'rating'
  | 'linear_scale'
  | 'yes_no'
  | 'section_divider';

export type Form = Database['public']['Tables']['forms']['Row'];
export type Response = Database['public']['Tables']['responses']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
