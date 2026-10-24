-- Run through the Supabase CLI migration workflow. App clients never access tables directly.
create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create table public.care_records (
  id uuid primary key default gen_random_uuid(),
  nurse_id uuid not null references public.staff_members(user_id),
  patient_user_id uuid not null unique references auth.users(id),
  caregiver_user_id uuid references auth.users(id),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  created_at timestamptz not null default now(),
  check (patient_user_id is distinct from caregiver_user_id)
);
create index care_records_nurse_idx on public.care_records(nurse_id, created_at desc);
create index care_records_caregiver_idx on public.care_records(caregiver_user_id) where caregiver_user_id is not null;
create table public.care_completions (
  record_id uuid not null references public.care_records(id) on delete cascade,
  task_id text not null,
  occurrence_date date not null,
  user_id uuid not null references auth.users(id),
  completed_at timestamptz not null default now(),
  primary key (record_id, task_id, occurrence_date)
);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
create table public.care_refills (
  id uuid primary key,
  record_id uuid not null references public.care_records(id) on delete cascade,
  medication_id text not null,
  quantity numeric not null check (quantity > 0 and quantity <= 100000),
  user_id uuid not null references auth.users(id),
  added_at timestamptz not null default now()
);
create index care_refills_record_idx on public.care_refills(record_id);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
create table public.reminder_deliveries (
  delivery_key text primary key,
  status text not null check (status in ('sending', 'sent')),
  lease_token uuid not null,
  lease_until timestamptz not null,
  sent_at timestamptz
);
-- A lease prevents overlapping cron runs from delivering the same reminder twice.
create function public.claim_reminder(p_key text, p_token uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare claimed text;
begin
  insert into public.reminder_deliveries(delivery_key, status, lease_token, lease_until)
  values(p_key, 'sending', p_token, now() + interval '2 minutes')
  on conflict (delivery_key) do update
    set lease_token = excluded.lease_token, lease_until = excluded.lease_until
    where reminder_deliveries.status = 'sending' and reminder_deliveries.lease_until < now()
  returning delivery_key into claimed;
  return claimed is not null;
end;
$$;
revoke all on function public.claim_reminder(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_reminder(text, uuid) to service_role;

-- No browser grants or policies: only the Next.js server's service role can access these tables.
alter table public.staff_members enable row level security;
alter table public.care_records enable row level security;
alter table public.care_completions enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.care_refills enable row level security;
alter table public.reminder_deliveries enable row level security;
revoke all on public.staff_members, public.care_records, public.care_completions, public.care_refills, public.push_subscriptions, public.reminder_deliveries from anon, authenticated;
grant all on public.staff_members, public.care_records, public.care_completions, public.care_refills, public.push_subscriptions, public.reminder_deliveries to service_role;
