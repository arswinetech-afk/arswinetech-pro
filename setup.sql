-- ═══════════════════════════════════════════════════════════════════════════
-- ARSwineTech Pro — Complete Database Migration & RPC Functions
-- ═══════════════════════════════════════════════════════════════════════════
-- Execute this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hgmrltewkxjmhlqevjrp/sql

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Dynamically DROP ALL existing policies across all public tables FIRST
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END LOOP;
END $$;

-- 3. Drop all foreign key constraints on farm_id and user references (CASCADE to allow type conversion)
ALTER TABLE IF EXISTS public.farms DROP CONSTRAINT IF EXISTS farms_created_by_fkey CASCADE;
ALTER TABLE IF EXISTS public.farms DROP CONSTRAINT IF EXISTS farms_owner_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.farm_memberships DROP CONSTRAINT IF EXISTS farm_memberships_farm_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.farm_invitations DROP CONSTRAINT IF EXISTS farm_invitations_farm_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.app_records DROP CONSTRAINT IF EXISTS app_records_farm_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.farm_memberships DROP CONSTRAINT IF EXISTS farm_memberships_farm_id_user_id_key CASCADE;
ALTER TABLE IF EXISTS public.app_records DROP CONSTRAINT IF EXISTS app_records_farm_entity_local_key CASCADE;

