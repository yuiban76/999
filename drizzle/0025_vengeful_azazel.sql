-- The Worker reconciles every table and column individually at runtime.
-- Production databases may already contain part of this schema, so this
-- migration only records the Drizzle snapshot and avoids duplicate DDL.
SELECT 1;
