
-- =========================================================================
-- UrbanPulse Phase 1 schema
-- =========================================================================

-- Enums
CREATE TYPE public.app_role AS ENUM (
  'super_admin', 'admin', 'department_head', 'municipal_officer',
  'engineer', 'contractor', 'citizen'
);

CREATE TYPE public.complaint_status AS ENUM (
  'submitted', 'acknowledged', 'assigned', 'in_progress',
  'resolved', 'rejected', 'closed'
);

CREATE TYPE public.complaint_priority AS ENUM (
  'low', 'medium', 'high', 'critical'
);

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============================ profiles ==================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  address TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================ user_roles ================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','admin','department_head','municipal_officer','engineer','contractor')
  );
$$;

-- Now that has_role exists, add admin policies on user_roles
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================ auto-create profile + citizen role ========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'citizen')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================ departments ===============================
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO authenticated, anon;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Departments readable" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins manage departments" ON public.departments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_dept_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================ complaint_categories ======================
CREATE TABLE public.complaint_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  default_priority complaint_priority NOT NULL DEFAULT 'medium',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.complaint_categories TO authenticated, anon;
GRANT ALL ON public.complaint_categories TO service_role;
ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories readable" ON public.complaint_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.complaint_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================ complaints ================================
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE DEFAULT ('UP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.complaint_categories(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status complaint_status NOT NULL DEFAULT 'submitted',
  priority complaint_priority NOT NULL DEFAULT 'medium',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  city TEXT,
  rating SMALLINT CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  feedback TEXT,
  resolved_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_complaints_reporter ON public.complaints(reporter_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_department ON public.complaints(department_id);
CREATE INDEX idx_complaints_created ON public.complaints(created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter reads own complaints" ON public.complaints
  FOR SELECT TO authenticated USING (reporter_id = auth.uid() AND is_deleted = false);
CREATE POLICY "Staff read all complaints" ON public.complaints
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) AND is_deleted = false);
CREATE POLICY "Citizens create complaints" ON public.complaints
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Reporter updates own draft" ON public.complaints
  FOR UPDATE TO authenticated
  USING (reporter_id = auth.uid() AND status = 'submitted')
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Staff update complaints" ON public.complaints
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_complaints_updated BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================ complaint_status_history ==================
CREATE TABLE public.complaint_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  from_status complaint_status,
  to_status complaint_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_complaint ON public.complaint_status_history(complaint_id);
GRANT SELECT, INSERT ON public.complaint_status_history TO authenticated;
GRANT ALL ON public.complaint_status_history TO service_role;
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "History readable if complaint readable" ON public.complaint_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_id
              AND (c.reporter_id = auth.uid() OR public.is_staff(auth.uid())))
  );
CREATE POLICY "Staff write history" ON public.complaint_status_history
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_complaint_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.complaint_status_history(complaint_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.reporter_id);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.complaint_status_history(complaint_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
      NEW.resolved_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_complaint_status_history
  AFTER INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.log_complaint_status_change();
CREATE TRIGGER trg_complaint_status_history_upd
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.log_complaint_status_change();

-- ============================ complaint_comments ========================
CREATE TABLE public.complaint_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_complaint ON public.complaint_comments(complaint_id);
GRANT SELECT, INSERT ON public.complaint_comments TO authenticated;
GRANT ALL ON public.complaint_comments TO service_role;
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments readable" ON public.complaint_comments
  FOR SELECT TO authenticated USING (
    (NOT is_internal OR public.is_staff(auth.uid()))
    AND EXISTS (SELECT 1 FROM public.complaints c
                WHERE c.id = complaint_id
                  AND (c.reporter_id = auth.uid() OR public.is_staff(auth.uid())))
  );
CREATE POLICY "Users write comments on visible complaints" ON public.complaint_comments
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid()
    AND (is_internal = false OR public.is_staff(auth.uid()))
    AND EXISTS (SELECT 1 FROM public.complaints c
                WHERE c.id = complaint_id
                  AND (c.reporter_id = auth.uid() OR public.is_staff(auth.uid())))
  );

-- ============================ complaint_attachments =====================
CREATE TABLE public.complaint_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INT,
  kind TEXT NOT NULL DEFAULT 'image',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_complaint ON public.complaint_attachments(complaint_id);
GRANT SELECT, INSERT, DELETE ON public.complaint_attachments TO authenticated;
GRANT ALL ON public.complaint_attachments TO service_role;
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attachments readable if complaint readable" ON public.complaint_attachments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_id
              AND (c.reporter_id = auth.uid() OR public.is_staff(auth.uid())))
  );
CREATE POLICY "Users upload attachments on own complaints" ON public.complaint_attachments
  FOR INSERT TO authenticated WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.complaints c
                WHERE c.id = complaint_id
                  AND (c.reporter_id = auth.uid() OR public.is_staff(auth.uid())))
  );
CREATE POLICY "Uploader deletes own attachment" ON public.complaint_attachments
  FOR DELETE TO authenticated USING (uploader_id = auth.uid());

-- ============================ audit_log =================================
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================ storage bucket policies ===================
-- Bucket created via tool; add object policies here.
CREATE POLICY "Complaint attachments readable by involved" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'complaint-attachments'
    AND (
      public.is_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
CREATE POLICY "Users upload to own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'complaint-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Users delete own attachments" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'complaint-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================ seed data =================================
INSERT INTO public.departments (name, code, description) VALUES
  ('Public Works', 'PWD', 'Roads, bridges, and public infrastructure'),
  ('Sanitation', 'SAN', 'Garbage collection and cleanliness'),
  ('Electrical', 'ELC', 'Street lights and electrical infrastructure'),
  ('Water Supply', 'WTR', 'Water leakage and supply issues'),
  ('Drainage', 'DRN', 'Drainage and sewage'),
  ('Enforcement', 'ENF', 'Illegal dumping, encroachment, emergencies');

INSERT INTO public.complaint_categories (name, slug, icon, default_priority, department_id) VALUES
  ('Road Damage', 'road-damage', 'construction', 'high',   (SELECT id FROM public.departments WHERE code='PWD')),
  ('Garbage Collection', 'garbage', 'trash-2', 'medium',   (SELECT id FROM public.departments WHERE code='SAN')),
  ('Street Light', 'street-light', 'lamp', 'medium',       (SELECT id FROM public.departments WHERE code='ELC')),
  ('Water Leakage', 'water-leakage', 'droplet', 'high',    (SELECT id FROM public.departments WHERE code='WTR')),
  ('Drainage Issue', 'drainage', 'waves', 'high',          (SELECT id FROM public.departments WHERE code='DRN')),
  ('Illegal Dumping', 'illegal-dumping', 'ban', 'medium',  (SELECT id FROM public.departments WHERE code='ENF')),
  ('Public Asset Damage', 'public-asset', 'landmark', 'medium', (SELECT id FROM public.departments WHERE code='PWD')),
  ('Emergency', 'emergency', 'siren', 'critical',          (SELECT id FROM public.departments WHERE code='ENF'));
