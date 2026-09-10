DROP POLICY IF EXISTS "Complaint attachments readable by involved" ON storage.objects;
CREATE POLICY "Complaint attachments readable by involved"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'complaint-attachments'
  AND (
    public.is_staff(auth.uid())
    OR (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.complaint_attachments a
      JOIN public.complaints c ON c.id = a.complaint_id
      WHERE a.storage_path = storage.objects.name AND c.reporter_id = auth.uid()
    )
  )
);

CREATE OR REPLACE FUNCTION public.rate_complaint(_complaint_id uuid, _rating smallint, _feedback text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  UPDATE public.complaints
  SET rating = _rating, feedback = _feedback
  WHERE id = _complaint_id
    AND reporter_id = auth.uid()
    AND status IN ('resolved','closed');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint not found, not yours, or not yet resolved';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rate_complaint(uuid, smallint, text) TO authenticated;