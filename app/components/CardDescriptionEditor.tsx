import { useRef, useEffect } from "react";

export interface CardDescriptionEditorProps {
  content?: string | null;
  onChange?: (content: string) => void;
  onBlur?: (content: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
}

/**
 * Lightweight rich text editor using contenteditable
 * Supports: bold, italic, strike, headings, lists, code, blockquotes
 * No heavy dependencies - just HTML/CSS
 */
export function CardDescriptionEditor({
  content = "",
  onChange,
  onBlur,
  readOnly = false,
  autoFocus = true,
}: CardDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Initialize content only once on mount
  useEffect(() => {
    if (editorRef.current && !isInitializedRef.current && content) {
      editorRef.current.innerHTML = content;
      isInitializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && autoFocus && !readOnly) {
      editorRef.current.focus();
    }
  }, [autoFocus, readOnly]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const isCommandActive = (command: string): boolean => {
    return document.queryCommandState(command);
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    disabled,
    label,
    icon,
    shortcut,
  }: {
    onClick: () => void;
    isActive: boolean;
    disabled: boolean;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`p-1.5 rounded inline-flex items-center justify-center transition ${
        isActive
          ? "bg-blue-500 text-white shadow-md"
          : "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {icon}
    </button>
  );

  const handleContentChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange?.(html);
    }
  };

  const handleBlur = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onBlur?.(html);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (
        <div className="border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 p-2 space-y-2">
          {/* Formatting Toolbar */}
          <div className="flex flex-wrap gap-1">
            <ToolbarButton
              onClick={() => execCommand("bold")}
              isActive={isCommandActive("bold")}
              disabled={false}
              label="Bold"
              icon={
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4m0 8h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6v-8"
                    strokeWidth="0"
                  />
                </svg>
              }
              shortcut="Ctrl+B"
            />
            <ToolbarButton
              onClick={() => execCommand("italic")}
              isActive={isCommandActive("italic")}
              disabled={false}
              label="Italic"
              icon={
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"
                    strokeWidth="0"
                  />
                </svg>
              }
              shortcut="Ctrl+I"
            />
            <ToolbarButton
              onClick={() => execCommand("strikethrough")}
              isActive={isCommandActive("strikethrough")}
              disabled={false}
              label="Strike"
              icon={
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M3 14h18v-2H3v2m0-8v2h18V6H3m18 14H3v2h18v-2z"
                    strokeWidth="0"
                  />
                </svg>
              }
            />

            <div className="border-l border-slate-300 dark:border-slate-600" />

            <ToolbarButton
              onClick={() => execCommand("formatBlock", "h2")}
              isActive={isCommandActive("formatBlock")}
              disabled={false}
              label="H2"
              icon={<span className="text-sm font-bold">H2</span>}
            />
            <ToolbarButton
              onClick={() => execCommand("formatBlock", "h3")}
              isActive={isCommandActive("formatBlock")}
              disabled={false}
              label="H3"
              icon={<span className="text-sm font-bold">H3</span>}
            />

            <div className="border-l border-slate-300 dark:border-slate-600" />

            <ToolbarButton
              onClick={() => execCommand("insertUnorderedList")}
              isActive={isCommandActive("insertUnorderedList")}
              disabled={false}
              label="Bullet List"
              icon={
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
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
              onClick={() => execCommand("insertOrderedList")}
              isActive={isCommandActive("insertOrderedList")}
              disabled={false}
              label="Ordered List"
              icon={
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
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

            <div className="border-l border-slate-300 dark:border-slate-600" />

            <ToolbarButton
              onClick={() => execCommand("formatBlock", "pre")}
              isActive={isCommandActive("formatBlock")}
              disabled={false}
              label="Code"
              icon={
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9.4 16.6L4.8 12l4.6-4.6L6.6 6 0 12l6.6 6 2.8-2.4zm5.2 0l4.6-4.6-4.6-4.6 2.8-2.8L24 12l-6.6 6 2.8 2.4z"
                    strokeWidth="0"
                  />
                </svg>
              }
            />
            <ToolbarButton
              onClick={() => execCommand("formatBlock", "blockquote")}
              isActive={isCommandActive("formatBlock")}
              disabled={false}
              label="Quote"
              icon={
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.52-9-7-9s-6 7.75-6 9c0 5 3 7 3 7s0 1 3 3z" />
                  <path
                    d="M15 21c3 0 7-1 7-8V5c0-1.25-4.52-9-7-9s-6 7.75-6 9c0 5 3 7 3 7s0 1 3 3z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
          </div>

          {/* Image Insert */}
          <div className="flex gap-2 items-end bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Image URL
              </label>
              <input
                type="text"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    execCommand(
                      "insertImage",
                      e.currentTarget.value
                    );
                    e.currentTarget.value = "";
                  }
                }}
                placeholder="https://example.com/image.jpg"
                className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                const input = (e.target as HTMLElement).parentElement?.querySelector("input") as HTMLInputElement;
                if (input?.value) {
                  execCommand("insertImage", input.value);
                  input.value = "";
                }
              }}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition whitespace-nowrap"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div
        className={`border-2 rounded-lg p-0 min-h-48 transition cursor-text overflow-auto ${
          readOnly
            ? "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
            : "bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-600 shadow-lg shadow-blue-500/10"
        }`}
      >
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={handleContentChange}
          onBlur={handleBlur}
          className="p-4 prose dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:leading-6 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline prose-strong:font-semibold prose-code:bg-slate-100 dark:prose-code:bg-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-slate-800 dark:prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3 prose-pre:rounded prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-600 prose-blockquote:pl-4 prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1 prose-img:rounded prose-img:max-w-full outline-none ltr"
          dir="ltr"
        />
      </div>
    </div>
  );
}
