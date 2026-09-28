-- Migración 7: publicaciones "Venta y permuta" (AMBOS) + Novedades y anuncios.
-- Ejecuta TODO el archivo en el SQL Editor (es seguro repetirlo).

-- 1) Nuevo tipo: una publicación puede ser venta, permuta o ambas.
alter type public.post_type add value if not exists 'AMBOS';

-- 2) Reglas: solo las ventas (VENTA y AMBOS) tienen precio obligatorio y el tope
--    de 3 por día para usuarios normales. Permutas y búsquedas no tienen límite.
create or replace function public.check_post_rules() returns trigger as $$
declare
  es_oficial boolean;
  estado_perfil public.profile_status;
  ventas_24h int;
  es_venta boolean;
  es_permuta boolean;
begin
  es_venta := new.type in ('VENTA', 'AMBOS');
  es_permuta := new.type in ('PERMUTA', 'AMBOS');

  select is_official, status into es_oficial, estado_perfil
    from public.profiles where id = new.user_id;

  if estado_perfil is distinct from 'APROBADO' then
    raise exception 'Tu cuenta debe ser aprobada por un administrador antes de publicar';
  end if;

  if es_venta and new.price is null and not coalesce(es_oficial, false) then
    raise exception 'El precio es obligatorio para las ventas';
  end if;

  if es_venta and not coalesce(es_oficial, false) then
    select count(*) into ventas_24h from public.posts
      where user_id = new.user_id
        and type in ('VENTA', 'AMBOS')
        and created_at > now() - interval '24 hours';
    if ventas_24h >= 3 then
      raise exception 'Máximo 3 ventas por día (las permutas y búsquedas no tienen límite)';
    end if;
  end if;

  if es_permuta and (new.trade_for is null or new.trade_for = '') then
    raise exception 'Debes indicar qué buscas a cambio en una permuta';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 3) Novedades y anuncios (los suben los admins del sitio).
do $$ begin
  create type public.announcement_kind as enum ('NOVEDAD', 'PROXIMAMENTE', 'PREVENTA', 'RIFA');
exception when duplicate_object then null; end $$;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind public.announcement_kind not null default 'NOVEDAD',
  title text not null,
  body text,
  photo_urls text[] not null default '{}',
  event_date date,
  created_at timestamptz not null default now()
);

-- Una fila por (novedad, usuario, día): sirve para contar "más vistas de la semana"
-- sin que una sola persona infle el número recargando.
create table if not exists public.announcement_views (
  id bigint generated always as identity primary key,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  view_day date not null default current_date,
  viewed_at timestamptz not null default now(),
  unique (announcement_id, user_id, view_day)
);

alter table public.announcements enable row level security;
alter table public.announcement_views enable row level security;

drop policy if exists "novedades visibles para todos" on public.announcements;
create policy "novedades visibles para todos" on public.announcements
  for select using (true);
drop policy if exists "solo admin crea novedades" on public.announcements;
create policy "solo admin crea novedades" on public.announcements
  for insert with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "solo admin edita novedades" on public.announcements;
create policy "solo admin edita novedades" on public.announcements
  for update using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "solo admin elimina novedades" on public.announcements;
create policy "solo admin elimina novedades" on public.announcements
  for delete using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "cada quien registra sus vistas" on public.announcement_views;
create policy "cada quien registra sus vistas" on public.announcement_views
  for insert with check (user_id = auth.uid());

-- Las 5 novedades más vistas de los últimos 7 días (empates: la más nueva primero).
create or replace function public.popular_announcements()
returns table (
  id uuid, author_id uuid, kind public.announcement_kind, title text, body text,
  photo_urls text[], event_date date, created_at timestamptz, views_7d bigint
)
language sql stable security definer set search_path = public as $$
  select a.id, a.author_id, a.kind, a.title, a.body, a.photo_urls, a.event_date,
         a.created_at, count(v.id) as views_7d
    from public.announcements a
    left join public.announcement_views v
      on v.announcement_id = a.id and v.viewed_at > now() - interval '7 days'
   group by a.id
   order by count(v.id) desc, a.created_at desc
   limit 5;
$$;

grant select on public.announcements to anon, authenticated;
grant execute on function public.popular_announcements() to anon, authenticated;
