UPDATE public.admin_credentials
SET password_hash = '3c0e7f7eb4b8d73936f041292c2ff15a601538adb2704c079c5b226036a812ca',
    updated_at = now()
WHERE username = 'HI Admin';