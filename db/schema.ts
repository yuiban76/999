import { blob, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  dailyMinimumPayment: integer("daily_minimum_payment").notNull().default(0),
  dailyPaymentMade: integer("daily_payment_made").notNull().default(0),
  missedPaymentDays: integer("missed_payment_days").notNull().default(0),
  gameOver: text("game_over").notNull().default(""),
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

export const casinoTableState = sqliteTable("casino_table_state", {
  id: text("id").primaryKey(),
  deck: text("deck").notNull().default("[]"),
  updatedAt: integer("updated_at").notNull(),
});

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
  streetBet: integer("street_bet").notNull().default(0),
  acted: integer("acted", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_poker_status_updated").on(table.status, table.updatedAt), uniqueIndex("idx_poker_seat").on(table.seatNo)]);

export const pokerTableState = sqliteTable("poker_table_state", {
  id: text("id").primaryKey(),
  deck: text("deck").notNull().default("[]"),
  communityCards: text("community_cards").notNull().default("[]"),
  street: text("street").notNull().default("idle"),
  currentBet: integer("current_bet").notNull().default(0),
  turnSeat: integer("turn_seat").notNull().default(0),
  pot: integer("pot").notNull().default(0),
  status: text("status").notNull().default("idle"),
  updatedAt: integer("updated_at").notNull(),
});

export const playerProgress = sqliteTable("player_progress", {
  userId: text("user_id").primaryKey(),
  talentExp: integer("talent_exp").notNull().default(0),
  talents: text("talents").notNull().default("[]"),
  storyChapter: integer("story_chapter").notNull().default(0),
  lastEventDay: integer("last_event_day").notNull().default(0),
  pendingEvent: text("pending_event").notNull().default(""),
  updatedAt: integer("updated_at").notNull(),
});

export const cityMemoryContributions = sqliteTable("city_memory_contributions", {
  userId: text("user_id").notNull(),
  cycleDay: integer("cycle_day").notNull(),
  workCount: integer("work_count").notNull().default(0),
  hospitalCount: integer("hospital_count").notNull().default(0),
  housingCount: integer("housing_count").notNull().default(0),
  casinoCount: integer("casino_count").notNull().default(0),
  studyCount: integer("study_count").notNull().default(0),
  eventCount: integer("event_count").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.userId, table.cycleDay] }), index("idx_city_memory_cycle").on(table.cycleDay)]);

export const mysteryClues = sqliteTable("mystery_clues", {
  userId: text("user_id").notNull(),
  clueKey: text("clue_key").notNull(),
  foundAt: integer("found_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.clueKey] }), index("idx_mystery_clues_key").on(table.clueKey)]);

export const playerTransferRequests = sqliteTable("player_transfer_requests", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  recipientId: text("recipient_id").notNull(),
  kind: text("kind").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  outcome: text("outcome").notNull().default(""),
  resolutionToken: text("resolution_token").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  resolvedAt: integer("resolved_at"),
}, (table) => [index("idx_transfer_requests_recipient_status").on(table.recipientId, table.status, table.expiresAt)]);

export const casinoBingoState = sqliteTable("casino_bingo_state", {
  id: text("id").primaryKey(), roundNo: integer("round_no").notNull().default(1), status: text("status").notNull().default("lobby"),
  drawnNumbers: text("drawn_numbers").notNull().default("[]"), nextDrawAt: integer("next_draw_at").notNull().default(0), updatedAt: integer("updated_at").notNull(),
});

export const casinoBingoEntries = sqliteTable("casino_bingo_entries", {
  roundNo: integer("round_no").notNull(), userId: text("user_id").notNull(), playerName: text("player_name").notNull(), card: text("card").notNull(),
}, (table) => [primaryKey({ columns: [table.roundNo, table.userId] }), index("idx_bingo_entries_round").on(table.roundNo)]);

export const casinoTournamentState = sqliteTable("casino_tournament_state", {
  id: text("id").primaryKey(), roundNo: integer("round_no").notNull().default(1), currentRound: integer("current_round").notNull().default(0), game: text("game").notNull().default("blackjack"), status: text("status").notNull().default("lobby"),
  roundLimit: integer("round_limit").notNull().default(3), nextRoundAt: integer("next_round_at").notNull().default(0), latestResult: text("latest_result").notNull().default(""), updatedAt: integer("updated_at").notNull(),
});

export const casinoTournamentEntries = sqliteTable("casino_tournament_entries", {
  tournamentNo: integer("tournament_no").notNull(), userId: text("user_id").notNull(), playerName: text("player_name").notNull(), score: integer("score").notNull().default(0), latestHand: text("latest_hand").notNull().default(""),
}, (table) => [primaryKey({ columns: [table.tournamentNo, table.userId] }), index("idx_tournament_entries_round").on(table.tournamentNo)]);
