
-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.work_order_status AS ENUM ('draft','scheduled','in_progress','on_hold','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CONTRACTORS
CREATE TABLE public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  specialization TEXT,
  rating NUMERIC(3,2) DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;
GRANT ALL ON public.contractors TO service_role;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read contractors" ON public.contractors FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage contractors" ON public.contractors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'department_head'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'department_head'));
CREATE POLICY "Contractor reads own row" ON public.contractors FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER contractors_updated_at BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WORK ORDERS
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE DEFAULT ('WO-' || upper(substr(gen_random_uuid()::text,1,8))),
  title TEXT NOT NULL,
  description TEXT,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.work_order_status NOT NULL DEFAULT 'draft',
  priority public.complaint_priority NOT NULL DEFAULT 'medium',
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  actual_cost NUMERIC(12,2) DEFAULT 0,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read work orders" ON public.work_orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Contractors read assigned WO" ON public.work_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = work_orders.contractor_id AND c.user_id = auth.uid()));
CREATE POLICY "Engineers+ manage WO" ON public.work_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'engineer') OR public.has_role(auth.uid(),'department_head') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'municipal_officer'))
  WITH CHECK (public.has_role(auth.uid(),'engineer') OR public.has_role(auth.uid(),'department_head') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'municipal_officer'));
CREATE POLICY "Contractors update own WO status" ON public.work_orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = work_orders.contractor_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = work_orders.contractor_id AND c.user_id = auth.uid()));
CREATE TRIGGER work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WORK ORDER UPDATES
CREATE TABLE public.work_order_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  photo_url TEXT,
  hours_worked NUMERIC(6,2) DEFAULT 0,
  status_from public.work_order_status,
  status_to public.work_order_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_updates TO authenticated;
GRANT ALL ON public.work_order_updates TO service_role;
ALTER TABLE public.work_order_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read WO updates" ON public.work_order_updates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Contractor read own WO updates" ON public.work_order_updates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.work_orders w JOIN public.contractors c ON c.id = w.contractor_id
                 WHERE w.id = work_order_updates.work_order_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff post WO updates" ON public.work_order_updates FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND posted_by = auth.uid());

-- BUDGETS
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department_id, fiscal_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read budgets" ON public.budgets FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage budgets" ON public.budgets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'department_head'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'department_head'));
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BUDGET EXPENSES
CREATE TABLE public.budget_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT,
  description TEXT,
  incurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_expenses TO authenticated;
GRANT ALL ON public.budget_expenses TO service_role;
ALTER TABLE public.budget_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read expenses" ON public.budget_expenses FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage expenses" ON public.budget_expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'department_head'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'department_head'));

-- AI ANALYSIS
CREATE TABLE public.ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  suggested_category TEXT,
  suggested_priority public.complaint_priority,
  suggested_department TEXT,
  summary TEXT,
  confidence NUMERIC(4,3),
  model TEXT,
  raw JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(complaint_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis TO authenticated;
GRANT ALL ON public.ai_analysis TO service_role;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read AI analysis" ON public.ai_analysis FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff write AI analysis" ON public.ai_analysis FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
