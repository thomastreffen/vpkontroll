-- Bytt til Pro-plan -> alle 3 moduler skal reaktiveres
UPDATE tenant_subscriptions
SET plan_id = 'a6e9817e-0f39-40ca-beca-76334829e154'
WHERE id = '6187e55b-bc18-4e45-9ee6-06538e52c58c';

-- Slett test-subscription etterpå (vi beholder modulene aktive)
DELETE FROM tenant_subscriptions WHERE id = '6187e55b-bc18-4e45-9ee6-06538e52c58c';