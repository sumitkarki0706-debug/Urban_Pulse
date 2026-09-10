INSERT INTO public.user_roles (user_id, role)
VALUES ('bf982d0b-d67d-4e92-8174-02fec5ebbcdc', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;