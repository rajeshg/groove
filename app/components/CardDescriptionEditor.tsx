import React, { useRef, useEffect, useState } from "react";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import {
  Schema,
  DOMParser,
  DOMSerializer,
  Node as PMNode,
  MarkType,
} from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import {
  addListNodes,
  wrapInList,
  splitListItem,
} from "prosemirror-schema-list";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import {
  baseKeymap,
  toggleMark,
  setBlockType,
  selectParentNode,
} from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";

export interface CardDescriptionEditorProps {
  content?: string | null;
  onChange?: (content: string) => void;
  onBlur?: (content: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
}

// Define marks including strike if needed (though basic schema doesn't have it, we can extend)
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: schema.spec.marks,
});

function getHTMLFromDoc(doc: PMNode): string {
  const fragment = DOMSerializer.fromSchema(mySchema).serializeFragment(
    doc.content
  );
  const div = document.createElement("div");
  div.appendChild(fragment);
  return div.innerHTML;
}

function ProseMirrorEditor({
  content,
  onChange,
  onBlur,
  autoFocus,
}: {
  content: string;
  onChange?: (content: string) => void;
  onBlur?: (content: string) => void;
  autoFocus?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [state, setState] = useState<EditorState | null>(null);

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const domParser = new window.DOMParser();
    const parsedDoc = domParser.parseFromString(
      content || "<p></p>",
      "text/html"
    );
    const doc = DOMParser.fromSchema(mySchema).parse(parsedDoc.body);

    const editorState = EditorState.create({
      doc,
      plugins: [
        history(),
        dropCursor(),
        gapCursor(),
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
          "Mod-Shift-z": redo,
          "Mod-b": toggleMark(mySchema.marks.strong),
          "Mod-i": toggleMark(mySchema.marks.em),
          "Mod-p": selectParentNode,
          Tab: (state, dispatch) => {
            if (dispatch) {
              const tr = state.tr.insertText("  ");
              dispatch(tr);
            }
            return true;
          },
          "Mod-Enter": splitListItem(mySchema.nodes.list_item),
          Enter: splitListItem(mySchema.nodes.list_item),
        }),
        keymap(baseKeymap),
      ],
    });

    const view = new EditorView(editorRef.current, {
      state: editorState,
      dispatchTransaction(tr: Transaction) {
        const newState = view.state.apply(tr);
        view.updateState(newState);
        setState(newState);

        if (tr.docChanged && onChange) {
          onChange(getHTMLFromDoc(newState.doc));
        }
      },
      handleDOMEvents: {
        blur: (view) => {
          if (onBlur) {
            onBlur(getHTMLFromDoc(view.state.doc));
          }
          return false;
        },
      },
    });

    viewRef.current = view;
    setState(editorState);

    if (autoFocus) {
      view.focus();
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Initialize only once

  const isMarkActive = (type: MarkType) => {
    if (!state) return false;
    const { from, $from, to, empty } = state.selection;
    if (empty) return !!type.isInSet?.(state.storedMarks || $from.marks());
    return state.doc.rangeHasMark(from, to, type);
  };

  const exec = (
    cmd: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean
  ) => {
    if (viewRef.current) {
      cmd(viewRef.current.state, viewRef.current.dispatch);
      viewRef.current.focus();
    }
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    label,
    icon,
  }: {
    onClick: () => void;
    isActive?: boolean;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={label}
      className={`p-1.5 rounded inline-flex items-center justify-center transition ${
        isActive
          ? "bg-blue-500 text-white shadow-md"
          : "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600"
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
        <div className="flex flex-wrap gap-1">
          <ToolbarButton
            onClick={() => exec(toggleMark(mySchema.marks.strong))}
            isActive={isMarkActive(mySchema.marks.strong)}
            label="Bold"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4m0 8h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6v-8" />
              </svg>
            }
          />
          <ToolbarButton
            onClick={() => exec(toggleMark(mySchema.marks.em))}
            isActive={isMarkActive(mySchema.marks.em)}
            label="Italic"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
              </svg>
            }
          />
          <div className="border-l border-slate-300 dark:border-slate-600 mx-1" />
          <ToolbarButton
            onClick={() =>
              exec(setBlockType(mySchema.nodes.heading, { level: 2 }))
            }
            label="H2"
            icon={<span className="text-sm font-bold">H2</span>}
          />
          <ToolbarButton
            onClick={() =>
              exec(setBlockType(mySchema.nodes.heading, { level: 3 }))
            }
            label="H3"
            icon={<span className="text-sm font-bold">H3</span>}
          />
          <div className="border-l border-slate-300 dark:border-slate-600 mx-1" />
          <ToolbarButton
            onClick={() => exec(wrapInList(mySchema.nodes.bullet_list))}
            label="Bullet List"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="4" cy="6" r="1.5" />
                <circle cx="4" cy="12" r="1.5" />
                <circle cx="4" cy="18" r="1.5" />
                <path
                  d="M8 5h12M8 11h12M8 17h12"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            }
          />
          <ToolbarButton
            onClick={() => exec(wrapInList(mySchema.nodes.ordered_list))}
            label="Ordered List"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <text x="2" y="7" fontSize="5" fontWeight="bold">
                  1
                </text>
                <text x="2" y="13" fontSize="5" fontWeight="bold">
                  2
                </text>
                <text x="2" y="19" fontSize="5" fontWeight="bold">
                  3
                </text>
                <path
                  d="M8 5h12M8 11h12M8 17h12"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            }
          />
          <div className="border-l border-slate-300 dark:border-slate-600 mx-1" />
          <ToolbarButton
            onClick={() => exec(setBlockType(mySchema.nodes.code_block))}
            label="Code Block"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L6.6 6 0 12l6.6 6 2.8-2.4zm5.2 0l4.6-4.6-4.6-4.6 2.8-2.8L24 12l-6.6 6 2.8 2.4z" />
              </svg>
            }
          />
          <ToolbarButton
            onClick={() => exec(setBlockType(mySchema.nodes.blockquote))}
            label="Quote"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.52-9-7-9s-6 7.75-6 9c0 5 3 7 3 7s0 1 3 3z" />
                <path
                  d="M15 21c3 0 7-1 7-8V5c0-1.25-4.52-9-7-9s-6 7.75-6 9c0 5 3 7 3 7s0 1 3 3z"
                  fill="currentColor"
                />
              </svg>
            }
          />
        </div>
      </div>
      <div
        ref={editorRef}
        className="border-2 rounded-lg min-h-32 md:min-h-48 p-4 transition cursor-text overflow-auto bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-600 shadow-lg shadow-blue-500/10 prose dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:leading-6 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline prose-strong:font-semibold prose-code:bg-slate-100 dark:prose-code:bg-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-slate-800 dark:prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3 prose-pre:rounded prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-600 prose-blockquote:pl-4 prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1 prose-img:rounded prose-img:max-w-full outline-none"
      />
    </div>
  );
}

export function CardDescriptionEditor({
  content = "",
  onChange,
  onBlur,
  readOnly = false,
  autoFocus = true,
}: CardDescriptionEditorProps) {
  if (readOnly) {
    return (
      <div
        className="border-2 rounded-lg p-4 min-h-32 md:min-h-48 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 prose dark:prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: content || "" }}
      />
    );
  }

  return (
    <ProseMirrorEditor
      content={content || ""}
      onChange={onChange}
      onBlur={onBlur}
      autoFocus={autoFocus}
    />
  );
}
