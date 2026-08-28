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
  writerFans: integer("writer_fans").notNull().default(0),
  writerDay: integer("writer_day").notNull().default(0),
  writerWrites: integer("writer_writes").notNull().default(0),
  ownsRestaurant: integer("owns_restaurant", { mode: "boolean" }).notNull().default(false),
  prisonUntil: integer("prison_until").notNull().default(0),
  prisonCrime: text("prison_crime").notNull().default(""),
  territoryLocation: text("territory_location").notNull().default(""),
  territoryDay: integer("territory_day").notNull().default(0),
  territoryPayoutDay: integer("territory_payout_day").notNull().default(0),
  territoryVisits: integer("territory_visits").notNull().default(0),
  territoryIncome: integer("territory_income").notNull().default(0),
  territoryPending: integer("territory_pending").notNull().default(0),
  hackDay: integer("hack_day").notNull().default(0),
  hackUses: integer("hack_uses").notNull().default(0),
  streetDay: integer("street_day").notNull().default(0),
  streetScavenges: integer("street_scavenges").notNull().default(0),
  streetBegIncome: integer("street_beg_income").notNull().default(0),
  gameOver: text("game_over").notNull().default(""),
  mainStory: text("main_story").notNull().default("legacy"),
  energy: integer("energy").notNull().default(100),
  health: integer("health").notNull().default(100),
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
  elapsedRemainderMs: integer("elapsed_remainder_ms").notNull().default(0),
  location: text("location").notNull().default("realtor"),
  lifeVersion: integer("life_version").notNull().default(0),
  resetGameOver: text("reset_game_over").notNull().default(""),
  mutationToken: text("mutation_token").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
}, (table) => [index("idx_players_last_seen").on(table.lastSeenAt)]);

export const territoryVisitLog = sqliteTable("territory_visit_log", {
  ownerId: text("owner_id").notNull(),
  visitorId: text("visitor_id").notNull(),
  cycleDay: integer("cycle_day").notNull(),
  lastVisitMinute: integer("last_visit_minute").notNull(),
  actionToken: text("action_token").notNull().default(""),
}, (table) => [
  primaryKey({ columns: [table.ownerId, table.visitorId, table.cycleDay] }),
  index("idx_territory_visit_owner_day").on(table.ownerId, table.cycleDay),
]);

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
  lifeVersion: integer("life_version").notNull().default(0),
  dealToken: text("deal_token").notNull().default(""),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_casino_status_updated").on(table.status, table.updatedAt), uniqueIndex("idx_casino_seat").on(table.seatNo)]);

export const casinoTableState = sqliteTable("casino_table_state", {
  id: text("id").primaryKey(),
  deck: text("deck").notNull().default("[]"),
  roundToken: text("round_token").notNull().default(""),
  actionToken: text("action_token").notNull().default(""),
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
  lifeVersion: integer("life_version").notNull().default(0),
  roundToken: text("round_token").notNull().default(""),
  actionToken: text("action_token").notNull().default(""),
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
  roundToken: text("round_token").notNull().default(""),
  actionToken: text("action_token").notNull().default(""),
  updatedAt: integer("updated_at").notNull(),
});

export const playerProgress = sqliteTable("player_progress", {
  userId: text("user_id").primaryKey(),
  talentExp: integer("talent_exp").notNull().default(0),
  talents: text("talents").notNull().default("[]"),
  storyChapter: integer("story_chapter").notNull().default(0),
  storySeenChapter: integer("story_seen_chapter").notNull().default(0),
  lastEventDay: integer("last_event_day").notNull().default(0),
  pendingEvent: text("pending_event").notNull().default(""),
  updatedAt: integer("updated_at").notNull(),
});

export const playerInventory = sqliteTable("player_inventory", {
  userId: text("user_id").notNull(),
  itemKey: text("item_key").notNull(),
  quantity: integer("quantity").notNull().default(0),
  lifeVersion: integer("life_version").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.itemKey] }), index("idx_inventory_user_life").on(table.userId, table.lifeVersion)]);

