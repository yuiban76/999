CREATE TABLE IF NOT EXISTS last_chips_rooms (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, host_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby', bankroll INTEGER NOT NULL DEFAULT 100000,
  debt INTEGER NOT NULL DEFAULT 250000, lowest_debt INTEGER NOT NULL DEFAULT 250000,
  elapsed_ms INTEGER NOT NULL DEFAULT 0, processed_day INTEGER NOT NULL DEFAULT 0,
  payment_made INTEGER NOT NULL DEFAULT 0, missed_periods INTEGER NOT NULL DEFAULT 0,
  chapter INTEGER NOT NULL DEFAULT 0, wallet_sync INTEGER NOT NULL DEFAULT 0,
  last_tick_at INTEGER NOT NULL DEFAULT 0, started_at INTEGER, finished_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_last_chips_host ON last_chips_rooms(host_user_id);
CREATE TABLE IF NOT EXISTS last_chips_members (
  room_id TEXT NOT NULL, user_id TEXT NOT NULL, display_name TEXT NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0, current INTEGER NOT NULL DEFAULT 1,
  total_bet INTEGER NOT NULL DEFAULT 0, net INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL, PRIMARY KEY(room_id,user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_last_chips_current_user ON last_chips_members(user_id) WHERE current=1;
CREATE TABLE IF NOT EXISTS last_chips_cash_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT NOT NULL, user_id TEXT NOT NULL,
  delta INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_last_chips_events_room ON last_chips_cash_events(room_id,id);
CREATE TRIGGER IF NOT EXISTS last_chips_cash_guard BEFORE UPDATE OF cash ON players
WHEN NEW.cash < OLD.cash AND EXISTS (
  SELECT 1 FROM last_chips_members m JOIN last_chips_rooms r ON r.id=m.room_id
  WHERE m.user_id=NEW.user_id AND m.current=1 AND r.status='active' AND r.wallet_sync=0
  AND r.bankroll < OLD.cash-NEW.cash
)
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER IF NOT EXISTS last_chips_cash_mirror AFTER UPDATE OF cash ON players
WHEN NEW.cash <> OLD.cash AND EXISTS (
  SELECT 1 FROM last_chips_members m JOIN last_chips_rooms r ON r.id=m.room_id
  WHERE m.user_id=NEW.user_id AND m.current=1 AND r.status='active' AND r.wallet_sync=0
)
BEGIN
  UPDATE last_chips_rooms SET bankroll=bankroll+NEW.cash-OLD.cash
  WHERE id=(SELECT room_id FROM last_chips_members WHERE user_id=NEW.user_id AND current=1);
  UPDATE last_chips_members SET total_bet=total_bet+MAX(0,OLD.cash-NEW.cash),
    net=net+NEW.cash-OLD.cash WHERE user_id=NEW.user_id AND current=1;
  INSERT INTO last_chips_cash_events(room_id,user_id,delta,created_at)
    SELECT room_id,NEW.user_id,NEW.cash-OLD.cash,CAST(strftime('%s','now') AS INTEGER)*1000
    FROM last_chips_members WHERE user_id=NEW.user_id AND current=1;
  UPDATE players SET cash=(SELECT bankroll FROM last_chips_rooms WHERE id=(
    SELECT room_id FROM last_chips_members WHERE user_id=NEW.user_id AND current=1))
  WHERE user_id IN (SELECT user_id FROM last_chips_members WHERE room_id=(
    SELECT room_id FROM last_chips_members WHERE user_id=NEW.user_id AND current=1) AND current=1);
END;
