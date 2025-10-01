-- Create attendance_activity table
CREATE TABLE IF NOT EXISTS attendance_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('check_in', 'check_out', 'bulk_attendance', 'absentee_marked', 'follow_up')),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_activity_type ON attendance_activity(type);
CREATE INDEX IF NOT EXISTS idx_attendance_activity_service_date ON attendance_activity(service_date);
CREATE INDEX IF NOT EXISTS idx_attendance_activity_service_type ON attendance_activity(service_type);
CREATE INDEX IF NOT EXISTS idx_attendance_activity_member_id ON attendance_activity(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_activity_created_at ON attendance_activity(created_at);

-- Enable RLS
ALTER TABLE attendance_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view attendance activity" ON attendance_activity
  FOR SELECT USING (true);

CREATE POLICY "Users can create attendance activity" ON attendance_activity
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update attendance activity" ON attendance_activity
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete attendance activity" ON attendance_activity
  FOR DELETE USING (true);

