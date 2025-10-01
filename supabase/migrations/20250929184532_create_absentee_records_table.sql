-- Create absentee_records table
CREATE TABLE IF NOT EXISTS absentee_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  reason TEXT,
  follow_up_required BOOLEAN DEFAULT true,
  follow_up_completed BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_absentee_records_member_id ON absentee_records(member_id);
CREATE INDEX IF NOT EXISTS idx_absentee_records_service_date ON absentee_records(service_date);
CREATE INDEX IF NOT EXISTS idx_absentee_records_service_type ON absentee_records(service_type);
CREATE INDEX IF NOT EXISTS idx_absentee_records_follow_up_required ON absentee_records(follow_up_required);

-- Create unique constraint to prevent duplicate absentee records for same member, service date and type
CREATE UNIQUE INDEX IF NOT EXISTS idx_absentee_records_unique_member_service 
ON absentee_records(member_id, service_date, service_type);

-- Enable RLS
ALTER TABLE absentee_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view absentee records" ON absentee_records
  FOR SELECT USING (true);

CREATE POLICY "Users can create absentee records" ON absentee_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update absentee records" ON absentee_records
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete absentee records" ON absentee_records
  FOR DELETE USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_absentee_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_absentee_records_updated_at
  BEFORE UPDATE ON absentee_records
  FOR EACH ROW
  EXECUTE FUNCTION update_absentee_records_updated_at();

