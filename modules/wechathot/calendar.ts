// The publishing calendar: topics and drafts the editor has scheduled for a month. It only reads the
// plan — publishing to 公众号 stays manual.
import { sql } from "@aihot/backend/db";
import { articleDetail, type StudioArticle } from "./articles.ts";
import { topicDetail } from "./topics.ts";
import type { StudioTopic } from "./studio-types.ts";

export interface StudioCalendar {
  month: string;
  /** Beijing-time day keys that carry at least one planned item. */
  topics: StudioTopic[];
  articles: StudioArticle[];
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export class CalendarRejected extends Error {
  readonly statusCode = 400;
  readonly code = "invalid_request";
}

/** [start, next month) in Beijing time, as UTC instants. */
function monthRange(month: string): { start: Date; next: Date } {
  if (!MONTH.test(month)) throw new CalendarRejected("month 必须是 YYYY-MM");
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const start = new Date(Date.UTC(year, monthNumber - 1, 1, -8));
  const next = new Date(Date.UTC(monthNumber === 12 ? year + 1 : year, monthNumber === 12 ? 0 : monthNumber, 1, -8));
  return { start, next };
}

export function currentMonth(now = new Date()): string {
  const beijing = new Date(now.getTime() + 8 * 3600_000);
  return `${beijing.getUTCFullYear()}-${String(beijing.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function loadCalendar(month: string): Promise<StudioCalendar> {
  const { start, next } = monthRange(month);
  const [topics, articles] = await Promise.all([
    sql<{ id: number }[]>`SELECT id FROM wc_topics WHERE planned_for >= ${start} AND planned_for < ${next} ORDER BY planned_for, id`,
    sql<{ id: number }[]>`SELECT id FROM wc_articles WHERE planned_for >= ${start} AND planned_for < ${next} ORDER BY planned_for, id`,
  ]);
  const [topicDetails, articleDetails] = await Promise.all([
    Promise.all(topics.map((row) => topicDetail(Number(row.id)))),
    Promise.all(articles.map((row) => articleDetail(Number(row.id)))),
  ]);
  return {
    month,
    topics: topicDetails.filter((topic): topic is StudioTopic => topic !== null),
    articles: articleDetails.filter((article): article is StudioArticle => article !== null),
  };
}
