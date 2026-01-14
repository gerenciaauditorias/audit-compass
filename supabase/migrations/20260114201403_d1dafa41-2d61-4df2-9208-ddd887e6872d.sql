-- Create membership role enum
CREATE TYPE public.org_role AS ENUM ('admin', 'member');

-- Create profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create organizations table (tenants)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create memberships table (org-user relationship)
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(org_id, user_id)
);

-- Create audit status enum
CREATE TYPE public.audit_status AS ENUM ('draft', 'planned', 'in_progress', 'completed', 'cancelled');

-- Create audit_plans table
CREATE TABLE public.audit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  iso_standard TEXT NOT NULL,
  status audit_status DEFAULT 'draft' NOT NULL,
  planned_start_date DATE,
  planned_end_date DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create severity enum for findings
CREATE TYPE public.finding_severity AS ENUM ('observation', 'minor', 'major', 'critical');

-- Create audit_findings table
CREATE TABLE public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.audit_plans(id) ON DELETE CASCADE,
  clause TEXT NOT NULL,
  description TEXT NOT NULL,
  severity finding_severity NOT NULL DEFAULT 'observation',
  evidence TEXT,
  corrective_action TEXT,
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.audit_plans(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Helper function: is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  )
$$;

-- Helper function: get_org_role
CREATE OR REPLACE FUNCTION public.get_org_role(_org_id UUID)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.memberships
  WHERE org_id = _org_id AND user_id = auth.uid()
$$;

-- Helper function: is_org_member
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE org_id = _org_id AND user_id = auth.uid()
  )
$$;

-- Trigger function for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audit_plans_updated_at BEFORE UPDATE ON public.audit_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audit_findings_updated_at BEFORE UPDATE ON public.audit_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_super_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- RLS Policies for organizations
CREATE POLICY "Members can view their orgs" ON public.organizations FOR SELECT USING (public.is_super_admin() OR public.is_org_member(id));
CREATE POLICY "Super admins can create orgs" ON public.organizations FOR INSERT WITH CHECK (public.is_super_admin());
CREATE POLICY "Org admins can update their org" ON public.organizations FOR UPDATE USING (public.is_super_admin() OR public.get_org_role(id) = 'admin');
CREATE POLICY "Super admins can delete orgs" ON public.organizations FOR DELETE USING (public.is_super_admin());

-- RLS Policies for memberships
CREATE POLICY "Members can view org memberships" ON public.memberships FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
CREATE POLICY "Admins can insert memberships" ON public.memberships FOR INSERT WITH CHECK (public.is_super_admin() OR (public.get_org_role(org_id) = 'admin' AND user_id != auth.uid()));
CREATE POLICY "Admins can update memberships" ON public.memberships FOR UPDATE USING (public.is_super_admin() OR (public.get_org_role(org_id) = 'admin' AND user_id != auth.uid()));
CREATE POLICY "Admins can delete memberships" ON public.memberships FOR DELETE USING (public.is_super_admin() OR (public.get_org_role(org_id) = 'admin' AND user_id != auth.uid()));

-- RLS Policies for audit_plans
CREATE POLICY "Members can view org audit plans" ON public.audit_plans FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
CREATE POLICY "Admins can create audit plans" ON public.audit_plans FOR INSERT WITH CHECK (public.is_super_admin() OR public.get_org_role(org_id) = 'admin');
CREATE POLICY "Admins can update audit plans" ON public.audit_plans FOR UPDATE USING (public.is_super_admin() OR public.get_org_role(org_id) = 'admin');
CREATE POLICY "Admins can delete audit plans" ON public.audit_plans FOR DELETE USING (public.is_super_admin() OR public.get_org_role(org_id) = 'admin');

-- RLS Policies for audit_findings
CREATE POLICY "Members can view org findings" ON public.audit_findings FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
CREATE POLICY "Admins can create findings" ON public.audit_findings FOR INSERT WITH CHECK (public.is_super_admin() OR public.get_org_role(org_id) = 'admin');
CREATE POLICY "Admins can update findings" ON public.audit_findings FOR UPDATE USING (public.is_super_admin() OR public.get_org_role(org_id) = 'admin');
CREATE POLICY "Admins can delete findings" ON public.audit_findings FOR DELETE USING (public.is_super_admin() OR public.get_org_role(org_id) = 'admin');

-- RLS Policies for documents
CREATE POLICY "Members can view org documents" ON public.documents FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
CREATE POLICY "Admins can create documents" ON public.documents FOR INSERT WITH CHECK (public.is_super_admin() OR public.get_org_role(org_id) = 'admin');
CREATE POLICY "Admins can delete documents" ON public.documents FOR DELETE USING (public.is_super_admin() OR public.get_org_role(org_id) = 'admin');

-- Create storage bucket for audit documents
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-docs', 'audit-docs', false);

-- Storage policies
CREATE POLICY "Org members can view docs" ON storage.objects FOR SELECT USING (
  bucket_id = 'audit-docs' AND (
    public.is_super_admin() OR 
    EXISTS (
      SELECT 1 FROM public.documents d 
      JOIN public.memberships m ON d.org_id = m.org_id 
      WHERE d.storage_path = name AND m.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Org admins can upload docs" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'audit-docs' AND (
    public.is_super_admin() OR
    auth.uid() IS NOT NULL
  )
);

CREATE POLICY "Org admins can delete docs" ON storage.objects FOR DELETE USING (
  bucket_id = 'audit-docs' AND (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.documents d 
      JOIN public.memberships m ON d.org_id = m.org_id 
      WHERE d.storage_path = name AND m.user_id = auth.uid() AND m.role = 'admin'
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_memberships_org_id ON public.memberships(org_id);
CREATE INDEX idx_audit_plans_org_id ON public.audit_plans(org_id);
CREATE INDEX idx_audit_findings_org_id ON public.audit_findings(org_id);
CREATE INDEX idx_audit_findings_plan_id ON public.audit_findings(plan_id);
CREATE INDEX idx_documents_org_id ON public.documents(org_id);