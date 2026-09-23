create policy "insert subjects" on subjects for insert with check (true);

create table if not exists lecture_ai_content (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid references lectures(id) on delete cascade unique,
  summary text,
  quiz jsonb,
  generated_at timestamptz default now()
);

alter table lecture_ai_content enable row level security;

create policy "read lecture ai content" on lecture_ai_content for select using (true);
create policy "insert lecture ai content" on lecture_ai_content for insert with check (true);
create policy "update lecture ai content" on lecture_ai_content for update using (true);