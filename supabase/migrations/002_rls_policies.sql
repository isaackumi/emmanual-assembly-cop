-- Enable Row Level Security on all tables
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependants ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT au.role INTO user_role
    FROM app_users au
    WHERE au.auth_uid = auth.uid();
    
    RETURN COALESCE(user_role, 'visitor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT au.id INTO user_id
    FROM app_users au
    WHERE au.auth_uid = auth.uid();
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_users au
        WHERE au.auth_uid = auth.uid() 
        AND au.role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has any of the roles
CREATE OR REPLACE FUNCTION user_has_any_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_users au
        WHERE au.auth_uid = auth.uid() 
        AND au.role = ANY(required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- APP_USERS POLICIES
-- ================================

-- Admins can view all users
CREATE POLICY app_users_select_admin ON app_users FOR SELECT
USING (user_has_role('admin'));

-- Users can view their own profile
CREATE POLICY app_users_select_self ON app_users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = app_users.id 
        AND au.auth_uid = auth.uid()
    )
);

-- Pastors and elders can view member profiles
CREATE POLICY app_users_select_leadership ON app_users FOR SELECT
USING (
    user_has_any_role(ARRAY['pastor', 'elder']) 
    AND app_users.role IN ('member', 'visitor')
);

-- Admins can insert users
CREATE POLICY app_users_insert_admin ON app_users FOR INSERT
WITH CHECK (user_has_role('admin'));

-- Users can update their own profile (limited fields)
CREATE POLICY app_users_update_self ON app_users FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = app_users.id 
        AND au.auth_uid = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = app_users.id 
        AND au.auth_uid = auth.uid()
    )
    -- Users can update their own profile but role changes are handled by triggers
);

-- Admins can update any user
CREATE POLICY app_users_update_admin ON app_users FOR UPDATE
USING (user_has_role('admin'))
WITH CHECK (user_has_role('admin'));

-- Only admins can delete users
CREATE POLICY app_users_delete_admin ON app_users FOR DELETE
USING (user_has_role('admin'));

-- ================================
-- MEMBERS POLICIES
-- ================================

-- Admins can view all members
CREATE POLICY members_select_admin ON members FOR SELECT
USING (user_has_role('admin'));

-- Users can view their own member profile
CREATE POLICY members_select_self ON members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = members.user_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can view member profiles
CREATE POLICY members_select_leadership ON members FOR SELECT
USING (
    user_has_any_role(ARRAY['pastor', 'elder']) 
    AND EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = members.user_id 
        AND au.role IN ('member', 'visitor')
    )
);

-- Admins and leadership can insert members
CREATE POLICY members_insert_leadership ON members FOR INSERT
WITH CHECK (
    user_has_any_role(ARRAY['admin', 'pastor', 'elder'])
);

-- Users can update their own member profile
CREATE POLICY members_update_self ON members FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = members.user_id 
        AND au.auth_uid = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = members.user_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Admins and leadership can update any member
CREATE POLICY members_update_leadership ON members FOR UPDATE
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder']))
WITH CHECK (user_has_any_role(ARRAY['admin', 'pastor', 'elder']));

-- Only admins can delete members
CREATE POLICY members_delete_admin ON members FOR DELETE
USING (user_has_role('admin'));

-- ================================
-- DEPENDANTS POLICIES
-- ================================

-- Admins can view all dependants
CREATE POLICY dependants_select_admin ON dependants FOR SELECT
USING (user_has_role('admin'));

-- Users can view their own dependants
CREATE POLICY dependants_select_self ON dependants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = dependants.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can view dependants of members
CREATE POLICY dependants_select_leadership ON dependants FOR SELECT
USING (
    user_has_any_role(ARRAY['pastor', 'elder'])
    AND EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = dependants.member_id 
        AND au.role IN ('member', 'visitor')
    )
);

