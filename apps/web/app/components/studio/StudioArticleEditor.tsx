// A thin TipTap wrapper around the draft's claim-aware document. The body's paragraph kinds and
// source citations live in node attributes, so editing never loses the evidence links; saving just
// serialises the document back through PATCH /api/studio/articles/:id.
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ArticleDoc } from "../../../../../modules/wechathot/articles.ts";

const KINDS = ["official", "media", "unconfirmed", "author"] as const;

function toDoc(value: ArticleDoc | null | undefined): ArticleDoc {
  if (value && value.type === "doc" && Array.isArray(value.content)) return value;
  return { type: "doc", content: [] };
}

export function StudioArticleEditor({
  value,
  readOnly = false,
  onChange,
}: {
  value: ArticleDoc | null | undefined;
  readOnly?: boolean;
  onChange?: (doc: ArticleDoc) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: toDoc(value),
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) onChange(editor.getJSON() as unknown as ArticleDoc);
    },
  });

  // Keep the editor in sync when the server sends a new version (e.g. after a rewrite).
  useEffect(() => {
    if (!editor) return;
    const next = toDoc(value);
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(next)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className="rounded-control border border-line bg-surface p-3">
      <EditorContent editor={editor} className="prose prose-sm max-w-none text-[13.5px] leading-[1.9] text-ink-2" />
    </div>
  );
}

export { KINDS };
