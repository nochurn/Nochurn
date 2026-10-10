-- ==============================================================================
-- NoChurn Authentication, Workspace, and Profile Schema with Strict RLS Policies
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (1-to-1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    company_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'Admin',
    selected_plan TEXT DEFAULT 'growth',
    billing_cycle TEXT DEFAULT 'monthly',
    billing_status TEXT DEFAULT 'pending_payment',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Workspace Members Table (Multi-tenant RBAC)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id)
);

-- 5. Pending Signups & Billing Table (Server-Authoritative State)
CREATE TABLE IF NOT EXISTS public.pending_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'growth',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    trial_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_pending_signup UNIQUE (user_id)
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 8. RLS Policies for Workspaces
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
CREATE POLICY "Users can view workspaces they belong to"
    ON public.workspaces FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE public.workspace_members.workspace_id = public.workspaces.id
            AND public.workspace_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create their own workspace" ON public.workspaces;
CREATE POLICY "Users can create their own workspace"
    ON public.workspaces FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their workspace" ON public.workspaces;
CREATE POLICY "Owners can update their workspace"
    ON public.workspaces FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- 9. RLS Policies for Workspace Members
DROP POLICY IF EXISTS "Users can view memberships of their workspaces" ON public.workspace_members;
CREATE POLICY "Users can view memberships of their workspaces"
    ON public.workspace_members FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.workspace_members AS wm
            WHERE wm.workspace_id = public.workspace_members.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
CREATE POLICY "Workspace owners can manage members"
    ON public.workspace_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE public.workspaces.id = public.workspace_members.workspace_id
            AND public.workspaces.owner_id = auth.uid()
        )
        OR (user_id = auth.uid() AND role = 'owner')
    );

-- 10. RLS Policies for Pending Signups
DROP POLICY IF EXISTS "Users can view and update own pending signup" ON public.pending_signups;
CREATE POLICY "Users can view and update own pending signup"
    ON public.pending_signups FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 11. Idempotent Server Function for Workspace & Profile Setup
CREATE OR REPLACE FUNCTION public.setup_user_workspace(
    p_user_id UUID,
    p_full_name TEXT DEFAULT '',
    p_company_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace_id UUID;
    v_workspace_name TEXT;
    v_user_email TEXT;
BEGIN
    -- Fetch user email from auth.users
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;

    -- Ensure profile exists
    INSERT INTO public.profiles (id, full_name, company_name, email)
    VALUES (
        p_user_id,
        COALESCE(p_full_name, ''),
        COALESCE(p_company_name, 'My Workspace'),
        COALESCE(v_user_email, '')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
        company_name = CASE WHEN profiles.company_name IS NULL OR profiles.company_name = '' THEN EXCLUDED.company_name ELSE profiles.company_name END,
        updated_at = timezone('utc'::text, now());

    -- Find existing workspace for user
    SELECT w.id INTO v_workspace_id
    FROM public.workspaces w
    JOIN public.workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = p_user_id
    LIMIT 1;

    -- If no workspace exists, create one
    IF v_workspace_id IS NULL THEN
        v_workspace_name := CASE
            WHEN p_company_name IS NOT NULL AND TRIM(p_company_name) != '' THEN TRIM(p_company_name)
            ELSE 'My Company'
        END;

        INSERT INTO public.workspaces (name, owner_id)
        VALUES (v_workspace_name, p_user_id)
        RETURNING id INTO v_workspace_id;

        -- Create owner membership
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        VALUES (v_workspace_id, p_user_id, 'owner')
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'workspace_id', v_workspace_id,
        'user_id', p_user_id
    );
END;
$$;