-- 4. Create or Upgrade Farms Table (Ensuring ALL columns including created_at and updated_at exist)
CREATE TABLE IF NOT EXISTS public.farms (
    id TEXT PRIMARY KEY DEFAULT ('farm-' || replace(uuid_generate_v4()::text, '-', '')),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'RM''s Hog Farm';
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS farm_address TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS barangay TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS municipality TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Manila';
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Create or Upgrade Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Create or Upgrade Farm Memberships Table
CREATE TABLE IF NOT EXISTS public.farm_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff',
    plan TEXT NOT NULL DEFAULT 'pro',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.farm_memberships ADD COLUMN IF NOT EXISTS farm_id TEXT;
ALTER TABLE public.farm_memberships ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.farm_memberships ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE public.farm_memberships ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pro';
ALTER TABLE public.farm_memberships ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.farm_memberships ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.farm_memberships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 7. Create or Upgrade Farm Invitations Table
CREATE TABLE IF NOT EXISTS public.farm_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'staff',
    uses INT NOT NULL DEFAULT 0,
    max_uses INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.farm_invitations ADD COLUMN IF NOT EXISTS farm_id TEXT;
ALTER TABLE public.farm_invitations ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.farm_invitations ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE public.farm_invitations ADD COLUMN IF NOT EXISTS uses INT DEFAULT 0;
ALTER TABLE public.farm_invitations ADD COLUMN IF NOT EXISTS max_uses INT;
ALTER TABLE public.farm_invitations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.farm_invitations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 8. Create or Upgrade App Records Table (with UNIQUE constraint on farm_id, entity_type, local_id for upserts)
CREATE TABLE IF NOT EXISTS public.app_records (
    id BIGSERIAL PRIMARY KEY,
    farm_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    local_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_records ADD COLUMN IF NOT EXISTS farm_id TEXT;
ALTER TABLE public.app_records ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.app_records ADD COLUMN IF NOT EXISTS local_id TEXT;
ALTER TABLE public.app_records ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE public.app_records ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.app_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.app_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 9. Convert all farm_id columns to TEXT
ALTER TABLE public.farms ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.farm_memberships ALTER COLUMN farm_id TYPE TEXT USING farm_id::text;
ALTER TABLE public.farm_invitations ALTER COLUMN farm_id TYPE TEXT USING farm_id::text;
ALTER TABLE public.app_records ALTER COLUMN farm_id TYPE TEXT USING farm_id::text;

-- 10. Re-attach Unique Constraint & Foreign Key Constraints with CASCADE
ALTER TABLE public.farm_memberships ADD CONSTRAINT farm_memberships_farm_id_user_id_key UNIQUE(farm_id, user_id);

ALTER TABLE public.app_records DROP CONSTRAINT IF EXISTS app_records_farm_entity_local_key;
ALTER TABLE public.app_records ADD CONSTRAINT app_records_farm_entity_local_key UNIQUE (farm_id, entity_type, local_id);

DO $$
BEGIN
    ALTER TABLE public.farm_memberships ADD CONSTRAINT farm_memberships_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.farm_invitations ADD CONSTRAINT farm_invitations_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.app_records ADD CONSTRAINT app_records_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 11. Security Definer Helper Functions (Eliminates RLS Infinite Recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT COALESCE(
        (SELECT lower(trim(email)) = 'arswinetech@gmail.com' FROM auth.users WHERE id = auth.uid()),
        FALSE
    );
$$;

CREATE OR REPLACE FUNCTION public.is_farm_member(p_farm_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.farm_memberships
        WHERE farm_id = p_farm_id
        AND user_id = auth.uid()
        AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.is_farm_owner(p_farm_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.farm_memberships
        WHERE farm_id = p_farm_id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND is_active = TRUE
    );
$$;

-- 12. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_records ENABLE ROW LEVEL SECURITY;

-- 13. Non-Recursive RLS Policies for Members & Platform Developer ('arswinetech@gmail.com')
CREATE POLICY "Members and admins can access farms" ON public.farms
    FOR ALL
    USING (
        public.is_admin_user()
        OR public.is_farm_member(id)
    )
    WITH CHECK (
        public.is_admin_user()
        OR public.is_farm_member(id)
    );

CREATE POLICY "Public profiles read and write" ON public.profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users and admins can access memberships" ON public.farm_memberships
    FOR ALL
    USING (
        user_id = auth.uid()
        OR public.is_admin_user()
        OR public.is_farm_owner(farm_id)
    )
    WITH CHECK (
        user_id = auth.uid()
        OR public.is_admin_user()
        OR public.is_farm_owner(farm_id)
    );

CREATE POLICY "Members and admins can manage invitations" ON public.farm_invitations
    FOR ALL
    USING (
        public.is_admin_user()
        OR public.is_farm_owner(farm_id)
    )
    WITH CHECK (
        public.is_admin_user()
        OR public.is_farm_owner(farm_id)
    );

CREATE POLICY "Members and admins can access farm records" ON public.app_records
    FOR ALL
    USING (
        public.is_admin_user()
        OR public.is_farm_member(farm_id)
    )
    WITH CHECK (
        public.is_admin_user()
        OR public.is_farm_member(farm_id)
    );

-- 14. Auto-sync auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO UPDATE SET email = new.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 15. Drop previous RPC functions with CASCADE and explicit signatures
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin CASCADE;
DROP FUNCTION IF EXISTS public.onboard_my_farm CASCADE;
DROP FUNCTION IF EXISTS public.onboard_my_farm(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.join_farm_with_invitation CASCADE;
DROP FUNCTION IF EXISTS public.join_farm_with_invitation(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_farm_invitation CASCADE;
DROP FUNCTION IF EXISTS public.ensure_farm_invitation(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_farm_invitation(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.regenerate_farm_invitation CASCADE;
DROP FUNCTION IF EXISTS public.regenerate_farm_invitation(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.regenerate_farm_invitation(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.delete_my_farm CASCADE;
DROP FUNCTION IF EXISTS public.delete_my_farm(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_farm_members CASCADE;
DROP FUNCTION IF EXISTS public.get_farm_members(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.platform_delete_user CASCADE;
DROP FUNCTION IF EXISTS public.platform_delete_user(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_farm_member_access CASCADE;
DROP FUNCTION IF EXISTS public.update_farm_member_access(TEXT, TEXT, TEXT, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.override_piglet_lineage CASCADE;
DROP FUNCTION IF EXISTS public.override_piglet_lineage(JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.list_platform_users CASCADE;
DROP FUNCTION IF EXISTS public.list_platform_users() CASCADE;

-- A. Check if Current User is Platform Admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
AS $$
DECLARE
    v_caller_email TEXT;
BEGIN
    SELECT lower(trim(u_auth.email)) INTO v_caller_email FROM auth.users u_auth WHERE u_auth.id = auth.uid();
    RETURN v_caller_email = 'arswinetech@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- B. Onboard First-Time Farm
CREATE OR REPLACE FUNCTION public.onboard_my_farm(
    p_first_name TEXT,
    p_last_name TEXT,
    p_mobile_number TEXT,
    p_farm_name TEXT,
    p_farm_address TEXT DEFAULT NULL,
    p_barangay TEXT DEFAULT NULL,
    p_municipality TEXT DEFAULT NULL,
    p_province TEXT DEFAULT NULL,
    p_timezone TEXT DEFAULT 'Asia/Manila'
)
RETURNS TEXT
AS $$
DECLARE
    v_farm_id TEXT;
    v_user_id UUID;
    v_invite_code TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to onboard a farm.';
    END IF;

    -- Create new farm with text ID
    v_farm_id := 'farm-' || replace(uuid_generate_v4()::text, '-', '');
    
    INSERT INTO public.farms (id, name, address, farm_address, barangay, municipality, province, timezone, created_at, updated_at)
    VALUES (v_farm_id, p_farm_name, p_farm_address, p_farm_address, p_barangay, p_municipality, p_province, p_timezone, NOW(), NOW());

    INSERT INTO public.farm_memberships (farm_id, user_id, role, plan, is_active, created_at, updated_at)
    VALUES (v_farm_id, v_user_id, 'owner', 'pro', TRUE, NOW(), NOW());

    INSERT INTO public.profiles (id, email, first_name, last_name, updated_at)
    SELECT v_user_id, email, p_first_name, p_last_name, NOW() FROM auth.users WHERE id = v_user_id
    ON CONFLICT (id) DO UPDATE SET first_name = p_first_name, last_name = p_last_name, updated_at = NOW();

    v_invite_code := 'ARS-' || upper(substring(replace(uuid_generate_v4()::text, '-', '') from 1 for 6));
    INSERT INTO public.farm_invitations (farm_id, code, role, uses, created_at, updated_at)
    VALUES (v_farm_id, v_invite_code, 'staff', 0, NOW(), NOW());

    RETURN v_farm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- C. Join Farm with Invitation Code
CREATE OR REPLACE FUNCTION public.join_farm_with_invitation(p_invitation_code TEXT)
RETURNS TEXT
AS $$
DECLARE
    v_farm_id TEXT;
    v_role TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to join farm.';
    END IF;

    -- Look up invitation by code
    SELECT farm_id::text, role INTO v_farm_id, v_role
    FROM public.farm_invitations
    WHERE upper(trim(code)) = upper(trim(p_invitation_code))
    LIMIT 1;

    IF v_farm_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation code.';
    END IF;

    INSERT INTO public.farms (id, name, updated_at)
    VALUES (v_farm_id, 'Farm Workspace', NOW())
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

    DELETE FROM public.farm_memberships
    WHERE farm_id = v_farm_id AND user_id = v_user_id;

    INSERT INTO public.farm_memberships (farm_id, user_id, role, plan, is_active, created_at, updated_at)
    VALUES (v_farm_id, v_user_id, COALESCE(v_role, 'staff'), 'pro', TRUE, NOW(), NOW());

    INSERT INTO public.profiles (id, email, updated_at)
    SELECT v_user_id, email, NOW() FROM auth.users WHERE id = v_user_id
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

    UPDATE public.farm_invitations
    SET uses = uses + 1, updated_at = NOW()
    WHERE upper(trim(code)) = upper(trim(p_invitation_code));

    RETURN v_farm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- D. Ensure Farm Invitation (Owner or Developer)
CREATE OR REPLACE FUNCTION public.ensure_farm_invitation(p_farm_id TEXT, p_farm_name TEXT DEFAULT '')
RETURNS JSONB
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_is_owner BOOLEAN;
    v_code TEXT;
    v_role TEXT;
    v_uses INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT lower(trim(u_auth.email)) INTO v_email FROM auth.users u_auth WHERE u_auth.id = v_user_id;

    -- Check if user is an explicit active owner
    SELECT EXISTS (
        SELECT 1 FROM public.farm_memberships
        WHERE farm_id = p_farm_id
        AND user_id = v_user_id
        AND role = 'owner'
        AND is_active = TRUE
    ) INTO v_is_owner;

    -- If no owner row exists on this farm at all, promote earliest active member to owner
    IF NOT v_is_owner THEN
        DECLARE
            v_earliest_user_id UUID;
        BEGIN
            SELECT user_id INTO v_earliest_user_id
            FROM public.farm_memberships
            WHERE farm_id = p_farm_id AND is_active = TRUE
            ORDER BY created_at ASC
            LIMIT 1;

            IF v_earliest_user_id IS NOT NULL THEN
                UPDATE public.farm_memberships
                SET role = 'owner'
                WHERE farm_id = p_farm_id AND user_id = v_earliest_user_id;

                IF v_earliest_user_id = v_user_id THEN
                    v_is_owner := TRUE;
                END IF;
            END IF;
        END;
    END IF;

    IF (v_email IS NULL OR v_email <> 'arswinetech@gmail.com') AND NOT v_is_owner THEN
        RAISE EXCEPTION 'Access denied: Only the farm owner or the developer (arswinetech@gmail.com) can view or generate invitation codes.';
    END IF;

    INSERT INTO public.farms (id, name, updated_at)
    VALUES (p_farm_id, COALESCE(NULLIF(p_farm_name, ''), 'RM''s Hog Farm'), NOW())
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

    SELECT fi.code, fi.role, fi.uses INTO v_code, v_role, v_uses
    FROM public.farm_invitations fi
    WHERE fi.farm_id = p_farm_id
    LIMIT 1;

    IF v_code IS NULL THEN
        v_code := 'ARS-' || upper(substring(replace(uuid_generate_v4()::text, '-', '') from 1 for 6));
        v_role := 'staff';
        v_uses := 0;
        
        DELETE FROM public.farm_invitations WHERE farm_id = p_farm_id;
        INSERT INTO public.farm_invitations (farm_id, code, role, uses, created_at, updated_at)
        VALUES (p_farm_id, v_code, 'staff', 0, NOW(), NOW());
    END IF;

    RETURN jsonb_build_object('code', v_code, 'role', v_role, 'uses', v_uses);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- E. Regenerate Farm Invitation (Owner or Developer)
CREATE OR REPLACE FUNCTION public.regenerate_farm_invitation(p_farm_id TEXT, p_farm_name TEXT DEFAULT '')
RETURNS JSONB
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_is_owner BOOLEAN;
    v_code TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT lower(trim(u_auth.email)) INTO v_email FROM auth.users u_auth WHERE u_auth.id = v_user_id;

    -- Check if user is an explicit active owner
    SELECT EXISTS (
        SELECT 1 FROM public.farm_memberships
        WHERE farm_id = p_farm_id
        AND user_id = v_user_id
        AND role = 'owner'
        AND is_active = TRUE
    ) INTO v_is_owner;

    -- If no owner row exists on this farm at all, promote earliest active member to owner
    IF NOT v_is_owner THEN
        DECLARE
            v_earliest_user_id UUID;
        BEGIN
            SELECT user_id INTO v_earliest_user_id
            FROM public.farm_memberships
            WHERE farm_id = p_farm_id AND is_active = TRUE
            ORDER BY created_at ASC
            LIMIT 1;

            IF v_earliest_user_id IS NOT NULL THEN
                UPDATE public.farm_memberships
                SET role = 'owner'
                WHERE farm_id = p_farm_id AND user_id = v_earliest_user_id;

                IF v_earliest_user_id = v_user_id THEN
                    v_is_owner := TRUE;
                END IF;
            END IF;
        END;
    END IF;

    IF (v_email IS NULL OR v_email <> 'arswinetech@gmail.com') AND NOT v_is_owner THEN
        RAISE EXCEPTION 'Access denied: Only the farm owner or the developer (arswinetech@gmail.com) can regenerate invitation codes.';
    END IF;

    INSERT INTO public.farms (id, name, updated_at)
    VALUES (p_farm_id, COALESCE(NULLIF(p_farm_name, ''), 'RM''s Hog Farm'), NOW())
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

    v_code := 'ARS-' || upper(substring(replace(uuid_generate_v4()::text, '-', '') from 1 for 6));
    
    DELETE FROM public.farm_invitations WHERE farm_id = p_farm_id;
    INSERT INTO public.farm_invitations (farm_id, code, role, uses, created_at, updated_at)
    VALUES (p_farm_id, v_code, 'staff', 0, NOW(), NOW());

    RETURN jsonb_build_object('code', v_code, 'role', 'staff', 'uses', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- F. Delete Farm Complete (Owner or Admin)
CREATE OR REPLACE FUNCTION public.delete_my_farm(p_farm_id TEXT)
RETURNS BOOLEAN
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_is_owner BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT lower(trim(u_auth.email)) INTO v_email FROM auth.users u_auth WHERE u_auth.id = v_user_id;

    SELECT EXISTS (
        SELECT 1 FROM public.farm_memberships
        WHERE farm_id = p_farm_id
        AND user_id = v_user_id
        AND role = 'owner'
        AND is_active = TRUE
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        DECLARE
            v_earliest_user_id UUID;
        BEGIN
            SELECT user_id INTO v_earliest_user_id
            FROM public.farm_memberships
            WHERE farm_id = p_farm_id AND is_active = TRUE
            ORDER BY created_at ASC
            LIMIT 1;

            IF v_earliest_user_id IS NOT NULL THEN
                UPDATE public.farm_memberships
                SET role = 'owner'
                WHERE farm_id = p_farm_id AND user_id = v_earliest_user_id;

                IF v_earliest_user_id = v_user_id THEN
                    v_is_owner := TRUE;
                END IF;
            END IF;
        END;
    END IF;

    IF (v_email IS NULL OR v_email <> 'arswinetech@gmail.com') AND NOT v_is_owner THEN
        RAISE EXCEPTION 'Access denied: Only the farm owner or platform admin can delete a farm.';
    END IF;

    DELETE FROM public.farm_memberships WHERE farm_id = p_farm_id;
    DELETE FROM public.farm_invitations WHERE farm_id = p_farm_id;
    DELETE FROM public.app_records WHERE farm_id = p_farm_id;
    DELETE FROM public.farms WHERE id = p_farm_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- G. Stored procedure to list members for a farm
CREATE OR REPLACE FUNCTION public.get_farm_members(p_farm_id TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    role TEXT,
    plan TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fm.user_id,
        COALESCE(p.email, u_auth.email, 'staff@farm.ph')::text AS email,
        fm.role::text AS role,
        fm.plan::text AS plan,
        fm.is_active,
        fm.created_at
    FROM public.farm_memberships fm
    LEFT JOIN public.profiles p ON p.id = fm.user_id
    LEFT JOIN auth.users u_auth ON u_auth.id = fm.user_id
    WHERE fm.farm_id = p_farm_id
    ORDER BY fm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- H. Platform Admin User Deletion (Developer 'arswinetech@gmail.com' ONLY)
CREATE OR REPLACE FUNCTION public.platform_delete_user(p_email TEXT)
RETURNS BOOLEAN
AS $$
DECLARE
    v_caller_email TEXT;
    v_target_id UUID;
    v_clean_email TEXT;
BEGIN
    v_clean_email := lower(trim(p_email));

    SELECT lower(trim(u_auth.email)) INTO v_caller_email FROM auth.users u_auth WHERE u_auth.id = auth.uid();
    IF v_caller_email IS NULL OR v_caller_email <> 'arswinetech@gmail.com' THEN
        RAISE EXCEPTION 'Access denied: Only the platform developer (arswinetech@gmail.com) can delete users.';
    END IF;

    IF v_caller_email = v_clean_email THEN
        RAISE EXCEPTION 'You cannot delete your own signed-in administrator account.';
    END IF;

    SELECT u_auth.id INTO v_target_id FROM auth.users u_auth WHERE lower(trim(u_auth.email)) = v_clean_email LIMIT 1;
    IF v_target_id IS NULL THEN
        SELECT p.id INTO v_target_id FROM public.profiles p WHERE lower(trim(p.email)) = v_clean_email LIMIT 1;
    END IF;

    IF v_target_id IS NOT NULL THEN
        DELETE FROM public.farm_memberships WHERE user_id = v_target_id;
        DELETE FROM public.profiles WHERE id = v_target_id;
        DELETE FROM auth.users WHERE id = v_target_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- I. Update Farm Member Access
CREATE OR REPLACE FUNCTION public.update_farm_member_access(
    p_farm_id TEXT,
    p_user_id TEXT,
    p_role TEXT DEFAULT 'staff',
    p_plan TEXT DEFAULT 'pro',
    p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
AS $$
DECLARE
    v_caller_email TEXT;
    v_is_owner BOOLEAN;
    v_target_uuid UUID;
    v_clean_id TEXT;
BEGIN
    v_clean_id := lower(trim(p_user_id));
    SELECT lower(trim(u_auth.email)) INTO v_caller_email FROM auth.users u_auth WHERE u_auth.id = auth.uid();
    
    SELECT EXISTS (
        SELECT 1 FROM public.farm_memberships
        WHERE farm_id = p_farm_id AND user_id = auth.uid() AND role = 'owner' AND is_active = TRUE
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        DECLARE
            v_earliest_user_id UUID;
        BEGIN
            SELECT user_id INTO v_earliest_user_id
            FROM public.farm_memberships
            WHERE farm_id = p_farm_id AND is_active = TRUE
            ORDER BY created_at ASC
            LIMIT 1;

            IF v_earliest_user_id IS NOT NULL THEN
                UPDATE public.farm_memberships
                SET role = 'owner'
                WHERE farm_id = p_farm_id AND user_id = v_earliest_user_id;

                IF v_earliest_user_id = auth.uid() THEN
                    v_is_owner := TRUE;
                END IF;
            END IF;
        END;
    END IF;

    IF (v_caller_email IS NULL OR v_caller_email <> 'arswinetech@gmail.com') AND NOT v_is_owner THEN
        RAISE EXCEPTION 'Access denied: Only farm owner or platform admin can modify member access.';
    END IF;

    -- 1. Try to find user by email in profiles
    SELECT p.id INTO v_target_uuid FROM public.profiles p WHERE lower(trim(p.email)) = v_clean_id LIMIT 1;
    
    -- 2. Try to find user by email in auth.users
    IF v_target_uuid IS NULL THEN
        SELECT u_auth.id INTO v_target_uuid FROM auth.users u_auth WHERE lower(trim(u_auth.email)) = v_clean_id LIMIT 1;
    END IF;

    -- 3. If not found by email, try matching by UUID text directly
    IF v_target_uuid IS NULL THEN
        SELECT u_auth.id INTO v_target_uuid FROM auth.users u_auth WHERE u_auth.id::text = v_clean_id LIMIT 1;
    END IF;

    -- 4. If still null, try profiles by id::text
    IF v_target_uuid IS NULL THEN
        SELECT p.id INTO v_target_uuid FROM public.profiles p WHERE p.id::text = v_clean_id LIMIT 1;
    END IF;

    IF v_target_uuid IS NOT NULL THEN
        DELETE FROM public.farm_memberships
        WHERE farm_id = p_farm_id AND user_id = v_target_uuid;

        INSERT INTO public.farm_memberships (farm_id, user_id, role, plan, is_active, updated_at)
        VALUES (p_farm_id, v_target_uuid, p_role, p_plan, p_is_active, NOW());
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- J. Override Piglet Lineage Placeholder
CREATE OR REPLACE FUNCTION public.override_piglet_lineage(payload JSONB)
RETURNS JSONB
AS $$
BEGIN
    RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- K. List Platform Users (Developer 'arswinetech@gmail.com' ONLY)
CREATE OR REPLACE FUNCTION public.list_platform_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    farm_id TEXT,
    farm_name TEXT,
    role TEXT,
    plan TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ
)
AS $$
DECLARE
    v_caller_email TEXT;
BEGIN
    SELECT lower(trim(u_auth.email)) INTO v_caller_email FROM auth.users u_auth WHERE u_auth.id = auth.uid();
    
    IF v_caller_email IS NULL OR v_caller_email <> 'arswinetech@gmail.com' THEN
        RAISE EXCEPTION 'Access denied: Platform admin only.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email::text,
        COALESCE(NULLIF(trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''), split_part(u.email, '@', 1))::text AS name,
        fm.farm_id::text,
        COALESCE(f.name, fm.farm_id, 'Unassigned')::text AS farm_name,
        COALESCE(fm.role, 'staff')::text AS role,
        COALESCE(fm.plan, 'starter')::text AS plan,
        COALESCE(fm.is_active, true) AS is_active,
        u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.farm_memberships fm ON fm.user_id = u.id
    LEFT JOIN public.farms f ON f.id = fm.farm_id
    WHERE u.email NOT ILIKE '%@arswine-test.ph%'
      AND (f.name IS NULL OR (f.name NOT ILIKE '%E2E Live%' AND f.name NOT ILIKE '%Lint Verify%'))
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- L. Purge Test Accounts & Test Farms RPC (Developer 'arswinetech@gmail.com' ONLY)
CREATE OR REPLACE FUNCTION public.platform_purge_test_accounts()
RETURNS JSONB
AS $$
DECLARE
    v_caller_email TEXT;
    v_deleted_users INT := 0;
    v_deleted_farms INT := 0;
BEGIN
    SELECT lower(trim(u_auth.email)) INTO v_caller_email FROM auth.users u_auth WHERE u_auth.id = auth.uid();
    IF v_caller_email IS NULL OR v_caller_email <> 'arswinetech@gmail.com' THEN
        RAISE EXCEPTION 'Access denied: Only arswinetech@gmail.com can purge test accounts.';
    END IF;

    -- Clear created_by references from farms first
    BEGIN
        UPDATE public.farms SET created_by = NULL 
        WHERE created_by IN (SELECT id FROM auth.users WHERE email ILIKE '%@arswine-test.ph%');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Delete records for test farms
    DELETE FROM public.app_records 
    WHERE farm_id IN (SELECT id FROM public.farms WHERE name ILIKE '%E2E Live%' OR name ILIKE '%Lint Verify%' OR id = 'farm-sample');

    -- Delete memberships for test users and test farms
    DELETE FROM public.farm_memberships 
    WHERE farm_id IN (SELECT id FROM public.farms WHERE name ILIKE '%E2E Live%' OR name ILIKE '%Lint Verify%' OR id = 'farm-sample')
       OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%@arswine-test.ph%');

    -- Delete invitations for test farms
    DELETE FROM public.farm_invitations 
    WHERE farm_id IN (SELECT id FROM public.farms WHERE name ILIKE '%E2E Live%' OR name ILIKE '%Lint Verify%' OR id = 'farm-sample');

    -- Delete profiles
    DELETE FROM public.profiles WHERE email ILIKE '%@arswine-test.ph%';

    -- Delete farms
    WITH deleted_f AS (
        DELETE FROM public.farms 
        WHERE name ILIKE '%E2E Live%' OR name ILIKE '%Lint Verify%' OR id = 'farm-sample'
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_farms FROM deleted_f;

    -- Delete auth users
    WITH deleted_u AS (
        DELETE FROM auth.users 
        WHERE email ILIKE '%@arswine-test.ph%'
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_users FROM deleted_u;

    RETURN jsonb_build_object(
        'success', TRUE,
        'deleted_users', v_deleted_users,
        'deleted_farms', v_deleted_farms
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- M. Automated One-Time Cleanup of Test Accounts & Dummy Farms
DO $$
BEGIN
    -- Clear created_by references from farms
    BEGIN
        UPDATE public.farms SET created_by = NULL 
        WHERE created_by IN (SELECT id FROM auth.users WHERE email ILIKE '%@arswine-test.ph%');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Delete automated test sow records and test reservations
    DELETE FROM public.app_records 
    WHERE payload->>'name' ILIKE '%Verify Sow%'
       OR payload->>'name' ILIKE '%Live Sync%'
       OR payload->>'name' ILIKE '%Lint Verify%'
       OR payload->>'name' ILIKE '%Test Sow%'
       OR payload->>'name' ILIKE '%Sow name 1%'
       OR payload->>'name' ILIKE '%Sow name 2%'
       OR payload->>'name' ILIKE '%Sow Name - First Batch%'
       OR payload->>'id' ILIKE '%OUT-20260806-001%'
       OR payload->>'customer' ILIKE '%Test%'
       OR local_id ILIKE '%OUT-20260806-001%'
       OR local_id ILIKE '%verify%'
       OR local_id ILIKE '%live_sync%'
       OR local_id ILIKE '%test%';

    DELETE FROM public.app_records 
    WHERE farm_id IN (SELECT id FROM public.farms WHERE name ILIKE '%E2E Live%' OR name ILIKE '%Lint Verify%' OR id = 'farm-sample');

    DELETE FROM public.farm_memberships 
    WHERE farm_id IN (SELECT id FROM public.farms WHERE name ILIKE '%E2E Live%' OR name ILIKE '%Lint Verify%' OR id = 'farm-sample')
       OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%@arswine-test.ph%');

    DELETE FROM public.farm_invitations 
    WHERE farm_id IN (SELECT id FROM public.farms WHERE name ILIKE '%E2E Live%' OR name ILIKE '%Lint Verify%' OR id = 'farm-sample');

    DELETE FROM public.profiles WHERE email ILIKE '%@arswine-test.ph%';

    DELETE FROM public.farms 
    WHERE name ILIKE '%E2E Live%' OR name ILIKE '%Lint Verify%' OR id = 'farm-sample';

    DELETE FROM auth.users 
    WHERE email ILIKE '%@arswine-test.ph%';
END $$;

