-- =============================================================================
-- Class In-charge assignment + privacy-preserving Fee Follow-up (ADDITIVE ONLY)
--
--  * Creates NEW tables only. No existing table, column, constraint, function,
--    policy, fee record or payment record is altered, migrated or deleted.
--  * Nothing here reads or writes fee amounts: the follow-up engine (edge function
--    `followup-api`) only SELECTs from the existing fee ledger.
--  * Row Level Security is ENABLED and FORCED on every new table with NO policies,
--    exactly like app.users / app.students / app.sessions: anon and authenticated
--    keys can read or write nothing. Only the service-role edge function can, and it
--    enforces who may see what (class-scoped for in-charge teachers).
--  * Safe to re-run (IF NOT EXISTS everywhere).  NOT applied automatically.
--
-- Class codes use the same values as app.student_enrollments.class
-- ('Nursery','LKG','UKG','1'..'10'); no class list is hard-coded in the database.
-- =============================================================================

-- ---- 1. Class in-charge assignments (a row per assignment; ended rows = history) ----
create table if not exists app.class_incharge (
  id           bigserial primary key,
  class_code   text        not null,
  user_id      bigint      not null references app.users(id),
  user_name    text        not null,                 -- snapshot for history
  is_primary   boolean     not null default true,
  active       boolean     not null default true,
  assigned_by  text        not null,
  assigned_at  timestamptz not null default now(),
  note         text,
  ended_by     text,
  ended_at     timestamptz,
  end_reason   text,
  constraint class_incharge_state_ck
    check ((active and ended_at is null) or (not active and ended_at is not null))
);
-- at most ONE active primary in-charge per class, and one active class per teacher
create unique index if not exists uq_class_incharge_active_primary
  on app.class_incharge (class_code) where active and is_primary;
create unique index if not exists uq_class_incharge_active_user
  on app.class_incharge (user_id) where active;
create index if not exists ix_class_incharge_class on app.class_incharge (class_code, assigned_at desc);

-- ---- 2. Policy / collection calendar (key -> json value) ----
create table if not exists app.fu_settings (
  key        text primary key,
  value      jsonb       not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- ---- 3. Administrator-set temporary follow-up holds ----
create table if not exists app.fu_holds (
  id           bigserial primary key,
  student_uuid uuid        not null,
  hold_until   date        not null,
  reason       text        not null,
  active       boolean     not null default true,
  set_by       text        not null,
  set_at       timestamptz not null default now(),
  cleared_by   text,
  cleared_at   timestamptz
);
create index if not exists ix_fu_holds_student on app.fu_holds (student_uuid) where active;

-- ---- 4. Administrator overrides of a recommendation (reason mandatory) ----
create table if not exists app.fu_overrides (
  id           bigserial primary key,
  student_uuid uuid        not null,
  action       text        not null,                 -- NONE | FOLLOW_UP | PRIORITY_FOLLOW_UP | REVIEW_LATER | REFER_ADMIN
  teacher_note text,                                 -- optional short note shown to the teacher (no amounts)
  reason       text        not null,                 -- internal reason (admin only)
  expires_on   date,
  active       boolean     not null default true,
  set_by       text        not null,
  set_at       timestamptz not null default now(),
  cleared_by   text,
  cleared_at   timestamptz
);
create index if not exists ix_fu_overrides_student on app.fu_overrides (student_uuid) where active;

-- ---- 5. Teacher follow-up log (contacts, responses, promises, referrals) ----
create table if not exists app.fu_contacts (
  id            bigserial primary key,
  student_uuid  uuid        not null,
  class_code    text        not null,
  academic_year text        not null,
  contacted_on  date        not null,
  outcome       text        not null,                -- REACHED | NO_ANSWER | PROMISED | REFUSED | WRONG_NUMBER | OTHER | REFERRED
  response      text,
  promised_on   date,
  remark        text,
  referred      boolean     not null default false,
  created_by    text        not null,
  created_by_id bigint,
  created_at    timestamptz not null default now()
);
create index if not exists ix_fu_contacts_student on app.fu_contacts (student_uuid, created_at desc);
create index if not exists ix_fu_contacts_class   on app.fu_contacts (class_code, created_at desc);

-- ---- 6. Restriction workflow (always an explicit administrator decision) ----
create table if not exists app.fu_restrictions (
  id           bigserial primary key,
  student_uuid uuid        not null,
  class_code   text        not null,
  scope        text[]      not null,                 -- classes | games | exams | tests (labels only)
  status       text        not null default 'proposed',  -- proposed | authorised | rejected | lifted
  reason       text        not null,
  proposed_by  text        not null,
  proposed_at  timestamptz not null default now(),
  decided_by   text,
  decided_at   timestamptz,
  decision_reason text,
  constraint fu_restrictions_status_ck check (status in ('proposed','authorised','rejected','lifted'))
);
create index if not exists ix_fu_restrictions_student on app.fu_restrictions (student_uuid, proposed_at desc);

-- ---- Lock down: RLS on + forced, no policies, no direct grants to API roles ----
do $$
declare t text;
begin
  foreach t in array array['class_incharge','fu_settings','fu_holds','fu_overrides','fu_contacts','fu_restrictions'] loop
    execute format('alter table app.%I enable row level security', t);
    execute format('alter table app.%I force row level security', t);
    execute format('revoke all on app.%I from anon, authenticated', t);
  end loop;
end $$;
revoke all on sequence app.class_incharge_id_seq, app.fu_holds_id_seq, app.fu_overrides_id_seq,
  app.fu_contacts_id_seq, app.fu_restrictions_id_seq from anon, authenticated;

-- Default policy (editable by administrators in the portal). Insert-only, never overwrites.
insert into app.fu_settings(key, value, updated_by) values
 ('policy', jsonb_build_object(
    'bands', jsonb_build_array(
       jsonb_build_object('name','Nursery to UKG','from','Nursery','to','UKG','amount',2000),
       jsonb_build_object('name','Grades 1-5','from','1','to','5','amount',3000),
       jsonb_build_object('name','Grades 6-8','from','6','to','8','amount',3500),
       jsonb_build_object('name','Grades 9-10','from','9','to','10','amount',4000)),
    'reviewDays', 30,
    'holdMonths', 1,
    'substantialMultiple', 5,
    'lowBalanceMultiple', 6,
    'priorityFeeTypes', jsonb_build_array('STUDY_MAT','MISC'),
    'deferrableFeeTypes', jsonb_build_array('TUITION','OLD_DUE','TRANSPORT'),
    'calendar', jsonb_build_object('pushMonth',2,'targetMonth',3,'yearEndMonth',4),
    'recontactDays', 30), 'migration')
on conflict (key) do nothing;
