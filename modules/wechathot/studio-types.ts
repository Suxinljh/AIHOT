// Shapes shared by the studio's private API and its web loaders. No backend or database imports here:
// the web bundle imports this file, while server.ts builds the same objects from wc_ rows.

export type VerificationStatus = "verified" | "user" | "pending" | "unavailable";
export type PresetKind = "writing" | "format";
export type ColumnType = "news" | "insight";

export type ChannelType = "official_site" | "x" | "wechat" | "weibo" | "github" | "media" | "custom";
export type ChannelProvider = "dajiala" | "socialdata" | "rsshub" | "github" | "rss";
export type ChannelVerification = "verified" | "user" | "pending" | "unavailable";
export type ChannelAvailability = "available" | "unavailable" | "unknown";
export type FollowRule = "all" | "major" | "selected" | "keywords";
export type FollowFrequency = "immediate" | "daily" | "weekly";

export interface BrandListItem {
  id: string;
  entityId: string | null;
  name: string;
  aliases: string[];
  website: string | null;
  logoUrl: string | null;
  industries: string[];
  verifiedStatus: VerificationStatus;
  followed: boolean;
}

export interface BrandChannel {
  id: string;
  type: ChannelType;
  platform: string | null;
  displayName: string;
  url: string;
  provider: ChannelProvider | null;
  sourceId: string | null;
  verification: ChannelVerification;
  availability: ChannelAvailability;
  note: string | null;
  /** The brand watches this channel. */
  followed: boolean;
  /** The channel is paused until this time; the brand's follow stays. */
  mutedUntil: string | null;
}

export interface BrandEvent {
  storyId: number;
  title: string;
  categories: string[];
  eventType: string | null;
  verificationStatus: "unverified" | "confirmed" | "disputed";
  firstReportAt: string | null;
  latestAt: string | null;
  reportCount: number;
  sourceCount: number;
  heat: number | null;
  editorialScore: number | null;
}

export interface BrandFollow {
  id: number;
  rule: FollowRule;
  keywords: string[];
  blockedKeywords: string[];
  eventTypes: string[];
  notify: boolean;
  mutedUntil: string | null;
  frequency: FollowFrequency;
}

export interface BrandDetail extends BrandListItem {
  notes: string | null;
  channels: BrandChannel[];
  events: BrandEvent[];
  follow: BrandFollow | null;
  counts: { channels: number; events: number };
  createdAt: string;
  updatedAt: string;
}

export interface BrandMergeResult {
  brand: BrandDetail;
  moved: { aliases: number; channels: number; events: number; follow: boolean };
}

export type EventScope = "curated" | "all";
/** Newly discovered, latest development, heat, topic recommendation, followed brands first. */
export type EventSort = "discovered" | "latest" | "heat" | "recommend" | "followed";
export type EventVerification = "unverified" | "confirmed" | "disputed";
export type EventManualDecision = "recommend" | "ignore" | "later" | "reported";

export interface StudioEventBrand {
  id: string;
  name: string;
  followed: boolean;
}

export interface StudioEventState {
  read: boolean;
  starred: boolean;
  ignored: boolean;
  followUp: boolean;
  manualDecision: EventManualDecision | null;
  decidedAt: string | null;
}

export interface StudioEventListItem {
  storyId: number;
  publicId: string;
  title: string;
  summary: string | null;
  categories: string[];
  brands: StudioEventBrand[];
  channelTypes: ChannelType[];
  eventType: string | null;
  verificationStatus: EventVerification;
  updated: boolean;
  firstReportAt: string | null;
  latestAt: string | null;
  primarySource: string | null;
  reportCount: number;
  sourceCount: number;
  heat: number | null;
  /** AIHOT's selection score, shown beside heat and the topic recommendation. */
  newsValue: number | null;
  /** The event-level topic recommendation (WCH-16); null until the event has been scored. */
  recommendationScore: number | null;
  recommendationReason: string | null;
  topicCount: number;
  followed: boolean;
  state: StudioEventState;
}

export interface StudioEventFacetOption {
  value: string;
  label: string;
  count: number;
}

export interface StudioEventBrandFacet {
  id: string;
  name: string;
  count: number;
}

export interface StudioEventFacets {
  industries: StudioEventFacetOption[];
  brands: StudioEventBrandFacet[];
  channels: StudioEventFacetOption[];
  eventTypes: StudioEventFacetOption[];
  sourceTiers: StudioEventFacetOption[];
}

export interface StudioEventList {
  items: StudioEventListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  scope: EventScope;
  sort: EventSort;
  facets: StudioEventFacets;
}

export interface StudioEventReport {
  id: string;
  title: string;
  summary: string | null;
  /** The original article, so the editor can open the source. */
  url: string | null;
  source: { name: string; firstParty: boolean };
  publishedAt: string;
  selected: boolean;
}

export interface StudioEventFact {
  factId: string;
  title: string;
  firstReportAt: string;
  reportCount: number;
  representative: StudioEventReport;
}

