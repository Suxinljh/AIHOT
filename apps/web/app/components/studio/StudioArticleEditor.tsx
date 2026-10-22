// A thin TipTap wrapper around the draft's claim-aware document, with the small toolbar the 公众号
// workflow needs: bold/italic, headings, lists, quotes and images. Images are uploaded to the studio's
// own disk and inserted as a normal <img>; the WeChat serializer caps them to the body width.
import { useRef, useState, useEffect } from "react";
import { useRouteLoaderData } from "react-router";
import type { AdminMe } from "@aihot/contracts/admin";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import type { ArticleDoc } from "../../../../../modules/wechathot/articles.ts";

const KINDS = ["official", "media", "unconfirmed", "author"] as const;

function toDoc(value: ArticleDoc | null | undefined): ArticleDoc {
  if (value && value.type === "doc" && Array.isArray(value.content)) return value;
  return { type: "doc", content: [] };
}

function ToolButton({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-control px-2 py-1 text-[12px] transition-colors ${active ? "bg-ink text-bg" : "bg-surface text-ink-2 ring-1 ring-line hover:bg-bg-sunk"} disabled:opacity-40`}
    >
      {children}
    </button>
  );
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
  const me = (useRouteLoaderData("studio-layout") as { me: AdminMe } | undefined)?.me;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ inline: false, allowBase64: false })],
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

  async function upload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("读取图片失败"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/studio/uploads", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "x-csrf-token": me?.csrf ?? "" },
        body: JSON.stringify({ contentType: file.type, data }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; detail?: string };
      if (!res.ok || !json.url) throw new Error(json.detail ?? `上传失败（${res.status}）`);
      editor?.chain().focus().setImage({ src: json.url, alt: file.name }).run();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-control border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
        <ToolButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>加粗</ToolButton>
        <ToolButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>斜体</ToolButton>
        <ToolButton active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>小标题</ToolButton>
        <ToolButton active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>项目符号</ToolButton>
        <ToolButton active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>编号</ToolButton>
        <ToolButton active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>引用</ToolButton>
        <ToolButton disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "上传中…" : "插入图片"}</ToolButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }}
        />
      </div>
      {uploadError && <p className="border-b border-line px-3 py-1.5 text-[11.5px] text-hot">{uploadError}</p>}
      <EditorContent editor={editor} className="prose prose-sm max-w-none px-3 py-2 text-[13.5px] leading-[1.9] text-ink-2 [&_img]:max-w-full [&_img]:rounded" />
    </div>
  );
}

export { KINDS };
