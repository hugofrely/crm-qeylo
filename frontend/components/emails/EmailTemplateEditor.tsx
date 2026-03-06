"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { useCallback, useEffect } from "react"
import {
  Bold, Italic, List, ListOrdered,
  Link as LinkIcon, Minus,
  Undo, Redo,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TemplateVariable } from "./VariableNode"
import { VariableMenu } from "./VariableMenu"

interface EmailTemplateEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function EmailTemplateEditor({
  content,
  onChange,
  placeholder = "Rédigez votre template...",
}: EmailTemplateEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      TemplateVariable,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none",
          "prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1",
          "font-[family-name:var(--font-body)]"
        ),
        style: "min-height: 200px",
      },
    },
  })

  useEffect(() => {
    if (!editor || !content) return
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const addLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt("URL du lien", editor.getAttributes("link").href)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  const ToolbarButton = ({
    onClick, isActive, children, title,
  }: {
    onClick: () => void; isActive?: boolean; children: React.ReactNode; title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded-md hover:bg-accent transition-colors",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border/60">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Gras">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italique">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Liste">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Liste numérotée">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <ToolbarButton onClick={addLink} isActive={editor.isActive("link")} title="Lien">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur">
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <VariableMenu editor={editor} />
        <div className="flex-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Annuler">
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rétablir">
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