-- Users can insert their own dependants
CREATE POLICY dependants_insert_self ON dependants FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = dependants.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can insert dependants for members
CREATE POLICY dependants_insert_leadership ON dependants FOR INSERT
WITH CHECK (
    user_has_any_role(ARRAY['admin', 'pastor', 'elder'])
);

-- Users can update their own dependants
CREATE POLICY dependants_update_self ON dependants FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = dependants.member_id 
        AND au.auth_uid = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = dependants.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can update any dependants
CREATE POLICY dependants_update_leadership ON dependants FOR UPDATE
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder']))
WITH CHECK (user_has_any_role(ARRAY['admin', 'pastor', 'elder']));

-- Users can delete their own dependants
CREATE POLICY dependants_delete_self ON dependants FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = dependants.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can delete any dependants
CREATE POLICY dependants_delete_leadership ON dependants FOR DELETE
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder']));

-- ================================
-- ATTENDANCE POLICIES
-- ================================

-- Admins can view all attendance
CREATE POLICY attendance_select_admin ON attendance FOR SELECT
USING (user_has_role('admin'));

-- Users can view their own attendance
CREATE POLICY attendance_select_self ON attendance FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = attendance.member_id 
        AND au.auth_uid = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM dependants d
        JOIN members m ON m.id = d.member_id
        JOIN app_users au ON au.id = m.user_id
        WHERE d.id = attendance.dependant_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can view attendance for members
CREATE POLICY attendance_select_leadership ON attendance FOR SELECT
USING (
    user_has_any_role(ARRAY['pastor', 'elder'])
    AND (
        EXISTS (
            SELECT 1 FROM members m
            JOIN app_users au ON au.id = m.user_id
            WHERE m.id = attendance.member_id 
            AND au.role IN ('member', 'visitor')
        )
        OR EXISTS (
            SELECT 1 FROM dependants d
            JOIN members m ON m.id = d.member_id
            JOIN app_users au ON au.id = m.user_id
            WHERE d.id = attendance.dependant_id 
            AND au.role IN ('member', 'visitor')
        )
    )
);

-- Users can insert their own attendance
CREATE POLICY attendance_insert_self ON attendance FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = attendance.member_id 
        AND au.auth_uid = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM dependants d
        JOIN members m ON m.id = d.member_id
        JOIN app_users au ON au.id = m.user_id
        WHERE d.id = attendance.dependant_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can insert attendance for anyone
CREATE POLICY attendance_insert_leadership ON attendance FOR INSERT
WITH CHECK (
    user_has_any_role(ARRAY['admin', 'pastor', 'elder'])
);

-- Service role can insert attendance (for kiosk mode and offline sync)
CREATE POLICY attendance_insert_service_role ON attendance FOR INSERT
WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
);

-- Only admins can update attendance
CREATE POLICY attendance_update_admin ON attendance FOR UPDATE
USING (user_has_role('admin'))
WITH CHECK (user_has_role('admin'));

-- Only admins can delete attendance
CREATE POLICY attendance_delete_admin ON attendance FOR DELETE
USING (user_has_role('admin'));

-- ================================
-- DONATIONS POLICIES
-- ================================

-- Admins and finance officers can view all donations
CREATE POLICY donations_select_admin ON donations FOR SELECT
USING (user_has_any_role(ARRAY['admin', 'finance_officer']));

-- Users can view their own donations
CREATE POLICY donations_select_self ON donations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = donations.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Pastors can view donations for their members
CREATE POLICY donations_select_pastor ON donations FOR SELECT
USING (
    user_has_role('pastor')
    AND EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = donations.member_id 
        AND au.role IN ('member', 'visitor')
    )
);

-- Users can insert their own donations
CREATE POLICY donations_insert_self ON donations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = donations.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Finance officers and admins can insert donations
CREATE POLICY donations_insert_finance ON donations FOR INSERT
WITH CHECK (
    user_has_any_role(ARRAY['admin', 'finance_officer'])
);

