ALTER TABLE poker_hands ADD COLUMN table_id TEXT NOT NULL DEFAULT 'table-01';
DROP INDEX IF EXISTS idx_poker_seat;
CREATE UNIQUE INDEX idx_poker_seat ON poker_hands(table_id, seat_no);

CREATE TABLE IF NOT EXISTS casino_public_tables (
  id TEXT PRIMARY KEY, game TEXT NOT NULL, tier TEXT NOT NULL,
  big_blind INTEGER NOT NULL DEFAULT 0, min_bet INTEGER NOT NULL DEFAULT 0, max_bet INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_casino_public_game_updated ON casino_public_tables(game, updated_at);

CREATE TABLE IF NOT EXISTS casino_baccarat_state (
  table_id TEXT PRIMARY KEY, shoe TEXT NOT NULL DEFAULT '[]', round_no INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'betting', betting_ends_at INTEGER NOT NULL DEFAULT 0,
  player_cards TEXT NOT NULL DEFAULT '[]', banker_cards TEXT NOT NULL DEFAULT '[]',
  result TEXT NOT NULL DEFAULT '', action_token TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_baccarat_status_end ON casino_baccarat_state(status, betting_ends_at);

CREATE TABLE IF NOT EXISTS casino_baccarat_bets (
  table_id TEXT NOT NULL, user_id TEXT NOT NULL, round_no INTEGER NOT NULL, player_name TEXT NOT NULL,
  side TEXT NOT NULL, amount INTEGER NOT NULL, payout INTEGER NOT NULL DEFAULT 0, result TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', life_version INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
  PRIMARY KEY(table_id, user_id, round_no)
);
CREATE INDEX IF NOT EXISTS idx_baccarat_bets_round ON casino_baccarat_bets(table_id, round_no, status);

CREATE TABLE IF NOT EXISTS casino_baccarat_members (
  table_id TEXT NOT NULL, user_id TEXT NOT NULL, player_name TEXT NOT NULL, joined_at INTEGER NOT NULL,
  PRIMARY KEY(table_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_baccarat_members_table ON casino_baccarat_members(table_id);

INSERT INTO casino_public_tables (id,game,tier,big_blind,min_bet,max_bet,created_by,created_at,updated_at)
  VALUES ('table-01','poker','low',100,0,0,'system',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000)
  ON CONFLICT(id) DO NOTHING;
INSERT INTO casino_public_tables (id,game,tier,big_blind,min_bet,max_bet,created_by,created_at,updated_at)
  VALUES ('baccarat-01','baccarat','low',0,100,999,'system',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000)
  ON CONFLICT(id) DO NOTHING;
INSERT INTO poker_table_state (id,deck,community_cards,street,current_bet,turn_seat,pot,status,round_token,action_token,updated_at)
  VALUES ('table-01','[]','[]','idle',0,0,0,'idle','','',CAST(strftime('%s','now') AS INTEGER)*1000)
  ON CONFLICT(id) DO NOTHING;
INSERT INTO casino_baccarat_state (table_id,shoe,round_no,status,betting_ends_at,player_cards,banker_cards,result,action_token,updated_at)
  VALUES ('baccarat-01','[]',1,'betting',CAST(strftime('%s','now') AS INTEGER)*1000+15000,'[]','[]','','',CAST(strftime('%s','now') AS INTEGER)*1000)
  ON CONFLICT(table_id) DO NOTHING;
