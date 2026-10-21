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
