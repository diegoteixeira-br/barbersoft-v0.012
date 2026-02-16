
-- Remove old cron jobs
SELECT cron.unschedule('appointment-reminders-cron');
SELECT cron.unschedule('marketing-automations-cron');

-- Recreate with hardcoded URL and service role key
SELECT cron.schedule(
  'appointment-reminders-cron',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lgrugpsyewvinlkgmeve.supabase.co/functions/v1/appointment-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncnVncHN5ZXd2aW5sa2dtZXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzUwMDIsImV4cCI6MjA4NjA1MTAwMn0.DHvyTlG1O0EyA3ajkx7dUrmJD_BmUtjFogo3NhL9b_U"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'marketing-automations-cron',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lgrugpsyewvinlkgmeve.supabase.co/functions/v1/marketing-automations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncnVncHN5ZXd2aW5sa2dtZXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzUwMDIsImV4cCI6MjA4NjA1MTAwMn0.DHvyTlG1O0EyA3ajkx7dUrmJD_BmUtjFogo3NhL9b_U"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
