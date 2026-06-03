/*
  # Forms Builder Schema

  ## Summary
  Creates the complete database schema for the Forms Builder application.

  ## New Tables

  ### profiles
  - Extends auth.users with display name and metadata
  - id (uuid, FK to auth.users)
  - username (text)
  - email (text)
  - created_at (timestamptz)

  ### forms
  - Stores form definitions with questions array as JSONB
  - id (uuid, PK)
  - title (text)
  - description (text)
  - slug (text, unique) - used for public URLs like /form/my-slug
  - questions (jsonb[]) - array of question objects
  - created_by (uuid, FK to auth.users)
  - is_published (boolean)
  - collect_email (boolean)
  - submission_limit (integer, nullable)
  - theme_color (text)
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ### responses
  - Stores form submissions from public users
  - id (uuid, PK)
  - form_id (uuid, FK to forms)
  - answers (jsonb) - key/value pairs of question_id -> answer
  - submitted_at (timestamptz)
  - respondent_email (text, nullable)
  - ip_address (text, nullable)
  - device_info (text, nullable)

  ## Security
  - RLS enabled on all tables
  - profiles: users can read/update their own profile
  - forms: owners can CRUD their own forms; published forms are publicly readable
  - responses: form owners can read responses to their forms; anyone can insert responses to published forms
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Forms table
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Form',
  description text DEFAULT '',
  slug text UNIQUE NOT NULL,
  questions jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_published boolean DEFAULT false,
  collect_email boolean DEFAULT false,
  submission_limit integer DEFAULT NULL,
  theme_color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Form owners can view own forms"
  ON forms FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Published forms are publicly readable"
  ON forms FOR SELECT
  TO anon
  USING (is_published = true);

CREATE POLICY "Form owners can insert forms"
  ON forms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Form owners can update own forms"
  ON forms FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Form owners can delete own forms"
  ON forms FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  answers jsonb DEFAULT '{}'::jsonb,
  respondent_email text DEFAULT NULL,
  ip_address text DEFAULT NULL,
  device_info text DEFAULT NULL,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Form owners can view responses"
  ON responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = responses.form_id
      AND forms.created_by = auth.uid()
    )
  );

CREATE POLICY "Anyone can submit responses to published forms"
  ON responses FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = responses.form_id
      AND forms.is_published = true
    )
  );

CREATE POLICY "Authenticated users can submit responses to published forms"
  ON responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = responses.form_id
      AND forms.is_published = true
    )
  );

CREATE POLICY "Form owners can delete responses"
  ON responses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = responses.form_id
      AND forms.created_by = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);
CREATE INDEX IF NOT EXISTS idx_forms_published ON forms(is_published);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_submitted_at ON responses(submitted_at);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
