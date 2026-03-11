-- Add meeting point to groups
alter table groups add column if not exists meeting_point text;
