import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  cash: integer("cash").notNull().default(10000),
  energy: integer("energy").notNull().default(100),
  health: integer("health").notNull().default(100),
  mood: integer("mood").notNull().default(80),
  hunger: integer("hunger").notNull().default(80),
  intelligenceExp: integer("intelligence_exp").notNull().default(0),
  programmingExp: integer("programming_exp").notNull().default(0),
  fitnessExp: integer("fitness_exp").notNull().default(0),
  workExp: integer("work_exp").notNull().default(0),
  elapsedMinutes: integer("elapsed_minutes").notNull().default(450),
  location: text("location").notNull().default("home"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
}, (table) => [index("idx_players_last_seen").on(table.lastSeenAt)]);

export const gameEvents = sqliteTable("game_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  playerName: text("player_name").notNull(),
  roomId: text("room_id").notNull().default("lobby-01"),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  tone: text("tone").notNull().default("neutral"),
  gameTime: text("game_time").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_events_room_created").on(table.roomId, table.createdAt)]);
