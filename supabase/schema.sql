-- =====================================================================
-- Minha Vitrine: banco de dados completo (cole no SQL Editor do Supabase e execute)
-- Seguro para rodar uma vez em um projeto novo.
-- =====================================================================

-- ---------- Tabelas ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id serial primary key,
  slug text unique not null,
  name text not null
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  slug text unique not null,
  name text not null,
  description text,
  logo_url text,
  city text,
  state text,
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  handling_days integer not null default 2 check (handling_days between 0 and 30),   -- dias para postar após o pagamento
  delivery_days integer not null default 7 check (delivery_days between 1 and 60),   -- prazo de entrega após a postagem
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);

-- Credenciais do Mercado Pago de cada loja. SEM políticas = ninguém lê pelo navegador; só o servidor (service role).
create table public.store_payment_accounts (
  store_id uuid primary key references public.stores(id) on delete cascade,
  mp_user_id text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id integer references public.categories(id),
  name text not null,
  description text,
  price_cents integer not null check (price_cents > 0),
  promo_price_cents integer check (promo_price_cents is null or (promo_price_cents > 0 and promo_price_cents < price_cents)),
  stock integer not null default 0 check (stock >= 0),
  images text[] not null default '{}',
  variants text[] not null default '{}',
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create index products_store_idx on public.products(store_id);
create index products_category_idx on public.products(category_id);
create index products_name_idx on public.products using gin (to_tsvector('portuguese', name));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id),
  store_id uuid not null references public.stores(id),
  status text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled','refunded')),
  subtotal_cents integer not null,
  shipping_cents integer not null default 0,
  total_cents integer not null,
  commission_rate numeric not null,
  commission_cents integer not null,
  shipping_address jsonb not null,
  tracking_code text,
  carrier text,
  estimated_delivery date,
  mp_payment_id text,
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index orders_buyer_idx on public.orders(buyer_id);
create index orders_store_idx on public.orders(store_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  variant text,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items(order_id);

-- Cada parada do pedido (postado, em trânsito em tal cidade, saiu para entrega...)
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('paid','posted','in_transit','out_for_delivery','delivery_attempt_failed','delivered','info')),
  location text,
  description text not null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events(order_id, created_at);

-- Avisos para o comprador (aparecem no site; também enviados por e-mail quando configurado)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  key text primary key,
  value text not null
);
insert into public.platform_settings (key, value) values ('commission_rate', '0.05');

insert into public.categories (slug, name) values
  ('moda', 'Moda'), ('eletronicos', 'Eletrônicos'), ('casa', 'Casa e decoração'),
  ('beleza', 'Beleza e cuidados'), ('esportes', 'Esportes'), ('artesanato', 'Artesanato'),
  ('alimentos', 'Alimentos e bebidas'), ('brinquedos', 'Brinquedos'), ('livros', 'Livros e papelaria'),
  ('pets', 'Pets'), ('outros', 'Outros');

-- ---------- Funções e gatilhos ----------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que o dono de uma loja suspensa se reative sozinho
create or replace function public.protect_store_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not public.is_admin() and auth.uid() is not null then
    raise exception 'Apenas administradores podem alterar o status da loja';
  end if;
  return new;
end;
$$;
create trigger protect_store_status_trg before update on public.stores
  for each row execute function public.protect_store_status();

-- Impede que o dono altere "destaque" dos próprios produtos
create or replace function public.protect_product_featured() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.featured is distinct from old.featured and not public.is_admin() and auth.uid() is not null then
    raise exception 'Apenas administradores podem alterar o destaque';
  end if;
  return new;
end;
$$;
create trigger protect_product_featured_trg before update on public.products
  for each row execute function public.protect_product_featured();

-- Baixa de estoque atômica (chamada só pelo servidor quando o pagamento é aprovado)
create or replace function public.decrement_stock(p_product_id uuid, p_qty integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare updated integer;
begin
  update public.products set stock = stock - p_qty where id = p_product_id and stock >= p_qty;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;
revoke execute on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;

-- Devolve o estoque quando um pedido é reembolsado
create or replace function public.increment_stock(p_product_id uuid, p_qty integer) returns void
language sql security definer set search_path = public as $$
  update public.products set stock = stock + p_qty where id = p_product_id;
$$;
revoke execute on function public.increment_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.increment_stock(uuid, integer) to service_role;

-- ---------- Segurança por linha (RLS) ----------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.store_payment_accounts enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.platform_settings enable row level security;

-- profiles: cada um vê e edita o seu (sem poder mudar o próprio papel)
create policy "perfil: ver o proprio" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "perfil: editar o proprio" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- categories: todos leem
create policy "categorias: leitura publica" on public.categories for select using (true);

-- stores
create policy "lojas: leitura publica" on public.stores for select
  using (status = 'active' or owner_id = auth.uid() or public.is_admin());
create policy "lojas: criar a propria" on public.stores for insert with check (owner_id = auth.uid());
create policy "lojas: editar a propria" on public.stores for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- products
create policy "produtos: leitura publica" on public.products for select using (
  (active and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active'))
  or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  or public.is_admin()
);
create policy "produtos: dono cria" on public.products for insert
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid() and s.status = 'active'));
create policy "produtos: dono edita" on public.products for update
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "produtos: dono apaga" on public.products for delete
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- orders / order_items: comprador e vendedor veem; criação e alterações só pelo servidor
create policy "pedidos: comprador ou vendedor" on public.orders for select using (
  buyer_id = auth.uid()
  or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  or public.is_admin()
);
create policy "itens: comprador ou vendedor" on public.order_items for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.buyer_id = auth.uid()
           or exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid())
           or public.is_admin())
  )
);

-- order_events: comprador e vendedor leem; gravação só pelo servidor
create policy "eventos: comprador ou vendedor" on public.order_events for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.buyer_id = auth.uid()
           or exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid())
           or public.is_admin())
  )
);

-- notifications: cada um vê e marca como lida as suas
create policy "avisos: ver os proprios" on public.notifications for select using (user_id = auth.uid());
create policy "avisos: marcar como lido" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reviews: todos leem; só quem recebeu o pedido avalia, uma vez
create policy "avaliacoes: leitura publica" on public.reviews for select using (true);
create policy "avaliacoes: comprador avalia" on public.reviews for insert with check (
  buyer_id = auth.uid()
  and exists (
    select 1 from public.orders o
    where o.id = order_id and o.buyer_id = auth.uid() and o.store_id = reviews.store_id and o.status = 'delivered'
  )
);

-- reports: qualquer usuário logado denuncia; só admin lê
create policy "denuncias: criar" on public.reports for insert with check (reporter_id = auth.uid());
create policy "denuncias: admin le" on public.reports for select using (public.is_admin());

-- platform_settings, store_payment_accounts: sem políticas (somente servidor)

-- ---------- Armazenamento de imagens ----------

-- Só aceita imagens (JPG/PNG/WEBP) de até 4 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('produtos', 'produtos', true, 4194304, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;

create policy "imagens: leitura publica" on storage.objects for select using (bucket_id = 'produtos');
create policy "imagens: enviar na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "imagens: apagar da propria pasta" on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Seu usuário administrador ----------
-- Depois de se cadastrar no site, rode (troque pelo seu e-mail):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'SEU@EMAIL.COM');
