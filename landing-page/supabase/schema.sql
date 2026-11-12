-- Companion: Supabase tables.
-- Run once in Supabase > SQL Editor > New query > Run.
--
-- Row Level Security is on with no public policies, so the publishable key can't read or write
-- anything. Only the website's server (with the secret key) touches these tables.

create table if not exists public.orders (
  id            bigint generated always as identity primary key,
  reference     text not null unique,
  product       text,
  amount        integer,
  email         text not null,
  name          text,
  address_line1 text,
  city          text,
  state         text,
  pin           text,
  country       text,
  status        text not null default 'Pending verification',
  license_key   text unique,
  licensed_to   text,
  devices       text[] not null default '{}',
  verified_at   timestamptz,
  submitted_at  timestamptz not null default now()
);

create table if not exists public.sponsors (
  id           bigint generated always as identity primary key,
  reference    text not null unique,
  amount       integer,
  name         text,
  email        text not null,
  company      text,
  website      text,
  feature      boolean not null default true,
  logo_url     text,
  message      text,
  status       text not null default 'Pending verification',
  verified_at  timestamptz,
  submitted_at timestamptz not null default now()
);

create table if not exists public.waitlist (
  id           bigint generated always as identity primary key,
  email        text not null unique,
  name         text,
  mac          text,
  page         text,
  submitted_at timestamptz not null default now()
);

alter table public.orders   enable row level security;
alter table public.sponsors enable row level security;
alter table public.waitlist enable row level security;

create index if not exists orders_status_idx   on public.orders (status);
create index if not exists sponsors_status_idx on public.sponsors (status);
