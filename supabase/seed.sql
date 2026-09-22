insert into subjects (branch, name, order_index) values
('CS', 'Engineering Mathematics', 1),
('CS', 'Digital Logic', 2),
('CS', 'Computer Organization & Architecture', 3),
('CS', 'Programming & Data Structures', 4),
('CS', 'Algorithms', 5),
('CS', 'Theory of Computation', 6),
('CS', 'Compiler Design', 7),
('CS', 'Operating Systems', 8),
('CS', 'Databases', 9),
('CS', 'Computer Networks', 10),
('DA', 'Linear Algebra', 1),
('DA', 'Probability & Statistics', 2),
('DA', 'Calculus', 3),
('DA', 'Programming & Data Structures', 4),
('DA', 'Database Management & Warehousing', 5),
('DA', 'Machine Learning', 6),
('DA', 'Artificial Intelligence', 7);

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Discrete Mathematics', 1), ('Linear Algebra', 2), ('Calculus', 3), ('Probability', 4)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Engineering Mathematics';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Boolean Algebra', 1), ('Combinational Circuits', 2), ('Sequential Circuits', 3), ('Number Systems', 4)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Digital Logic';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Machine Instructions', 1), ('Pipelining', 2), ('Memory Hierarchy', 3), ('I/O Interfacing', 4)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Computer Organization & Architecture';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Arrays & Strings', 1), ('Linked Lists', 2), ('Stacks & Queues', 3),
    ('Trees', 4), ('Graphs', 5), ('Hashing', 6), ('Recursion', 7)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Programming & Data Structures';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Asymptotic Analysis', 1), ('Sorting', 2), ('Searching', 3),
    ('Greedy', 4), ('Dynamic Programming', 5), ('Graph Algorithms', 6), ('Divide & Conquer', 7)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Algorithms';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Finite Automata', 1), ('Regular Languages', 2), ('Context-Free Grammars', 3), ('Turing Machines', 4)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Theory of Computation';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Lexical Analysis', 1), ('Parsing', 2), ('Syntax Directed Translation', 3), ('Code Optimization', 4)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Compiler Design';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Process Management', 1), ('CPU Scheduling', 2), ('Synchronization', 3),
    ('Deadlocks', 4), ('Memory Management', 5), ('File Systems', 6)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Operating Systems';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('ER Model', 1), ('Relational Algebra', 2), ('SQL', 3), ('Normalization', 4), ('Transactions', 5), ('Indexing', 6)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Databases';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('OSI & TCP/IP', 1), ('Routing', 2), ('Congestion Control', 3), ('Application Layer Protocols', 4)
) as t(name, order_index)
where s.branch = 'CS' and s.name = 'Computer Networks';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Matrices', 1), ('Eigenvalues & Eigenvectors', 2), ('Vector Spaces', 3)
) as t(name, order_index)
where s.branch = 'DA' and s.name = 'Linear Algebra';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Probability Basics', 1), ('Distributions', 2), ('Hypothesis Testing', 3), ('Regression', 4)
) as t(name, order_index)
where s.branch = 'DA' and s.name = 'Probability & Statistics';

insert into topics (subject_id, name, order_index)
select id, t.name, t.order_index
from subjects s
cross join lateral (
  values
    ('Machine Learning Basics', 1), ('Supervised Learning', 2), ('Unsupervised Learning', 3), ('Model Evaluation', 4)
) as t(name, order_index)
where s.branch = 'DA' and s.name = 'Machine Learning';