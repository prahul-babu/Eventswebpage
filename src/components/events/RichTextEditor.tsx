import React, { useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import DOMPurify from "dompurify";

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Write a comprehensive event overview, schedule highlights, speaker bio, and student outcomes...",
  className = "",
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Sync value into editor only when content changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (!editorRef.current.innerHTML && !value) {
        // Leave empty
      } else if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const sanitized = DOMPurify.sanitize(html);
      onChange(sanitized);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleInsertLink = () => {
    const url = prompt("Enter link URL (e.g. https://apollouniversity.edu.in):");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm ${className}`}>
      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-50/90 border-b border-slate-200 flex-wrap text-slate-700">
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h1>")}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h2>")}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand("bold")}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("italic")}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<blockquote>")}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={handleInsertLink}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand("undo")}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors ml-auto"
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("redo")}
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Redo"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable Body Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="p-4 min-h-[160px] max-h-[400px] overflow-y-auto text-xs sm:text-sm text-slate-800 focus:outline-none prose prose-sm prose-slate max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
      />
    </div>
  );
};