export interface StudioEventRecommendation {
  score: number;
  dims: Record<string, number>;
  reason: string | null;
  /** What the scoring could not find; a low-confidence score says so here. */
  missing: string[];
  scoredAt: string | null;
  /** The column the scoring suggests: a news brief or an insight piece. */
  column: "news" | "insight" | null;
  confidence: "high" | "medium" | "low" | null;
  /** The angles the scoring found worth writing. */
  angles: string[];
}

export interface StudioEventPitch {
  id: number;
  angle: string | null;
  status: string;
  columnType: string;
  createdAt: string;
}

export type TopicStatus = "pending" | "researching" | "ready" | "writing" | "done" | "ignored" | "archived";

export interface TopicSnapshotReport {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  tier: string | null;
  publishedAt: string;
}

export interface TopicSnapshot {
  title: string;
  summary: string | null;
  categories: string[];
  brands: string[];
  score: number | null;
  capturedAt: string;
  reports: TopicSnapshotReport[];
}

export interface TopicAngle {
  title: string;
  reason: string;
}

export interface TopicOutlineSection {
  title: string;
  points: string[];
}

export interface TopicOutline {
  sections: TopicOutlineSection[];
  note: string;
}

export interface TopicWriting {
  angles?: TopicAngle[];
  outline?: TopicOutline;
  state?: {
    step: "angles" | "outline" | "body" | "titles" | "bodySection";
    status: "pending" | "done" | "failed";
    jobId: string | null;
    error: string | null;
    at: string;
  };
}

export interface StudioTopic {
  id: number;
  storyId: number;
  /** The event's public id, for the link to the event's page. */
  publicId: string | null;
  eventTitle: string | null;
  angle: string | null;
  columnType: "news" | "insight";
  status: TopicStatus;
  notes: string | null;
  /** The evidence frozen when the topic was created. */
  snapshot: TopicSnapshot | null;
  /** The candidate angles, the outline and the state of the last writing step. */
  writing: TopicWriting | null;
  /** The day the editor plans to publish it; null means unscheduled. */
  plannedFor: string | null;
  createdAt: string;
  updatedAt: string;
  /** The preset this topic chose for itself; null means it follows its column. */
  stylePresetId: string | null;
  /** The preset that applies right now: the topic's own choice, or the column's default. */
  stylePreset: StylePreset | null;
  event: {
    publicId: string;
    title: string;
    verificationStatus: EventVerification;
    heat: number | null;
    recommendationScore: number | null;
    latestAt: string | null;
  } | null;
}

export interface StudioEventDetail {
  publicId: string;
  storyId: number;
  title: string;
  status: "active" | "watching" | "settled";
  summary: string | null;
  digest: string | null;
  digestUpdatedAt: string | null;
  excerpt: { text: string; sourceName: string } | null;
  latest: string | null;
  firstReportAt: string | null;
  latestAt: string | null;
  reportCount: number;
  sourceCount: number;
  primarySource: string | null;
  categories: string[];
  brands: StudioEventBrand[];
  channelTypes: ChannelType[];
  sourceTiers: string[];
  eventType: string | null;
  verificationStatus: EventVerification;
  updated: boolean;
  heat: number | null;
  newsValue: number | null;
  recommendation: StudioEventRecommendation | null;
  facts: StudioEventFact[];
  timeline: StudioEventReport[];
  officialReports: StudioEventReport[];
  heatSeries: Array<{ hour: string; heat: number; participants: number }>;
  whyHot: {
    participants48h: number;
    newParticipants6h: number;
    recentReports24h: number;
    observationComplete: boolean;
    rank: number | null;
  };
  state: StudioEventState;
  pitches: StudioEventPitch[];
  pitchCount: number;
  followed: boolean;
  /** The public id the editor asked for when it has been merged into this event. */
  mergedFrom: string | null;
}

export interface ArticleFormat {
  title: {
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    marginBottom: number;
    color: string;
    align: "left" | "center";
  };
  body: {
    fontSize: number;
    lineHeight: number;
    color: string;
    letterSpacing: number;
    paragraphSpacing: number;
    align: "left" | "justify";
  };
  heading: {
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    marginTop: number;
    marginBottom: number;
    color: string;
  };
  quote: {
    fontSize: number;
    lineHeight: number;
    color: string;
    background: string;
    borderColor: string;
    padding: number;
  };
  image: { width: string; borderRadius: number };
  link: { color: string };
}

export interface StylePreset {
  id: string;
  kind: PresetKind;
  name: string;
  columnType: ColumnType | null;
  targetReader: string | null;
  wordCount: number | null;
  tone: string | null;
  titlePreference: string | null;
  forbiddenExpressions: string[];
  format: Record<string, unknown>;
  builtin: boolean;
}

export interface StudioPresets {
  writing: StylePreset[];
  format: StylePreset[];
}
