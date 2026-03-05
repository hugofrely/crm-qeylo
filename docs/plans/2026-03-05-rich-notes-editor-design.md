# Rich Notes Editor — Design Document

**Date:** 2026-03-05
**Status:** Approved

## Summary

Replace the plain-text notes input in contacts and deals with a WYSIWYG rich text editor (Tiptap). Notes are stored as Markdown for AI compatibility. Images are uploaded to Cloudflare R2.

## Requirements

- Multiline notes with rich formatting (bold, italic, headings, lists, blockquotes)
- Tables support
- Image upload (drag & drop + file picker) → stored on Cloudflare R2
- Markdown storage for AI read/write compatibility
- Applies to both contacts and deals
- Backward compatible with existing plain-text notes

## Architecture

### Frontend — Editor Component

**File:** `frontend/components/ui/RichTextEditor.tsx`

```typescript
interface RichTextEditorProps {
  content: string                              // Initial Markdown
  onChange: (md: string) => void               // Callback with updated Markdown
  placeholder?: string
  minHeight?: string                           // e.g. "120px"
  onImageUpload?: (file: File) => Promise<string>  // Returns URL
  editable?: boolean                           // Read-only if false
}
```

**Tiptap Extensions:**
- `StarterKit` — Bold, Italic, Headings, BulletList, OrderedList, Blockquote, Code, HorizontalRule
- `Table`, `TableRow`, `TableCell`, `TableHeader`
- `Image` — with drag & drop upload
- `Link`
- `Placeholder`
- `tiptap-markdown` — bidirectional Markdown ↔ Tiptap conversion

**Toolbar buttons:**
- Bold | Italic | H1 | H2 | H3
- Bullet List | Ordered List | Blockquote
- Table (insert/delete rows/columns)
- Image (upload from disk or drag & drop)
- Link

**Packages to install:**
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`
- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`
- `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`
- `tiptap-markdown`

### Frontend — Note Display (Read-only)

- Reuse existing `MarkdownContent` component from chat to render notes in the timeline
- Replace current `<p className="whitespace-pre-wrap">` with `<MarkdownContent content={entry.content} />`
- Old plain-text notes render correctly (Markdown treats plain text as-is)
- AI-generated notes (already Markdown) display properly

### Backend — Image Upload

**New app:** `backend/uploads/`

**Endpoint:** `POST /api/upload/image/`
- Authentication: `IsAuthenticated`
- Input: `multipart/form-data` with image file
- Validation: MIME types (`image/png`, `image/jpeg`, `image/gif`, `image/webp`), max 5MB
- Upload to R2 with unique name (UUID + extension)
- Response: `{ "url": "https://r2-public-url/..." }`

**R2 Configuration:**
- Uses `boto3` with R2's S3-compatible endpoint
- Environment variables: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### Backend — No Model Changes

- The `content` TextField in `TimelineEntry` stores Markdown instead of plain text
- No schema migration needed — Markdown is just text
- No API changes — same endpoints, same payload structure

### Integration Points

**Contact detail page (`contacts/[id]/page.tsx`):**
- Replace `<Input>` note input with `<RichTextEditor>`
- Editor in expandable panel or inline
- "Add" button sends Markdown to `POST /api/activities/`

**Deals page:**
- Same `<RichTextEditor>` component
- Same `POST /api/activities/` endpoint with `entry_type: "note_added"`

## Backward Compatibility

- Existing plain-text notes display correctly in Markdown renderers
- No data migration needed
- AI can read/write Markdown format natively

## Alternatives Considered

| Approach | Storage | AI Compat | Complexity |
|----------|---------|-----------|------------|
| **Tiptap + Markdown** (chosen) | Markdown | Excellent | Medium |
| Tiptap + HTML | HTML | Medium | Simple |
| Slate.js + JSON | JSON | Poor | High |
| Raw Markdown editor | Markdown | Excellent | Low (but poor UX) |
