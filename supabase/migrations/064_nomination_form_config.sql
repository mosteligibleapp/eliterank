-- Per-competition customization of the public nomination form.
-- NULL means use built-in defaults defined in src/utils/nominationFormDefaults.js.

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS nomination_form_config JSONB;

COMMENT ON COLUMN competitions.nomination_form_config IS
  'Host-edited nomination form config. When NULL, defaults apply. Shape: {
    fields: { instagram: {enabled, required}, reason: {enabled, required} },
    eligibility_questions: [{ id, label, enabled, required }],
    custom_questions: [{ id, label, type, required, options, help_text }]
  } where type is one of short_text|long_text|select|yes_no|checkbox.';
