"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FilePlus,
  LayoutPanelLeft,
  LayoutPanelTop,
  Search,
  SplitSquareHorizontal,
  Trash2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "portfolio_os_notes_v1";

class MarkerWidget extends WidgetType {
  private text: string;
  private className: string;
  private colorVar?: string;

  constructor(text: string, className: string, colorVar?: string) {
    super();
    this.text = text;
    this.className = className;
    this.colorVar = colorVar;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = `cm-marker-widget ${this.className}`;
    span.textContent = this.text;
    if (this.colorVar) {
      span.style.color = `var(${this.colorVar})`;
    }
    return span;
  }
}

function buildMarkerDecorations(view: EditorView) {
  const ranges: Range<Decoration>[] = [];
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    let inFence = false;
    let fenceMarker = "";
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const text = line.text;
      const fenceMatch = /^(\s*)(```|~~~)/.exec(text);
      if (fenceMatch) {
        const marker = fenceMatch[2];
        if (!inFence) {
          inFence = true;
          fenceMarker = marker;
        } else if (marker === fenceMarker) {
          inFence = false;
          fenceMarker = "";
        }
        const start = line.from + fenceMatch[1].length;
        const end = start + marker.length;
        ranges.push(Decoration.mark({ class: "cm-code-fence" }).range(start, end));
        pos = line.to + 1;
        continue;
      }
      if (inFence && line.to > line.from) {
        ranges.push(Decoration.mark({ class: "cm-code-block" }).range(line.from, line.to));
      }
      if (!inFence && /^(\t| {4})/.test(text) && line.to > line.from) {
        ranges.push(Decoration.mark({ class: "cm-code-block" }).range(line.from, line.to));
      }
      const listMatch = /^(\s*)([-*+]|\d+\.)\s/.exec(text);
      if (listMatch) {
        const start = line.from + listMatch[1].length;
        const end = start + listMatch[2].length;
        if (end > start) {
          ranges.push(
            Decoration.replace({
              widget: new MarkerWidget(listMatch[2], "cm-list-marker", "--editor-list")
            }).range(start, end)
          );
        }
      }
      const quoteMatch = /^(\s*)>\s/.exec(text);
      if (quoteMatch) {
        const start = line.from + quoteMatch[1].length;
        const end = start + 1;
        if (end > start) {
          ranges.push(
            Decoration.replace({
              widget: new MarkerWidget(">", "cm-quote-marker", "--editor-blockquote")
            }).range(start, end)
          );
        }
      }
      pos = line.to + 1;
    }
  }
  return Decoration.set(ranges, true);
}

function safeLoadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => n && typeof n.id === "string")
      .map((n) => ({
        id: n.id,
        title: typeof n.title === "string" ? n.title : "Untitled",
        content: typeof n.content === "string" ? n.content : "",
        createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now()
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore
  }
}

function createWelcomeNote(): Note {
  const now = Date.now();
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(now),
    title: "Welcome",
    content:
      "# Markdown Editor\n\nThis is a local notes app inside **Portfolio OS**.\n\n## Tips\n- Notes autosave\n- Use the split view to preview\n- Export a note as `.md`\n\n### Cheatsheet\n- `#` Heading\n- `**bold**`\n- `*italics*`\n- `- list item`\n- ```\n  code block\n  ```\n\n> Everything stays in your browser (localStorage).\n",
    createdAt: now,
    updatedAt: now
  };
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function EditorApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [split, setSplit] = useState(true);
  const [showList, setShowList] = useState(true);
  const autosaveTimer = useRef<number | null>(null);

  // Load notes
  useEffect(() => {
    const loaded = safeLoadNotes();
    if (loaded.length === 0) {
      const welcome = createWelcomeNote();
      setNotes([welcome]);
      setActiveId(welcome.id);
      saveNotes([welcome]);
      return;
    }
    setNotes(loaded);
    setActiveId(loaded[0].id);
  }, []);

  const active = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => `${n.title}\n${n.content}`.toLowerCase().includes(q));
  }, [notes, query]);

  const previewMarkdown = useMemo(() => active?.content ?? "", [active?.content]);
  const editorExtensions = useMemo(() => {
    const highlightStyle = HighlightStyle.define([
      { tag: tags.heading1, color: "var(--editor-heading-1)", fontWeight: "700" },
      { tag: tags.heading2, color: "var(--editor-heading-2)", fontWeight: "700" },
      { tag: tags.heading3, color: "var(--editor-heading-3)", fontWeight: "700" },
      { tag: tags.strong, color: "var(--editor-strong)", fontWeight: "700" },
      { tag: tags.emphasis, color: "var(--editor-emphasis)", fontStyle: "italic" },
      // List and quote content should inherit editor fg; markers are styled via CSS below.
      { tag: tags.monospace, color: "var(--editor-code)" },
      { tag: tags.link, color: "var(--editor-link)" },
      { tag: tags.url, color: "var(--editor-link)" },
      { tag: tags.contentSeparator, color: "var(--editor-separator)" },
      { tag: tags.comment, color: "var(--editor-comment)" }
    ]);

    return [
      markdown(),
      EditorView.lineWrapping,
      ViewPlugin.fromClass(
        class {
          decorations: DecorationSet;
          constructor(view: EditorView) {
            this.decorations = buildMarkerDecorations(view);
          }
          update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
              this.decorations = buildMarkerDecorations(update.view);
            }
          }
        },
        {
          decorations: (v) => v.decorations
        }
      ),
      EditorView.theme(
        {
          "&": {
            backgroundColor: "var(--editor-bg)",
            color: "var(--editor-fg)",
            fontFamily:
              "var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace)",
            fontSize: "13.5px",
            lineHeight: "1.6"
          },
          ".cm-content": {
            padding: "12px 12px",
            caretColor: "var(--editor-caret)"
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "var(--editor-caret)"
          },
          ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
            backgroundColor: "var(--editor-selection)"
          },
          ".cm-gutters": {
            backgroundColor: "transparent",
            color: "var(--editor-gutter)",
            borderRight: "1px solid var(--editor-border)"
          },
          ".cm-formatting": {
            color: "var(--editor-separator)"
          },
          ".cm-formatting-header, .cm-formatting-heading": {
            color: "var(--editor-heading-1)"
          },
          ".cm-formatting-quote, .cm-quote .cm-formatting": {
            color: "var(--editor-quote)"
          },
          ".cm-list-marker": {
            color: "var(--editor-list)"
          },
          ".cm-quote-marker": {
            color: "var(--editor-blockquote) !important"
          },
          ".cm-marker-widget": {
            display: "inline-block",
            whiteSpace: "pre"
          },
          ".cm-code-fence, .cm-code-block, .cm-code-block span": {
            color: "var(--editor-fg) !important"
          },
          ".cm-code-block .cm-monospace": {
            color: "var(--editor-fg) !important"
          },
          ".cm-link, .cm-url": {
            color: "var(--editor-link)"
          },
          ".cm-scroller": {
            fontFamily:
              "var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace)"
          }
        },
        { dark: true }
      ),
      syntaxHighlighting(highlightStyle)
    ];
  }, []);


  function scheduleAutosave(nextNotes: Note[]) {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      saveNotes(nextNotes);
    }, 250);
  }

  function updateActive(patch: Partial<Pick<Note, "title" | "content">>) {
    if (!active) return;
    const now = Date.now();
    const nextNotes = notes
      .map((n) => (n.id === active.id ? { ...n, ...patch, updatedAt: now } : n))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(nextNotes);
    scheduleAutosave(nextNotes);
  }

  function createNote() {
    const now = Date.now();
    const note: Note = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(now),
      title: "Untitled",
      content: "",
      createdAt: now,
      updatedAt: now
    };
    const nextNotes = [note, ...notes];
    setNotes(nextNotes);
    setActiveId(note.id);
    saveNotes(nextNotes);
  }

  function deleteActive() {
    if (!active) return;
    const nextNotes = notes.filter((n) => n.id !== active.id);
    const nextActive = nextNotes[0]?.id ?? "";
    setNotes(nextNotes);
    setActiveId(nextActive);
    saveNotes(nextNotes.length ? nextNotes : []);
  }

  function exportActive() {
    if (!active) return;
    const safeTitle = (active.title || "note")
      .toLowerCase()
      .replace(/[^a-z0-9\-\s_]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    downloadText(`${safeTitle || "note"}.md`, active.content || "");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">App</p>
          <h2 className="mt-2 text-2xl font-semibold">Markdown Editor</h2>
          <p className="mt-1 text-sm text-muted-foreground">Local notes, split preview, export to .md</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={createNote}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition hover:bg-accent"
          >
            <FilePlus className="h-4 w-4" />
            New
          </button>

          <button
            type="button"
            onClick={() => setSplit((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition hover:bg-accent",
              split && "bg-primary text-primary-foreground hover:bg-primary"
            )}
            aria-pressed={split}
          >
            <SplitSquareHorizontal className="h-4 w-4" />
            Split
          </button>

          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition hover:bg-accent",
              showList && "bg-primary text-primary-foreground hover:bg-primary"
            )}
            aria-pressed={showList}
            title={showList ? "Hide note list" : "Show note list"}
          >
            {showList ? <LayoutPanelLeft className="h-4 w-4" /> : <LayoutPanelTop className="h-4 w-4" />}
            List
          </button>

          <button
            type="button"
            onClick={exportActive}
            disabled={!active}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <button
            type="button"
            onClick={deleteActive}
            disabled={!active}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </header>

      <section className="surface-elevated overflow-hidden">
        <div
          className={cn(
            "grid min-h-[520px]",
            showList
              ? split
                ? "grid-cols-1 lg:grid-cols-[280px_1fr_1fr]"
                : "grid-cols-1 lg:grid-cols-[280px_1fr]"
              : split
                ? "grid-cols-1 lg:grid-cols-[1fr_1fr]"
                : "grid-cols-1"
          )}
        >
          {showList ? (
            <aside className="border-b border-border p-4 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2 overflow-auto pb-2" style={{ maxHeight: "calc(520px - 88px)" }}>
                {filtered.map((n) => {
                  const isActive = n.id === activeId;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setActiveId(n.id)}
                      className={cn(
                        "surface-ghost w-full rounded-xl p-3 text-left transition",
                        "hover:bg-accent",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("truncate text-sm font-medium", isActive ? "" : "text-foreground")}>{n.title || "Untitled"}</p>
                        <span className={cn("shrink-0 text-xs", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{timeAgo(n.updatedAt)}</span>
                      </div>
                      <p className={cn("mt-1 line-clamp-2 text-xs", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {(n.content || "").trim() ? (n.content || "").trim().slice(0, 90) : "No content"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </aside>
          ) : null}

          <div className="p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <input
                value={active?.title ?? ""}
                onChange={(e) => updateActive({ title: e.target.value })}
                placeholder="Untitled"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none transition focus:ring-2 focus:ring-primary"
              />
              <div className="text-xs text-muted-foreground">{active ? `Autosaved - edited ${timeAgo(active.updatedAt)}` : ""}</div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <CodeMirror
                value={active?.content ?? ""}
                onChange={(value) => updateActive({ content: value })}
                extensions={editorExtensions}
                placeholder="Write markdown here..."
                height="440px"
                theme="none"
                basicSetup={{
                  lineNumbers: false,
                  foldGutter: false,
                  highlightActiveLineGutter: false
                }}
              />
            </div>
          </div>

          {split ? (
            <div className="border-t border-border p-4 lg:border-t-0 lg:border-l">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Preview</p>
                <p className="text-xs text-muted-foreground">Rendered locally</p>
              </div>

              <div className="h-[480px] overflow-auto rounded-2xl border border-border bg-background p-4">
                <article className="markdown-preview text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children, ...props }) => (
                        <a href={href} target="_blank" rel="noreferrer" {...props}>
                          {children}
                        </a>
                      )
                    }}
                  >
                    {previewMarkdown}
                  </ReactMarkdown>
                </article>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
