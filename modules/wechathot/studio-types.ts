// Shapes shared by the studio's private API and its web loaders. No backend or database imports here:
// the web bundle imports this file, while server.ts builds the same objects from wc_ rows.

export type VerificationStatus = "verified" | "user" | "pending" | "unavailable";
export type PresetKind = "writing" | "format";
export type ColumnType = "news" | "insight";

export interface BrandListItem {
  id: string;
  entityId: string | null;
  name: string;
  aliases: string[];
  website: string | null;
  logoUrl: string | null;
  industries: string[];
  verifiedStatus: VerificationStatus;
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
