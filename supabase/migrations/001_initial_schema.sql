-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'pastor', 'elder', 'finance_officer', 'member', 'visitor');
CREATE TYPE member_status AS ENUM ('active', 'visitor', 'transferred', 'inactive');
CREATE TYPE attendance_method AS ENUM ('qr', 'kiosk', 'admin', 'pin', 'mobile');
CREATE TYPE service_type AS ENUM ('sunday_service', 'midweek_service', 'prayer_meeting', 'youth_service', 'children_service', 'special_event');

-- Core app_users table (mirror of auth.users with roles and profile metadata)
CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid UUID UNIQUE, -- link to supabase.auth.users if used
  membership_id TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  profile_completion NUMERIC DEFAULT 0 CHECK (profile_completion >= 0 AND profile_completion <= 100),
  join_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_phone CHECK (phone ~ '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_join_year CHECK (join_year >= 1950 AND join_year <= EXTRACT(YEAR FROM CURRENT_DATE))
);

-- Members table (extended profile - one-to-one with app_users)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE UNIQUE,
  dob DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  emergency_contacts JSONB DEFAULT '[]'::jsonb, -- array of {name, relation, phone}
  profile_photo TEXT,
  documents JSONB DEFAULT '[]'::jsonb, -- array of document objects
  status member_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_dob CHECK (dob IS NULL OR dob <= CURRENT_DATE),
  CONSTRAINT valid_emergency_contacts CHECK (jsonb_typeof(emergency_contacts) = 'array'),
  CONSTRAINT valid_documents CHECK (jsonb_typeof(documents) = 'array')
);

-- Dependants table
CREATE TABLE dependants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT CHECK (relationship IN ('child', 'spouse', 'sibling', 'parent', 'guardian', 'other')),
  dob DATE,
  membership_id TEXT, -- optional for children when created
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_dependant_dob CHECK (dob IS NULL OR dob <= CURRENT_DATE)
);

-- Attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  dependant_id UUID REFERENCES dependants(id),
  service_date DATE NOT NULL,
  service_type service_type,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  method attendance_method DEFAULT 'qr',
  metadata JSONB DEFAULT '{}'::jsonb,
  client_uuid UUID, -- for offline sync idempotency
  created_by UUID REFERENCES app_users(id), -- which user (admin) created it if any
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT attendance_member_or_dependant CHECK (
    (member_id IS NOT NULL AND dependant_id IS NULL) OR 
    (member_id IS NULL AND dependant_id IS NOT NULL)
  ),
  CONSTRAINT valid_service_date CHECK (service_date <= CURRENT_DATE + INTERVAL '1 day')
);

-- Donations table
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  donation_type TEXT NOT NULL, -- tithe, offering, special, building_fund, etc.
  description TEXT,
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT, -- cash, mobile_money, bank_transfer, cheque
  reference_number TEXT,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_donation_date CHECK (donation_date <= CURRENT_DATE)
);

-- Pledges table
CREATE TABLE pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  pledge_type TEXT NOT NULL,
  description TEXT,
  pledge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'partial', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_pledge_dates CHECK (due_date IS NULL OR due_date >= pledge_date)
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL, -- utilities, maintenance, supplies, outreach, etc.
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  approved_by UUID REFERENCES app_users(id),
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_expense_date CHECK (expense_date <= CURRENT_DATE)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES app_users(id),
  recipient_id UUID REFERENCES app_users(id),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'announcement', 'prayer_request', 'urgent')),
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_sender CHECK (sender_id IS NOT NULL),
  CONSTRAINT valid_recipient CHECK (recipient_id IS NOT NULL)
);

-- Prayer requests table
CREATE TABLE prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- health, family, financial, spiritual, etc.
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'answered', 'closed')),
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Equipment table
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- audio, video, furniture, etc.
  serial_number TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  current_condition TEXT CHECK (current_condition IN ('excellent', 'good', 'fair', 'poor', 'broken')),
  assigned_to UUID REFERENCES app_users(id),
  location TEXT,
  maintenance_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Heartbeat table (for keeping Supabase awake)
CREATE TABLE heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  status TEXT DEFAULT 'healthy',
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- QR tokens table (for secure QR code generation)
CREATE TABLE qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Offline sync queue table
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid UUID NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT max_retries CHECK (retry_count <= 5)
);

-- Create indexes for performance
CREATE INDEX idx_app_users_auth_uid ON app_users(auth_uid);
CREATE INDEX idx_app_users_membership_id ON app_users(membership_id);
CREATE INDEX idx_app_users_phone ON app_users(phone);
CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_app_users_join_year ON app_users(join_year);

CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_members_status ON members(status);

CREATE INDEX idx_dependants_member_id ON dependants(member_id);

CREATE INDEX idx_attendance_member_id ON attendance(member_id);
CREATE INDEX idx_attendance_dependant_id ON attendance(dependant_id);
CREATE INDEX idx_attendance_service_date ON attendance(service_date);
CREATE INDEX idx_attendance_service_type ON attendance(service_type);
CREATE INDEX idx_attendance_client_uuid ON attendance(client_uuid);

CREATE INDEX idx_donations_member_id ON donations(member_id);
CREATE INDEX idx_donations_donation_date ON donations(donation_date);
CREATE INDEX idx_donations_type ON donations(donation_type);

CREATE INDEX idx_pledges_member_id ON pledges(member_id);
CREATE INDEX idx_pledges_status ON pledges(status);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);

CREATE INDEX idx_prayer_requests_member_id ON prayer_requests(member_id);
CREATE INDEX idx_prayer_requests_status ON prayer_requests(status);

