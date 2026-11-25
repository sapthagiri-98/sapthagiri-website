-- Additive: lets the edge function's service_role use the identity sequences of the new follow-up tables.
-- Already applied to production as migration "followup_sequence_grants". anon/authenticated stay denied.
grant usage, select on sequence
  app.class_incharge_id_seq, app.fu_holds_id_seq, app.fu_overrides_id_seq,
  app.fu_contacts_id_seq, app.fu_restrictions_id_seq
to service_role;
