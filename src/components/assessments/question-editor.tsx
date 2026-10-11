'use client'

import 'katex/dist/katex.min.css'
import * as React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Markdown } from 'tiptap-markdown'
import {
  HiBold, HiOutlineCodeBracket,
  HiMiniListBullet, HiListBullet,
} from 'react-icons/hi2'
import { LuItalic } from 'react-icons/lu'

interface QuestionEditorProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  className?: string
}

export function QuestionEditor({
  value,
  onChange,
  placeholder = 'Type your question…',
  className,
}: QuestionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        horizontalRule: false,
        hardBreak: false,
      }),
      Mathematics,
      Markdown.configure({ transformPastedText: true, transformCopiedText: true }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[60px] px-3 py-2 text-sm',
      },
    },
    onUpdate({ editor: e }) {
      try {
        // tiptap-markdown extends editor.storage with a markdown helper
        const md: string = (e.storage as any).markdown?.getMarkdown?.() ?? e.getText()
        onChange(md)
      } catch {
        onChange(e.getText())
      }
    },
    immediatelyRender: false,
  })

  // Sync external value changes (e.g. edit mode loading from a saved question)
  const prevValueRef = React.useRef(value)
  React.useEffect(() => {
    if (!editor || value === prevValueRef.current) return
    prevValueRef.current = value
    try {
      const currentMd: string = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getText()
      if (currentMd !== value) {
        editor.commands.setContent(value || '')
      }
    } catch {
      // ignore
    }
  }, [editor, value])

  const isEmpty = !editor?.getText()?.trim()

  return (
    <div
      className={`relative rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 ${className ?? ''}`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5">
        <ToolbarButton
          active={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <HiBold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <LuItalic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('code') ?? false}
          onClick={() => editor?.chain().focus().toggleCode().run()}
          title="Inline code"
        >
          <HiOutlineCodeBracket className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          active={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <HiMiniListBullet className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('orderedList') ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <HiListBullet className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="ml-auto text-[10px] text-muted-foreground select-none">$…$ for math</div>
      </div>

      <EditorContent editor={editor} />

      {/* Placeholder overlay */}
      {isEmpty && (
        <div
          className="pointer-events-none absolute left-0 top-[40px] px-3 py-2 text-sm text-muted-foreground/50 select-none"
          aria-hidden
        >
          {placeholder}
        </div>
      )}
    </div>
  )
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1 transition-colors cursor-pointer ${
        active
          ? 'bg-secondary/20 text-secondary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}