-- Only finance officers and admins can update donations
CREATE POLICY donations_update_finance ON donations FOR UPDATE
USING (user_has_any_role(ARRAY['admin', 'finance_officer']))
WITH CHECK (user_has_any_role(ARRAY['admin', 'finance_officer']));

-- Only admins can delete donations
CREATE POLICY donations_delete_admin ON donations FOR DELETE
USING (user_has_role('admin'));

-- ================================
-- PLEDGES POLICIES
-- ================================

-- Admins and finance officers can view all pledges
CREATE POLICY pledges_select_admin ON pledges FOR SELECT
USING (user_has_any_role(ARRAY['admin', 'finance_officer']));

-- Users can view their own pledges
CREATE POLICY pledges_select_self ON pledges FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = pledges.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Users can insert their own pledges
CREATE POLICY pledges_insert_self ON pledges FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = pledges.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can insert pledges for members
CREATE POLICY pledges_insert_leadership ON pledges FOR INSERT
WITH CHECK (
    user_has_any_role(ARRAY['admin', 'pastor', 'elder'])
);

-- Users can update their own pledges
CREATE POLICY pledges_update_self ON pledges FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = pledges.member_id 
        AND au.auth_uid = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = pledges.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Finance officers and admins can update any pledges
CREATE POLICY pledges_update_finance ON pledges FOR UPDATE
USING (user_has_any_role(ARRAY['admin', 'finance_officer']))
WITH CHECK (user_has_any_role(ARRAY['admin', 'finance_officer']));

-- Users can delete their own pledges
CREATE POLICY pledges_delete_self ON pledges FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = pledges.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Finance officers and admins can delete any pledges
CREATE POLICY pledges_delete_finance ON pledges FOR DELETE
USING (user_has_any_role(ARRAY['admin', 'finance_officer']));

-- ================================
-- EXPENSES POLICIES
-- ================================

-- Only admins and finance officers can view expenses
CREATE POLICY expenses_select_finance ON expenses FOR SELECT
USING (user_has_any_role(ARRAY['admin', 'finance_officer']));

-- Only admins and finance officers can insert expenses
CREATE POLICY expenses_insert_finance ON expenses FOR INSERT
WITH CHECK (user_has_any_role(ARRAY['admin', 'finance_officer']));

-- Only admins and finance officers can update expenses
CREATE POLICY expenses_update_finance ON expenses FOR UPDATE
USING (user_has_any_role(ARRAY['admin', 'finance_officer']))
WITH CHECK (user_has_any_role(ARRAY['admin', 'finance_officer']));

-- Only admins can delete expenses
CREATE POLICY expenses_delete_admin ON expenses FOR DELETE
USING (user_has_role('admin'));

-- ================================
-- MESSAGES POLICIES
-- ================================

-- Users can view messages sent to them
CREATE POLICY messages_select_recipient ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = messages.recipient_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Users can view messages they sent
CREATE POLICY messages_select_sender ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = messages.sender_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Admins can view all messages
CREATE POLICY messages_select_admin ON messages FOR SELECT
USING (user_has_role('admin'));

-- Users can send messages
CREATE POLICY messages_insert_sender ON messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = messages.sender_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Users can update messages they sent (to mark as read, etc.)
CREATE POLICY messages_update_sender ON messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = messages.sender_id 
        AND au.auth_uid = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = messages.sender_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Recipients can update messages sent to them (to mark as read)
CREATE POLICY messages_update_recipient ON messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = messages.recipient_id 
        AND au.auth_uid = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = messages.recipient_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Only admins can delete messages
CREATE POLICY messages_delete_admin ON messages FOR DELETE
USING (user_has_role('admin'));

-- ================================
-- PRAYER REQUESTS POLICIES
-- ================================

-- Admins can view all prayer requests
CREATE POLICY prayer_requests_select_admin ON prayer_requests FOR SELECT
USING (user_has_role('admin'));

