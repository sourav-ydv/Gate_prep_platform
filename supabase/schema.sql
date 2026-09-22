create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  branch text not null default 'CS',      
  target_year int not null default 2027,
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  branch text not null,
  name text not null,
  order_index int default 0
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  name text not null,
  order_index int default 0
);

create table if not exists lectures (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade,
  title text not null,
  source_type text not null default 'youtube',
  url text not null,
  duration_seconds int,
  added_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists lecture_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lecture_id uuid references lectures(id) on delete cascade,
  watched_seconds int not null default 0,
  completed boolean not null default false,
  last_watched_at timestamptz default now(),
  unique (user_id, lecture_id)
);

create table if not exists pyqs (
  id uuid primary key default gen_random_uuid(),
  branch text not null,
  topic_id uuid references topics(id) on delete set null,
  year int,
  question text not null,
  options jsonb,              
  correct_option text,        
  correct_value numeric,      
  marks numeric default 1,
  negative_marks numeric default 0,
  explanation text,           
  created_at timestamptz not null default now()
);

create table if not exists pyq_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  pyq_id uuid references pyqs(id) on delete cascade,
  user_answer text,
  is_correct boolean,
  ai_explanation text,        
  attempted_at timestamptz not null default now()
);

create table if not exists mock_tests (
  id uuid primary key default gen_random_uuid(),
  branch text not null,
  title text not null,
  duration_minutes int not null default 180,
  created_at timestamptz not null default now()
);

create table if not exists mock_test_questions (
  id uuid primary key default gen_random_uuid(),
  mock_test_id uuid references mock_tests(id) on delete cascade,
  pyq_id uuid references pyqs(id) on delete cascade,
  order_index int default 0
);

create table if not exists mock_test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mock_test_id uuid references mock_tests(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  total_marks numeric
);

create table if not exists mock_test_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references mock_test_attempts(id) on delete cascade,
  pyq_id uuid references pyqs(id) on delete cascade,
  user_answer text,
  is_correct boolean,
  marks_awarded numeric
);

create table if not exists topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  attempts int not null default 0,
  correct int not null default 0,
  accuracy numeric generated always as (
    case when attempts = 0 then 0 else round((correct::numeric / attempts) * 100, 1) end
  ) stored,
  last_updated timestamptz default now(),
  unique (user_id, topic_id)
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  reason text,               
  status text default 'open',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table lecture_progress enable row level security;
alter table pyq_attempts enable row level security;
alter table mock_test_attempts enable row level security;
alter table mock_test_answers enable row level security;
alter table topic_mastery enable row level security;
alter table recommendations enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own lecture progress" on lecture_progress for all using (auth.uid() = user_id);
create policy "own pyq attempts" on pyq_attempts for all using (auth.uid() = user_id);
create policy "own mock attempts" on mock_test_attempts for all using (auth.uid() = user_id);
create policy "own mock answers" on mock_test_answers for all using (
  auth.uid() = (select user_id from mock_test_attempts where id = attempt_id)
);
create policy "own mastery" on topic_mastery for all using (auth.uid() = user_id);
create policy "own recommendations" on recommendations for all using (auth.uid() = user_id);

alter table subjects enable row level security;
alter table topics enable row level security;
alter table lectures enable row level security;
alter table pyqs enable row level security;
alter table mock_tests enable row level security;
alter table mock_test_questions enable row level security;

create policy "read subjects" on subjects for select using (true);
create policy "read topics" on topics for select using (true);
create policy "read lectures" on lectures for select using (true);
create policy "read pyqs" on pyqs for select using (true);
create policy "read mock tests" on mock_tests for select using (true);
create policy "read mock test questions" on mock_test_questions for select using (true);
