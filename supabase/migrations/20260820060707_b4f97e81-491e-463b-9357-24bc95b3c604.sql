CREATE TABLE public.os_scheduling_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id text NOT NULL,
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
  task_name text NOT NULL,
  category text,
  arrival_time integer NOT NULL DEFAULT 0 CHECK (arrival_time >= 0),
  burst_time integer NOT NULL CHECK (burst_time > 0),
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'READY',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (process_id)
);

CREATE INDEX idx_os_tasks_arrival ON public.os_scheduling_tasks (arrival_time);
CREATE INDEX idx_os_tasks_priority ON public.os_scheduling_tasks (priority);
CREATE INDEX idx_os_tasks_complaint ON public.os_scheduling_tasks (complaint_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_scheduling_tasks TO authenticated;
GRANT ALL ON public.os_scheduling_tasks TO service_role;

ALTER TABLE public.os_scheduling_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view scheduling tasks"
  ON public.os_scheduling_tasks FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Officers can insert scheduling tasks"
  ON public.os_scheduling_tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'department_head') OR public.has_role(auth.uid(), 'municipal_officer')
  );

CREATE POLICY "Officers can update scheduling tasks"
  ON public.os_scheduling_tasks FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'department_head') OR public.has_role(auth.uid(), 'municipal_officer')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'department_head') OR public.has_role(auth.uid(), 'municipal_officer')
  );

CREATE POLICY "Officers can delete scheduling tasks"
  ON public.os_scheduling_tasks FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'department_head') OR public.has_role(auth.uid(), 'municipal_officer')
  );

CREATE TRIGGER os_scheduling_tasks_updated_at
  BEFORE UPDATE ON public.os_scheduling_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.os_scheduling_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm text NOT NULL,
  process_count integer NOT NULL,
  avg_waiting_time numeric NOT NULL,
  avg_turnaround_time numeric NOT NULL,
  avg_response_time numeric,
  total_time integer NOT NULL,
  cpu_utilization numeric,
  timeline jsonb,
  run_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_os_runs_created ON public.os_scheduling_runs (created_at DESC);
CREATE INDEX idx_os_runs_algorithm ON public.os_scheduling_runs (algorithm);

GRANT SELECT, INSERT ON public.os_scheduling_runs TO authenticated;
GRANT ALL ON public.os_scheduling_runs TO service_role;

ALTER TABLE public.os_scheduling_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view scheduling history"
  ON public.os_scheduling_runs FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Officers can record scheduling runs"
  ON public.os_scheduling_runs FOR INSERT TO authenticated
  WITH CHECK (
    run_by = auth.uid() AND (
      public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'department_head') OR public.has_role(auth.uid(), 'municipal_officer')
    )
  );