CREATE INDEX idx_equipment_assigned_to ON equipment(assigned_to);
CREATE INDEX idx_equipment_category ON equipment(category);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_heartbeat_service_name ON heartbeat(service_name);
CREATE INDEX idx_heartbeat_last_ping ON heartbeat(last_ping);

CREATE INDEX idx_qr_tokens_member_id ON qr_tokens(member_id);
CREATE INDEX idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX idx_qr_tokens_expires_at ON qr_tokens(expires_at);

CREATE INDEX idx_sync_queue_client_uuid ON sync_queue(client_uuid);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_created_at ON sync_queue(created_at);

-- Add search vectors for full-text search
ALTER TABLE app_users ADD COLUMN search_vector tsvector;
ALTER TABLE members ADD COLUMN search_vector tsvector;

-- Create trigram indexes for fuzzy search
CREATE INDEX idx_app_users_full_name_trgm ON app_users USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_members_address_trgm ON members USING gin(address gin_trgm_ops);

-- Create tsvector indexes
CREATE INDEX idx_app_users_search_vector ON app_users USING gin(search_vector);
CREATE INDEX idx_members_search_vector ON members USING gin(search_vector);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prayer_requests_updated_at BEFORE UPDATE ON prayer_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create search vector update function
CREATE OR REPLACE FUNCTION update_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
    -- Update app_users search vector
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.membership_id, '')), 'A');
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create search vector update function for members
CREATE OR REPLACE FUNCTION update_members_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
    -- Update members search vector
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.address, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'B');
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply search vector triggers
CREATE TRIGGER update_app_users_search_vector BEFORE INSERT OR UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION update_search_vectors();
CREATE TRIGGER update_members_search_vector BEFORE INSERT OR UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_members_search_vectors();

-- Create membership ID generation function
CREATE OR REPLACE FUNCTION generate_membership_id(p_phone TEXT, p_join_year INT)
RETURNS TEXT AS $$
DECLARE
    digits TEXT;
    counter INT := 0;
    new_id TEXT;
BEGIN
    -- Generate base digits from phone or random
    IF p_phone IS NULL OR length(p_phone) < 4 THEN
        digits := lpad((floor(random() * 10000))::text, 4, '0');
    ELSE
        digits := right(regexp_replace(p_phone, '\D','','g'), 4);
    END IF;
    
    new_id := 'EA-' || digits || p_join_year::text;
    
    -- Ensure uniqueness by adding counter if needed
    WHILE EXISTS (SELECT 1 FROM app_users WHERE membership_id = new_id) LOOP
        counter := counter + 1;
        new_id := 'EA-' || digits || p_join_year::text || '-' || counter::text;
    END LOOP;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create profile completion calculation function
CREATE OR REPLACE FUNCTION calculate_profile_completion(user_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    completion_score NUMERIC := 0;
    user_record RECORD;
    member_record RECORD;
BEGIN
    -- Get user and member records
    SELECT * INTO user_record FROM app_users WHERE id = user_uuid;
    SELECT * INTO member_record FROM members WHERE user_id = user_uuid;
    
    -- Contact info (25 points)
    IF user_record.phone IS NOT NULL AND user_record.phone != '' THEN
        completion_score := completion_score + 15;
    END IF;
    IF user_record.email IS NOT NULL AND user_record.email != '' THEN
        completion_score := completion_score + 10;
    END IF;
    
    -- Profile photo (15 points)
    IF member_record.profile_photo IS NOT NULL AND member_record.profile_photo != '' THEN
        completion_score := completion_score + 15;
    END IF;
    
    -- Emergency contacts (15 points)
    IF member_record.emergency_contacts IS NOT NULL AND jsonb_array_length(member_record.emergency_contacts) > 0 THEN
        completion_score := completion_score + 15;
    END IF;
    
    -- Documents (20 points)
    IF member_record.documents IS NOT NULL AND jsonb_array_length(member_record.documents) > 0 THEN
        completion_score := completion_score + 20;
    END IF;
    
    -- Basic profile info (25 points)
    IF member_record.dob IS NOT NULL THEN
        completion_score := completion_score + 10;
    END IF;
    IF member_record.gender IS NOT NULL THEN
        completion_score := completion_score + 5;
    END IF;
    IF member_record.address IS NOT NULL AND member_record.address != '' THEN
        completion_score := completion_score + 10;
    END IF;
    
    RETURN LEAST(completion_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Create audit log function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_record JSONB;
    new_record JSONB;
BEGIN
    -- Convert OLD and NEW to JSONB
    IF TG_OP = 'DELETE' THEN
        old_record := to_jsonb(OLD);
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
        VALUES (
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            TG_OP,
            TG_TABLE_NAME,
            OLD.id,
            old_record
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        old_record := to_jsonb(OLD);
        new_record := to_jsonb(NEW);
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            old_record,
            new_record
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        new_record := to_jsonb(NEW);
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            new_record
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create role change protection function
CREATE OR REPLACE FUNCTION prevent_unauthorized_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow role changes if the current user is an admin
    -- or if the role hasn't changed
    IF OLD.role != NEW.role THEN
        -- Check if current user is admin
        IF NOT EXISTS (
            SELECT 1 FROM app_users au 
            WHERE au.auth_uid = auth.uid() 
            AND au.role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Only administrators can change user roles';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_app_users AFTER INSERT OR UPDATE OR DELETE ON app_users FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_members AFTER INSERT OR UPDATE OR DELETE ON members FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_attendance AFTER INSERT OR UPDATE OR DELETE ON attendance FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_donations AFTER INSERT OR UPDATE OR DELETE ON donations FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_pledges AFTER INSERT OR UPDATE OR DELETE ON pledges FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON expenses FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Apply role change protection trigger
CREATE TRIGGER prevent_role_changes BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION prevent_unauthorized_role_changes();