export const streetBegRequests = sqliteTable("street_beg_requests", {
  id: text("id").primaryKey(), requesterId: text("requester_id").notNull(), requesterName: text("requester_name").notNull(),
  recipientId: text("recipient_id").notNull(), requesterJob: text("requester_job").notNull(), requesterLifeVersion: integer("requester_life_version").notNull().default(0),
  recipientLifeVersion: integer("recipient_life_version").notNull().default(0), status: text("status").notNull().default("pending"),
  outcome: text("outcome").notNull().default(""), amount: integer("amount").notNull().default(0), resolutionToken: text("resolution_token").notNull().default(""),
  createdAt: integer("created_at").notNull(), expiresAt: integer("expires_at").notNull(), resolvedAt: integer("resolved_at"),
}, (table) => [index("idx_beg_recipient_status").on(table.recipientId, table.status, table.expiresAt), index("idx_beg_pair_created").on(table.requesterId, table.recipientId, table.createdAt)]);

export const streetAidBoxes = sqliteTable("street_aid_boxes", {
  ownerId: text("owner_id").notNull(), cycleDay: integer("cycle_day").notNull(), ownerName: text("owner_name").notNull(),
  ownerLifeVersion: integer("owner_life_version").notNull().default(0), totalReceived: integer("total_received").notNull().default(0),
  status: text("status").notNull().default("active"), updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.ownerId, table.cycleDay] }), index("idx_aid_boxes_day_status").on(table.cycleDay, table.status)]);

export const streetAidDonations = sqliteTable("street_aid_donations", {
  ownerId: text("owner_id").notNull(), cycleDay: integer("cycle_day").notNull(), donorId: text("donor_id").notNull(),
  amount: integer("amount").notNull(), actionToken: text("action_token").notNull().default(""), donatedAt: integer("donated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.ownerId, table.cycleDay, table.donorId] }), index("idx_aid_donations_donor_day").on(table.donorId, table.cycleDay)]);

export const cityCoopProjects = sqliteTable("city_coop_projects", {
  cycleDay: integer("cycle_day").primaryKey(), status: text("status").notNull().default("open"), completedAt: integer("completed_at"),
  completionToken: text("completion_token").notNull().default(""), updatedAt: integer("updated_at").notNull(),
});

export const cityCoopContributions = sqliteTable("city_coop_contributions", {
  cycleDay: integer("cycle_day").notNull(), role: text("role").notNull(), userId: text("user_id").notNull(), playerName: text("player_name").notNull(),
  jobCategory: text("job_category").notNull(), lifeVersion: integer("life_version").notNull().default(0), contributedAt: integer("contributed_at").notNull(),
}, (table) => [primaryKey({ columns: [table.cycleDay, table.role] }), uniqueIndex("idx_coop_user_day").on(table.cycleDay, table.userId)]);

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

export const playerReputation = sqliteTable("player_reputation", {
  userId: text("user_id").notNull(),
  faction: text("faction").notNull(),
  points: integer("points").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.faction] }), index("idx_reputation_user_points").on(table.userId, table.points)]);

