import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CAREER_THRESHOLDS,
  CAREER_WORK_SPECIALS,
  JOB_CATEGORIES,
  RESTAURANT_DAILY_NET,
  RESTAURANT_PAYBACK_DAYS,
  RESTAURANT_PURCHASE_PRICE,
  careerPayForCategory,
  careerRequirements,
  careerThresholdForCategory,
  careerWorkWaitSeconds,
} from "../shared/jobs.ts";
import {
  PRODIGAL_DAILY_MINIMUM_PAYMENT,
  prodigalDailyInterest,
  prodigalMinimumPayment,
} from "../shared/finance.ts";

test("prodigal daily minimum repays principal and settles the final balance", () => {
  assert.equal(PRODIGAL_DAILY_MINIMUM_PAYMENT, 2_500);
  assert.equal(prodigalMinimumPayment(250_000), 2_500);
  assert.equal(prodigalMinimumPayment(2_499), 2_499);
  assert.equal(prodigalMinimumPayment(0), 0);

  let balance = 250_000;
  let days = 0;
  while (balance > 0 && days < 1_000) {
    const before = balance;
    balance -= prodigalMinimumPayment(balance);
    balance += prodigalDailyInterest(balance);
    days += 1;
    assert.ok(balance < before, `daily minimum must reduce debt on day ${days}`);
  }
  assert.equal(balance, 0);
  assert.equal(days, 112);
  assert.equal(days * 24 / 60, 44.8);
});

test("all ordinary four-rank careers use the same progression curve and pay bands", () => {
  assert.deepEqual(CAREER_THRESHOLDS, [0, 150, 400, 800]);
  const fourRankCareers = JOB_CATEGORIES.filter((category) => category.jobs.length === 4 && !["literary", "street"].includes(category.id));
  assert.ok(fourRankCareers.length > 0);
  for (const category of fourRankCareers) {
    assert.deepEqual(category.jobs.map((_, index) => careerThresholdForCategory(category.id, index)), [0, 150, 400, 800], category.id);
    assert.equal(careerPayForCategory(category.id, 3), 1_300, category.id);
  }
  assert.deepEqual(careerRequirements("office", 3), { social: 140, intelligence: 70 });
});

test("special-shift wait scales consistently with scheduled hours", () => {
  for (const [job, special] of Object.entries(CAREER_WORK_SPECIALS)) {
    const expectedMinutes = Math.max(2, Math.min(5, Math.ceil(special.hours / 2)));
    assert.equal(special.minutes, expectedMinutes, job);
    assert.equal(careerWorkWaitSeconds(job, special.hours), expectedMinutes * 60, job);
  }
  assert.equal(careerWorkWaitSeconds("任意職業", 1), 30);
  assert.equal(careerWorkWaitSeconds("任意職業", 4), 120);
  assert.equal(careerWorkWaitSeconds("任意職業", 8), 240);
});

test("restaurant remains worthwhile but takes 50 player-days to recover its cost", () => {
  assert.equal(RESTAURANT_DAILY_NET, 8_000);
  assert.equal(RESTAURANT_PAYBACK_DAYS, 50);
  assert.equal(Math.ceil(RESTAURANT_PURCHASE_PRICE / RESTAURANT_DAILY_NET), RESTAURANT_PAYBACK_DAYS);
  assert.ok(RESTAURANT_DAILY_NET < careerPayForCategory("hospitality", 3) * 8);
});

test("server settlement and bank UI use the shared balance rules", async () => {
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(worker, /prodigalMinimumPayment\(250_000\)/);
  assert.match(worker, /prodigalDailyInterest\(loanBalance, dailyLoanRateBp\)/);
  assert.match(worker, /careerWorkWaitSeconds\(next\.current_job, hours/);
  assert.match(worker, /RESTAURANT_PAYBACK_DAYS/);
  assert.match(page, /PRODIGAL_DAILY_MINIMUM_PAYMENT/);
  assert.match(page, /RESTAURANT_PAYBACK_DAYS/);
  assert.match(page, /RESTAURANT_DAILY_NET/);
});
