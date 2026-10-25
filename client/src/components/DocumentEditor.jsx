import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Undo2,
  Redo2,
  Lock,
  Eye
} from 'lucide-react';

export default function DocumentEditor({
  documentData,
  canEdit,
  onContentChange,
  onManualSave
}) {
  const initialContent = documentData ? documentData.content : '';
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline
    ],
    content: initialContent,
    editable: canEdit,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      updateCounts(text);
      onContentChange(html);
    }
  });

  // Calculate live word and character counts
  function updateCounts(text) {
    if (!text) {
      setWordCount(0);
      setCharCount(0);
      return;
    }
    const cleanText = text.trim();
    setCharCount(cleanText.length);
    const words = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];
    setWordCount(words.length);
  }

  const lastLoadedIdRef = useRef(documentData?.id);

  // Sync editor content and editable state when document changes
  useEffect(() => {
    if (!editor || !documentData) return;

    const isDifferentDoc = documentData.id !== lastLoadedIdRef.current;
    if (isDifferentDoc) {
      lastLoadedIdRef.current = documentData.id;
      editor.commands.setContent(documentData.content || '<p></p>', false);
      updateCounts(editor.getText());
    } else if (documentData.content && editor.isEmpty && documentData.content !== '<p></p>') {
      // If editor was initially empty and real content arrived from backend
      editor.commands.setContent(documentData.content, false);
      updateCounts(editor.getText());
    }

    editor.setEditable(canEdit);
  }, [documentData?.id, documentData?.content, canEdit, editor]);

  // Keyboard shortcut: Cmd+S / Ctrl+S to save
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (canEdit && onManualSave) {
          onManualSave();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canEdit, onManualSave]);

  if (!editor) {
    return null;
  }

  // Heading dropdown helper
  function getCurrentHeading() {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    return 'p';
  }

  function handleHeadingChange(e) {
    const val = e.target.value;
    if (val === 'p') {
      editor.chain().focus().setParagraph().run();
    } else if (val === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (val === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (val === 'h3') {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
  }

  return (
    <div className="editor-layout">
      {/* Read-Only Alert Banner if user has viewer access */}
      {!canEdit && (
        <div className="readonly-banner">
          <Eye size={16} />
          <span>You have view-only access to this document. Editing and formatting are locked.</span>
        </div>
      )}

      {/* Sticky Rich-Text Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <select
            className="heading-select"
            value={getCurrentHeading()}
            onChange={handleHeadingChange}
            disabled={!canEdit}
            title="Text style"
          >
            <option value="p">Normal text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!canEdit}
            title="Bold (Cmd+B)"
          >
            <Bold size={16} />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!canEdit}
            title="Italic (Cmd+I)"
          >
            <Italic size={16} />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!canEdit}
            title="Underline (Cmd+U)"
          >
            <UnderlineIcon size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!canEdit}
            title="Bulleted List"
          >
            <List size={16} />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!canEdit}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={!canEdit}
            title="Quote"
          >
            <Quote size={16} />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            disabled={!canEdit}
            title="Code Block"
          >
            <Code size={16} />
          </button>

          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            disabled={!canEdit}
            title="Horizontal Divider"
          >
            <Minus size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!canEdit || !editor.can().undo()}
            title="Undo (Cmd+Z)"
          >
            <Undo2 size={16} />
          </button>

          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!canEdit || !editor.can().redo()}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} characters
          </span>
        </div>
      </div>

      {/* Document Page Canvas */}
      <div className="canvas-wrapper" onClick={() => canEdit && editor.commands.focus()}>
        <div className="document-paper">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Editor Status Bar */}
      <div className="editor-statusbar">
        <div>
          <span>Tip: Use Cmd+B for bold, Cmd+I for italics, Cmd+U for underline, and Cmd+S to save.</span>
        </div>
        <div>
          <span>Ajaia Internal Document Suite</span>
        </div>
      </div>
    </div>
  );
}
