"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Mention from "@tiptap/extension-mention"
import { Markdown } from "tiptap-markdown"
import ReactDOM from "react-dom/client"
import { MentionList, type MentionListRef } from "@/components/collaboration/MentionList"
import { useCallback, useRef } from "react"
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  ImageIcon,
  Link as LinkIcon,
  Minus,
  Undo,
  Redo,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  content: string
  onChange: (markdown: string) => void
  placeholder?: string
  minHeight?: string
  onImageUpload?: (file: File) => Promise<string>
  editable?: boolean
  className?: string
  onMentionQuery?: (query: string) => Promise<{ id: string; name: string; email: string }[]>
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Écrire une note...",
  minHeight = "120px",
  onImageUpload,
  editable = true,
  className,
  onMentionQuery,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      Markdown,
      ...(onMentionQuery
        ? [
            Mention.configure({
              HTMLAttributes: {
                class: "mention",
              },
              renderHTML({ node }) {
                return [
                  "span",
                  {
                    class: "mention bg-primary/15 text-primary rounded px-1 py-0.5 text-sm font-medium",
                    "data-mention-id": node.attrs.id,
                    "data-type": "mention",
                  },
                  `@${node.attrs.label ?? node.attrs.id}`,
                ]
              },
              suggestion: {
                items: async ({ query }: { query: string }) => {
                  if (!onMentionQuery) return []
                  return await onMentionQuery(query)
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                render: (): any => {
                  let component: ReactDOM.Root | null = null
                  let popup: HTMLDivElement | null = null
                  let mentionRef: MentionListRef | null = null

                  return {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onStart: (props: any) => {
                      popup = document.createElement("div")
                      popup.style.position = "absolute"
                      popup.style.zIndex = "50"
                      document.body.appendChild(popup)

                      const rect = props.clientRect?.()
                      if (rect && popup) {
                        popup.style.left = `${rect.left}px`
                        popup.style.top = `${rect.bottom + 4}px`
                      }

                      component = ReactDOM.createRoot(popup)
                      component.render(
                        <MentionList
                          ref={(r) => { mentionRef = r }}
                          items={props.items}
                          command={props.command}
                        />
                      )
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onUpdate: (props: any) => {
                      const rect = props.clientRect?.()
                      if (rect && popup) {
                        popup.style.left = `${rect.left}px`
                        popup.style.top = `${rect.bottom + 4}px`
                      }
                      component?.render(
                        <MentionList
                          ref={(r) => { mentionRef = r }}
                          items={props.items}
                          command={props.command}
                        />
                      )
                    },
                    onKeyDown: (props: { event: KeyboardEvent }) => {
                      if (props.event.key === "Escape") {
                        popup?.remove()
                        component?.unmount()
                        return true
                      }
                      return mentionRef?.onKeyDown(props) ?? false
                    },
                    onExit: () => {
                      popup?.remove()
                      component?.unmount()
                    },
                  }
                },
              },
            }),
          ]
        : []),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown() as string
      onChange(md)
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none",
          "prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
          "prose-table:my-2 prose-img:my-2 prose-img:rounded-md",
          "font-[family-name:var(--font-body)]"
        ),
        style: `min-height: ${minHeight}`,
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length && onImageUpload) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith("image/")) {
            event.preventDefault()
            onImageUpload(file).then((url) => {
              const { schema } = view.state
              const node = schema.nodes.image.create({ src: url })
              const transaction = view.state.tr.replaceSelectionWith(node)
              view.dispatch(transaction)
            })
            return true
          }
        }
        return false
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (items && onImageUpload) {
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault()
              const file = item.getAsFile()
              if (file) {
                onImageUpload(file).then((url) => {
                  const { schema } = view.state
                  const node = schema.nodes.image.create({ src: url })
                  const transaction = view.state.tr.replaceSelectionWith(node)
                  view.dispatch(transaction)
                })
              }
              return true
            }
          }
        }
        return false
      },
    },
  })

  const handleImageUpload = useCallback(async () => {
    if (!onImageUpload) return
    fileInputRef.current?.click()
  }, [onImageUpload])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !onImageUpload || !editor) return
      const url = await onImageUpload(file)
      editor.chain().focus().setImage({ src: url }).run()
      e.target.value = ""
    },
    [editor, onImageUpload]
  )

  const addTable = useCallback(() => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run()
  }, [editor])

  const addLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL du lien", previousUrl)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    title: string
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
    <div
      className={cn(
        "rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className
      )}
    >
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border/60">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Gras"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italique"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-border/60 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            title="Titre 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Titre 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="Titre 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-border/60 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Liste à puces"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Liste numérotée"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Citation"
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-border/60 mx-1" />

          <ToolbarButton onClick={addTable} title="Insérer un tableau">
            <TableIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          {onImageUpload && (
            <ToolbarButton onClick={handleImageUpload} title="Insérer une image">
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
          )}
          <ToolbarButton onClick={addLink} isActive={editor.isActive("link")} title="Insérer un lien">
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Séparateur"
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Annuler">
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rétablir">
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor content */}
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>

      {/* Hidden file input for image upload */}
      {onImageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  )
}