export const cityCommissionClaims = sqliteTable("city_commission_claims", {
  userId: text("user_id").notNull(),
  cycleDay: integer("cycle_day").notNull(),
  commissionId: text("commission_id").notNull(),
  lifeVersion: integer("life_version").notNull().default(0),
  completedAt: integer("completed_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.cycleDay, table.commissionId] }), index("idx_commission_claim_day").on(table.cycleDay, table.commissionId)]);

export const lifeContracts = sqliteTable("life_contracts", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(), creatorName: text("creator_name").notNull(), creatorLifeVersion: integer("creator_life_version").notNull().default(0),
  partnerId: text("partner_id").notNull(), partnerName: text("partner_name").notNull(), partnerLifeVersion: integer("partner_life_version").notNull().default(0),
  targetPerPlayer: integer("target_per_player").notNull().default(1000), stake: integer("stake").notNull().default(200),
  creatorDeposit: integer("creator_deposit").notNull().default(0), partnerDeposit: integer("partner_deposit").notNull().default(0),
  status: text("status").notNull().default("pending"), expiresDay: integer("expires_day").notNull(),
  resolutionToken: text("resolution_token").notNull().default(""), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_contract_member_status").on(table.creatorId, table.status), index("idx_contract_partner_status").on(table.partnerId, table.status)]);

export const playerTransferRequests = sqliteTable("player_transfer_requests", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  recipientId: text("recipient_id").notNull(),
  kind: text("kind").notNull(),
  amount: integer("amount").notNull(),
  senderLifeVersion: integer("sender_life_version").notNull().default(0),
  recipientLifeVersion: integer("recipient_life_version").notNull().default(0),
  status: text("status").notNull().default("pending"),
  outcome: text("outcome").notNull().default(""),
  resolutionToken: text("resolution_token").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  resolvedAt: integer("resolved_at"),
}, (table) => [index("idx_transfer_requests_recipient_status").on(table.recipientId, table.status, table.expiresAt)]);

export const playerMedicalRequests = sqliteTable("player_medical_requests", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  patientName: text("patient_name").notNull(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  providerJob: text("provider_job").notNull(),
  healthGain: integer("health_gain").notNull(),
  amount: integer("amount").notNull(),
  patientLifeVersion: integer("patient_life_version").notNull().default(0),
  providerLifeVersion: integer("provider_life_version").notNull().default(0),
  status: text("status").notNull().default("pending"),
  outcome: text("outcome").notNull().default(""),
  resolutionToken: text("resolution_token").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  resolvedAt: integer("resolved_at"),
}, (table) => [index("idx_medical_requests_provider_status").on(table.providerId, table.status, table.expiresAt)]);

export const playerLoanRequests = sqliteTable("player_loan_requests", {
  id: text("id").primaryKey(),
  borrowerId: text("borrower_id").notNull(),
  borrowerName: text("borrower_name").notNull(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  providerJob: text("provider_job").notNull(),
  amount: integer("amount").notNull(),
  interestRateBp: integer("interest_rate_bp").notNull(),
  spreadBp: integer("spread_bp").notNull(),
  borrowerLifeVersion: integer("borrower_life_version").notNull().default(0),
  providerLifeVersion: integer("provider_life_version").notNull().default(0),
  status: text("status").notNull().default("pending"),
  outcome: text("outcome").notNull().default(""),
  resolutionToken: text("resolution_token").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  resolvedAt: integer("resolved_at"),
}, (table) => [index("idx_loan_requests_provider_status").on(table.providerId, table.status, table.expiresAt), index("idx_loan_requests_borrower_status").on(table.borrowerId, table.status, table.expiresAt)]);

export const playerLoanContracts = sqliteTable("player_loan_contracts", {
  id: text("id").primaryKey(),
  borrowerId: text("borrower_id").notNull(),
  borrowerName: text("borrower_name").notNull(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  providerJob: text("provider_job").notNull(),
  principalAmount: integer("principal_amount").notNull(),
  outstandingBalance: integer("outstanding_balance").notNull(),
  interestRateBp: integer("interest_rate_bp").notNull(),
  spreadBp: integer("spread_bp").notNull(),
  borrowerLifeVersion: integer("borrower_life_version").notNull().default(0),
  providerLifeVersion: integer("provider_life_version").notNull().default(0),
  revision: integer("revision").notNull().default(0),
  mutationToken: text("mutation_token").notNull().default(""),
  status: text("status").notNull().default("active"),
  openedAt: integer("opened_at").notNull(),
  closedAt: integer("closed_at"),
}, (table) => [index("idx_loan_contracts_borrower_status").on(table.borrowerId, table.status), index("idx_loan_contracts_provider_status").on(table.providerId, table.status)]);

export const writerBooks = sqliteTable("writer_books", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorLifeVersion: integer("author_life_version").notNull().default(0),
  title: text("title").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_writer_books_author_status").on(table.authorId, table.status), index("idx_writer_books_status_updated").on(table.status, table.updatedAt)]);

export const writerBookPurchases = sqliteTable("writer_book_purchases", {
  bookId: text("book_id").notNull(),
  buyerId: text("buyer_id").notNull(),
  authorId: text("author_id").notNull(),
  buyerLifeVersion: integer("buyer_life_version").notNull().default(0),
  authorLifeVersion: integer("author_life_version").notNull().default(0),
  quantity: integer("quantity").notNull().default(0),
  purchaseToken: text("purchase_token").notNull().default(""),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.bookId, table.buyerId] }), index("idx_writer_purchases_buyer").on(table.buyerId, table.updatedAt), index("idx_writer_purchases_author").on(table.authorId, table.updatedAt)]);

export const casinoBingoState = sqliteTable("casino_bingo_state", {
  id: text("id").primaryKey(), roundNo: integer("round_no").notNull().default(1), status: text("status").notNull().default("lobby"),
  hostUserId: text("host_user_id").notNull().default(""), entryFee: integer("entry_fee").notNull().default(100), drawnNumbers: text("drawn_numbers").notNull().default("[]"), nextDrawAt: integer("next_draw_at").notNull().default(0), updatedAt: integer("updated_at").notNull(),
});

export const casinoBingoEntries = sqliteTable("casino_bingo_entries", {
  roundNo: integer("round_no").notNull(), userId: text("user_id").notNull(), playerName: text("player_name").notNull(), card: text("card").notNull(), lifeVersion: integer("life_version").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.roundNo, table.userId] }), index("idx_bingo_entries_round").on(table.roundNo)]);

