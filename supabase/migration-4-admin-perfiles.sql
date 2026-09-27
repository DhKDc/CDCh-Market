-- BUG FIX: hasta ahora no existía ninguna policy que permitiera a un admin
-- actualizar el perfil de OTRA persona (solo el propio). Esto significa que
-- aprobar/rechazar usuarios desde /admin probablemente no estaba surtiendo
-- efecto (RLS bloqueaba el UPDATE en silencio, sin error visible).
create policy "el admin del sitio edita cualquier perfil" on profiles
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
