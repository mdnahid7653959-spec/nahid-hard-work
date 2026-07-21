
CREATE TABLE public.seller_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT 'Seller Support',
  status text NOT NULL DEFAULT 'open',
  assigned_staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_message_preview text,
  seller_unread_count integer NOT NULL DEFAULT 0,
  staff_unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_support_tickets TO authenticated;
GRANT ALL ON public.seller_support_tickets TO service_role;
ALTER TABLE public.seller_support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sst_view" ON public.seller_support_tickets FOR SELECT TO authenticated
  USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR public.is_staff(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "sst_insert" ON public.seller_support_tickets FOR INSERT TO authenticated
  WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));
CREATE POLICY "sst_update" ON public.seller_support_tickets FOR UPDATE TO authenticated
  USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR public.is_staff(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_sst_updated BEFORE UPDATE ON public.seller_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.seller_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.seller_support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  sender_id uuid NOT NULL,
  sender_name text,
  content text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ssm_ticket ON public.seller_support_messages(ticket_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.seller_support_messages TO authenticated;
GRANT ALL ON public.seller_support_messages TO service_role;
ALTER TABLE public.seller_support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssm_view" ON public.seller_support_messages FOR SELECT TO authenticated
  USING (
    ticket_id IN (SELECT id FROM public.seller_support_tickets
      WHERE seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()))
    OR public.is_staff(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "ssm_insert" ON public.seller_support_messages FOR INSERT TO authenticated
  WITH CHECK (
    (sender_type = 'seller' AND ticket_id IN (
      SELECT id FROM public.seller_support_tickets
      WHERE seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())))
    OR (sender_type = 'staff' AND public.is_staff(auth.uid()))
    OR (sender_type = 'admin' AND public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "ssm_update" ON public.seller_support_messages FOR UPDATE TO authenticated
  USING (
    ticket_id IN (SELECT id FROM public.seller_support_tickets
      WHERE seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()))
    OR public.is_staff(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_support_messages;

CREATE POLICY "seller_support_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'seller-support');
CREATE POLICY "seller_support_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'seller-support');
