import { blob, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  avatarKey: text("avatar_key"),
  avatarData: blob("avatar_data", { mode: "buffer" }),
  avatarContentType: text("avatar_content_type"),
  avatarUpdatedAt: integer("avatar_updated_at"),
  createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("idx_accounts_email").on(table.email)]);

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_sessions_user").on(table.userId), index("idx_sessions_expires").on(table.expiresAt)]);

export const players = sqliteTable("players", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  cash: integer("cash").notNull().default(10000),
  bankBalance: integer("bank_balance").notNull().default(0),
  loanBalance: integer("loan_balance").notNull().default(0),
  financeDay: integer("finance_day").notNull().default(0),
  mainStory: text("main_story").notNull().default("legacy"),
  energy: integer("energy").notNull().default(100),
  health: integer("health").notNull().default(100),
  mood: integer("mood").notNull().default(80),
  hunger: integer("hunger").notNull().default(80),
  intelligenceExp: integer("intelligence_exp").notNull().default(0),
  creativityExp: integer("programming_exp").notNull().default(0),
  physicalExp: integer("fitness_exp").notNull().default(0),
  socialExp: integer("work_exp").notNull().default(0),
  charismaExp: integer("charisma_exp").notNull().default(0),
  currentJob: text("current_job").notNull().default("unemployed"),
  jobCategory: text("job_category").notNull().default("unfixed"),
  jobExp: integer("job_exp").notNull().default(0),
  illness: text("illness").notNull().default(""),
  ownsHome: integer("owns_home", { mode: "boolean" }).notNull().default(false),
  rentalName: text("rental_name").notNull().default(""),
  rentedUntil: integer("rented_until").notNull().default(0),
  actionAvailableAt: integer("action_available_at").notNull().default(0),
  actionLabel: text("action_label").notNull().default(""),
  elapsedMinutes: integer("elapsed_minutes").notNull().default(450),
  location: text("location").notNull().default("realtor"),
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

export const casinoHands = sqliteTable("casino_hands", {
  userId: text("user_id").primaryKey(),
  playerName: text("player_name").notNull(),
  playerCards: text("player_cards").notNull().default("[]"),
  dealerCards: text("dealer_cards").notNull().default("[]"),
  bet: integer("bet").notNull().default(0),
  status: text("status").notNull().default("idle"),
  result: text("result").notNull().default(""),
  seatNo: integer("seat_no"),
  revealAt: integer("reveal_at").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_casino_status_updated").on(table.status, table.updatedAt), uniqueIndex("idx_casino_seat").on(table.seatNo)]);

export const pokerHands = sqliteTable("poker_hands", {
  userId: text("user_id").primaryKey(),
  playerName: text("player_name").notNull(),
  holeCards: text("hole_cards").notNull().default("[]"),
  communityCards: text("community_cards").notNull().default("[]"),
  bet: integer("bet").notNull().default(0),
  status: text("status").notNull().default("idle"),
  result: text("result").notNull().default(""),
  seatNo: integer("seat_no"),
  revealAt: integer("reveal_at").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_poker_status_updated").on(table.status, table.updatedAt), uniqueIndex("idx_poker_seat").on(table.seatNo)]);