-- Users can view their own prayer requests
CREATE POLICY prayer_requests_select_self ON prayer_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = prayer_requests.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can view prayer requests from members
CREATE POLICY prayer_requests_select_leadership ON prayer_requests FOR SELECT
USING (
    user_has_any_role(ARRAY['pastor', 'elder'])
    AND EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = prayer_requests.member_id 
        AND au.role IN ('member', 'visitor')
    )
);

-- Users can insert their own prayer requests
CREATE POLICY prayer_requests_insert_self ON prayer_requests FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = prayer_requests.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can insert prayer requests for members
CREATE POLICY prayer_requests_insert_leadership ON prayer_requests FOR INSERT
WITH CHECK (
    user_has_any_role(ARRAY['admin', 'pastor', 'elder'])
);

-- Users can update their own prayer requests
CREATE POLICY prayer_requests_update_self ON prayer_requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = prayer_requests.member_id 
        AND au.auth_uid = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = prayer_requests.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can update prayer requests
CREATE POLICY prayer_requests_update_leadership ON prayer_requests FOR UPDATE
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder']))
WITH CHECK (user_has_any_role(ARRAY['admin', 'pastor', 'elder']));

-- Users can delete their own prayer requests
CREATE POLICY prayer_requests_delete_self ON prayer_requests FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM members m
        JOIN app_users au ON au.id = m.user_id
        WHERE m.id = prayer_requests.member_id 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can delete prayer requests
CREATE POLICY prayer_requests_delete_leadership ON prayer_requests FOR DELETE
USING (user_has_any_role(ARRAY['admin', 'pastor', 'elder']));

-- ================================
-- EQUIPMENT POLICIES
-- ================================

-- Admins can view all equipment
CREATE POLICY equipment_select_admin ON equipment FOR SELECT
USING (user_has_role('admin'));

-- Users can view equipment assigned to them
CREATE POLICY equipment_select_assigned ON equipment FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.id = equipment.assigned_to 
        AND au.auth_uid = auth.uid()
    )
);

-- Leadership can view all equipment
CREATE POLICY equipment_select_leadership ON equipment FOR SELECT
USING (user_has_any_role(ARRAY['pastor', 'elder']));

-- Only admins can insert equipment
CREATE POLICY equipment_insert_admin ON equipment FOR INSERT
WITH CHECK (user_has_role('admin'));

-- Only admins can update equipment
CREATE POLICY equipment_update_admin ON equipment FOR UPDATE
USING (user_has_role('admin'))
WITH CHECK (user_has_role('admin'));

-- Only admins can delete equipment
CREATE POLICY equipment_delete_admin ON equipment FOR DELETE
USING (user_has_role('admin'));

-- ================================
-- AUDIT LOGS POLICIES
-- ================================

-- Only admins can view audit logs
CREATE POLICY audit_logs_select_admin ON audit_logs FOR SELECT
USING (user_has_role('admin'));

-- No one can insert audit logs directly (only via triggers)
CREATE POLICY audit_logs_no_insert ON audit_logs FOR INSERT
WITH CHECK (false);

-- No one can update audit logs
CREATE POLICY audit_logs_no_update ON audit_logs FOR UPDATE
WITH CHECK (false);

-- Only admins can delete audit logs (for cleanup)
CREATE POLICY audit_logs_delete_admin ON audit_logs FOR DELETE
USING (user_has_role('admin'));

-- ================================
-- QR TOKENS POLICIES
-- ================================

-- Service role can insert and select QR tokens (for QR generation)
CREATE POLICY qr_tokens_service_role ON qr_tokens FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ================================
-- SYNC QUEUE POLICIES
-- ================================

-- Service role can manage sync queue (for offline sync)
CREATE POLICY sync_queue_service_role ON sync_queue FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ================================
-- HEARTBEAT POLICIES
-- ================================

-- Service role can manage heartbeat (for keep-alive function)
CREATE POLICY heartbeat_service_role ON heartbeat FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