export const casinoTournamentState = sqliteTable("casino_tournament_state", {
  id: text("id").primaryKey(), roundNo: integer("round_no").notNull().default(1), currentRound: integer("current_round").notNull().default(0), game: text("game").notNull().default("blackjack"), status: text("status").notNull().default("lobby"),
  hostUserId: text("host_user_id").notNull().default(""), entryFee: integer("entry_fee").notNull().default(500), roundLimit: integer("round_limit").notNull().default(5), nextRoundAt: integer("next_round_at").notNull().default(0), latestResult: text("latest_result").notNull().default(""), updatedAt: integer("updated_at").notNull(),
});

export const casinoTournamentEntries = sqliteTable("casino_tournament_entries", {
  tournamentNo: integer("tournament_no").notNull(), userId: text("user_id").notNull(), playerName: text("player_name").notNull(), score: integer("score").notNull().default(0), latestHand: text("latest_hand").notNull().default(""),
  lifeVersion: integer("life_version").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.tournamentNo, table.userId] }), index("idx_tournament_entries_round").on(table.tournamentNo)]);

export const casinoTournamentRounds = sqliteTable("casino_tournament_rounds", {
  tournamentNo: integer("tournament_no").notNull(), roundNo: integer("round_no").notNull(), game: text("game").notNull().default("blackjack"), status: text("status").notNull().default("playing"),
  deck: text("deck").notNull().default("[]"), dealerCards: text("dealer_cards").notNull().default("[]"), communityCards: text("community_cards").notNull().default("[]"),
  street: text("street").notNull().default("idle"), currentBet: integer("current_bet").notNull().default(0), turnSeat: integer("turn_seat").notNull().default(0), pot: integer("pot").notNull().default(0),
  nextActionAt: integer("next_action_at").notNull().default(0), actionToken: text("action_token").notNull().default(""), updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.tournamentNo, table.roundNo] }), index("idx_tournament_round_status").on(table.tournamentNo, table.status)]);

export const casinoTournamentHands = sqliteTable("casino_tournament_hands", {
  tournamentNo: integer("tournament_no").notNull(), roundNo: integer("round_no").notNull(), userId: text("user_id").notNull(), playerName: text("player_name").notNull(), seatNo: integer("seat_no").notNull(),
  playerCards: text("player_cards").notNull().default("[]"), holeCards: text("hole_cards").notNull().default("[]"), bet: integer("bet").notNull().default(0), streetBet: integer("street_bet").notNull().default(0),
  stack: integer("stack").notNull().default(100), status: text("status").notNull().default("playing"), acted: integer("acted", { mode: "boolean" }).notNull().default(false), result: text("result").notNull().default(""),
  lifeVersion: integer("life_version").notNull().default(0), actionToken: text("action_token").notNull().default(""), updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.tournamentNo, table.roundNo, table.userId] }), index("idx_tournament_hands_round").on(table.tournamentNo, table.roundNo, table.seatNo)]);
