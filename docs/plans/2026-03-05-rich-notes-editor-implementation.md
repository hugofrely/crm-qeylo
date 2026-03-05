# Rich Notes Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace plain-text notes with a WYSIWYG Tiptap editor storing Markdown, with image upload to Cloudflare R2.

**Architecture:** Tiptap WYSIWYG editor component shared between contacts and deals. Notes stored as Markdown in existing `content` TextField. New Django endpoint for image upload to R2 via boto3 S3-compatible API.

**Tech Stack:** Tiptap (frontend editor), tiptap-markdown (serialization), boto3 (R2 upload), react-markdown (display)

---

### Task 1: Install Frontend Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install Tiptap packages**

Run:
```bash
cd frontend && npm install @tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder tiptap-markdown
```

**Step 2: Verify installation**

Run: `cd frontend && npm ls @tiptap/react`
Expected: Shows @tiptap/react version

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(notes): install tiptap and markdown dependencies"
```

---

### Task 2: Create RichTextEditor Component

**Files:**
- Create: `frontend/components/ui/RichTextEditor.tsx`

**Step 1: Create the editor component**

```tsx
"use client"

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { Markdown } from "tiptap-markdown"
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
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Écrire une note...",
  minHeight = "120px",
  onImageUpload,
  editable = true,
  className,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
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
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown()
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
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to RichTextEditor

**Step 3: Commit**

```bash
git add frontend/components/ui/RichTextEditor.tsx
git commit -m "feat(notes): create RichTextEditor component with Tiptap"
```

---

### Task 3: Install Backend Dependencies for R2 Upload

**Files:**
- Modify: `backend/requirements.txt`

**Step 1: Add boto3 to requirements**

Add `boto3>=1.35.0` to `backend/requirements.txt`.

**Step 2: Install**

Run: `cd backend && pip install boto3>=1.35.0`

**Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "feat(uploads): add boto3 dependency for R2 image upload"
```

---

### Task 4: Create Image Upload Backend

**Files:**
- Create: `backend/uploads/__init__.py`
- Create: `backend/uploads/apps.py`
- Create: `backend/uploads/views.py`
- Create: `backend/uploads/urls.py`
- Modify: `backend/config/settings.py` (add to INSTALLED_APPS)
- Modify: `backend/config/urls.py` (add URL pattern)
- Modify: `.env.example` (add R2 env vars)

**Step 1: Create the uploads app**

`backend/uploads/__init__.py` — empty file

`backend/uploads/apps.py`:
```python
from django.apps import AppConfig

class UploadsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "uploads"
```

`backend/uploads/views.py`:
```python
import uuid
import os
import boto3
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_image(request):
    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

    if file.content_type not in ALLOWED_TYPES:
        return Response(
            {"detail": f"Unsupported file type: {file.content_type}. Allowed: {', '.join(ALLOWED_TYPES)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if file.size > MAX_SIZE:
        return Response({"detail": "File too large (max 5MB)."}, status=status.HTTP_400_BAD_REQUEST)

    ext = os.path.splitext(file.name)[1].lower() or ".png"
    key = f"notes/{uuid.uuid4()}{ext}"

    client = _get_s3_client()
    client.upload_fileobj(
        file,
        settings.R2_BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": file.content_type},
    )

    url = f"{settings.R2_PUBLIC_URL}/{key}"
    return Response({"url": url}, status=status.HTTP_201_CREATED)
```

`backend/uploads/urls.py`:
```python
from django.urls import path
from . import views

urlpatterns = [
    path("image/", views.upload_image, name="upload-image"),
]
```

**Step 2: Register the app and URL**

In `backend/config/settings.py`, add `"uploads"` to `INSTALLED_APPS`.

Add R2 settings at the bottom of settings.py:
```python
# Cloudflare R2
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "")
```

In `backend/config/urls.py`, add:
```python
path("api/upload/", include("uploads.urls")),
```

**Step 3: Update .env.example**

Add these variables:
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

**Step 4: Commit**

```bash
git add backend/uploads/ backend/config/settings.py backend/config/urls.py .env.example
git commit -m "feat(uploads): add image upload endpoint for Cloudflare R2"
```

---

### Task 5: Add Image Upload API Helper (Frontend)

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add upload function**

Add to `frontend/lib/api.ts`:
```typescript
export async function apiUploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const token = /* use same token retrieval as apiFetch */
  const res = await fetch(`${API_BASE}/upload/image/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Upload failed")
  }

  const data = await res.json()
  return data.url
}
```

Note: Check `frontend/lib/api.ts` for how `apiFetch` gets the token and base URL, and replicate the same pattern.

**Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(uploads): add apiUploadImage helper function"
```

---

### Task 6: Integrate Editor in Contact Detail Page (Notes Tab)

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Replace note input with RichTextEditor**

In the contact detail page, make these changes:

1. Add imports:
```typescript
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { apiUploadImage } from "@/lib/api"
```

2. Replace the notes input section (lines 1469-1486) — the `<div className="flex gap-2 mb-6">` block containing the `<Input>` — with:
```tsx
<div className="mb-6 space-y-2">
  <RichTextEditor
    content={newNote}
    onChange={setNewNote}
    placeholder="Ajouter une note..."
    minHeight="100px"
    onImageUpload={apiUploadImage}
  />
  <div className="flex justify-end">
    <Button size="sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="gap-1.5">
      {addingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      <span className="font-[family-name:var(--font-body)]">Ajouter</span>
    </Button>
  </div>
</div>
```

**Step 2: Update note display in TimelineList**

In the `TimelineList` component (line 441-444), replace:
```tsx
{entry.content && (
  <p className="text-sm mt-1.5 whitespace-pre-wrap break-words leading-relaxed">
    {entry.content}
  </p>
)}
```
with:
```tsx
{entry.content && (
  <div className="mt-1.5 text-sm">
    <MarkdownContent content={entry.content} />
  </div>
)}
```

Add import for MarkdownContent:
```typescript
import { MarkdownContent } from "@/components/chat/MarkdownContent"
```

**Step 3: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "feat(notes): integrate rich text editor in contact notes tab"
```

---

### Task 7: Integrate Editor in Deal Dialog

**Files:**
- Modify: `frontend/components/deals/DealDialog.tsx`

**Step 1: Replace textarea with RichTextEditor**

1. Add imports:
```typescript
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { apiUploadImage } from "@/lib/api"
```

2. Replace the notes textarea (around line 332-342) — the `<div className="space-y-1.5">` block with `<textarea id="deal-notes"` — with:
```tsx
<div className="space-y-1.5">
  <Label htmlFor="deal-notes">Notes</Label>
  <RichTextEditor
    content={notes}
    onChange={setNotes}
    placeholder="Notes sur ce deal…"
    minHeight="80px"
    onImageUpload={apiUploadImage}
  />
</div>
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add frontend/components/deals/DealDialog.tsx
git commit -m "feat(notes): integrate rich text editor in deal dialog"
```

---

### Task 8: Add Tiptap Editor Styles

**Files:**
- Modify: `frontend/app/globals.css`

**Step 1: Add Tiptap-specific styles**

Add to `frontend/app/globals.css`:
```css
/* Tiptap editor styles */
.tiptap {
  outline: none;
}

.tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--muted-foreground);
  pointer-events: none;
  height: 0;
}

.tiptap table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}

.tiptap table td,
.tiptap table th {
  border: 1px solid var(--border);
  padding: 0.25rem 0.5rem;
  min-width: 100px;
}

.tiptap table th {
  background-color: var(--muted);
  font-weight: 600;
}

.tiptap img {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
}
```

**Step 2: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat(notes): add Tiptap editor styles"
```

---

### Task 9: Manual Testing & Verification

**Step 1: Start the dev servers**

Run: `docker-compose up` (or however the project runs)

**Step 2: Test in contacts**

1. Navigate to a contact detail page
2. Click on the "Notes" tab
3. Verify the rich text editor appears with toolbar
4. Type text with bold, italic, headings
5. Insert a table
6. Upload an image (if R2 is configured)
7. Add the note
8. Verify the note renders with Markdown formatting in the timeline

**Step 3: Test in deals**

1. Open a deal dialog (edit or create)
2. Verify the rich text editor appears in the notes section
3. Add formatted content and save

**Step 4: Test backward compatibility**

1. Check that existing plain-text notes still display correctly

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(notes): rich text editor with Tiptap, Markdown storage, R2 image upload"
```
