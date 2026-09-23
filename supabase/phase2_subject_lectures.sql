alter table lectures add column if not exists subject_id uuid references subjects(id) on delete cascade;

update lectures
set subject_id = topics.subject_id
from topics
where lectures.topic_id = topics.id
  and lectures.subject_id is null;