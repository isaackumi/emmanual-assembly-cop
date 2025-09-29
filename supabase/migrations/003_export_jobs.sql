-- Export jobs table for scheduled exports
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('attendance', 'members', 'donations', 'pledges')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_by UUID REFERENCES app_users(id),
  file_url TEXT,
  file_name TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for export jobs
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_type ON export_jobs(type);
CREATE INDEX idx_export_jobs_requested_by ON export_jobs(requested_by);
CREATE INDEX idx_export_jobs_created_at ON export_jobs(created_at);

-- RLS policies for export jobs
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can view all export jobs
CREATE POLICY export_jobs_select_admin ON export_jobs FOR SELECT
USING (user_has_role('admin'));

-- Finance officers can view financial export jobs
CREATE POLICY export_jobs_select_finance ON export_jobs FOR SELECT
USING (
  user_has_role('finance_officer') 
  AND type IN ('donations', 'pledges')
);

-- Users can view their own export jobs
CREATE POLICY export_jobs_select_self ON export_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.id = export_jobs.requested_by 
    AND au.auth_uid = auth.uid()
  )
);

-- Admins can insert export jobs
CREATE POLICY export_jobs_insert_admin ON export_jobs FOR INSERT
WITH CHECK (user_has_role('admin'));

-- Finance officers can insert financial export jobs
CREATE POLICY export_jobs_insert_finance ON export_jobs FOR INSERT
WITH CHECK (
  user_has_role('finance_officer') 
  AND type IN ('donations', 'pledges')
);

-- Service role can manage export jobs (for scheduled functions)
CREATE POLICY export_jobs_service_role ON export_jobs FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create storage bucket for exports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exports', 'exports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for exports bucket
CREATE POLICY "Export files are publicly readable" ON storage.objects
FOR SELECT USING (bucket_id = 'exports');

CREATE POLICY "Service role can upload export files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'exports' AND 
  auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "Service role can update export files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'exports' AND 
  auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "Service role can delete export files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'exports' AND 
  auth.jwt() ->> 'role' = 'service_role'
);
