---
name: modal-design
description: Modern SaaS modal pattern for this project (sticky header/footer, compact 2-column fields, thin scrollbar). Use whenever creating or editing a form modal in components/**/*Modal.jsx or *Dialog.jsx.
---

# Modal design pattern

Reference implementation: `components/notices/NoticeFormModal.jsx` + `components/Modal.jsx`. Apply this to every modal built on the shared `components/Modal.jsx`, not just Notices.

## Why

A tall form modal with the Cancel/Submit row inline at the bottom of the scrollable content forces the user to scroll past every field just to find the buttons, and they disappear while scrolling. This pattern fixes that and matches modern SaaS modals (Linear, Notion, Stripe Dashboard, Clerk, Vercel).

## What `Modal.jsx` provides

- `size="lg"` → `max-w-[640px]` (in addition to existing `md` and `xl`).
- `footer` prop (optional) — renders pinned to the bottom, outside the scrollable body, with a top border + soft shadow separating it from content. Omit it and the modal behaves exactly as before (buttons scroll with content) — only opt in for a modal whose content is actually tall enough to scroll.
- Header (icon/title/description) always stays fixed at the top; only the middle body scrolls. `max-h-[85vh]`, `rounded-[24px]`.
- Scrollbar: no per-modal CSS needed — `app/globals.css` already sets a thin, subtle global scrollbar (`scrollbar-width: thin`, 2px webkit thumb) applied to every scrollable element in the app, modals included.

## How to wire a form modal

1. Give the `<form>` an `id` (e.g. `id="teacher-form"`).
2. Move the Cancel/Submit button row out of the form's children and into `<Modal footer={...}>`.
3. The submit `<Button>` in the footer needs `form="teacher-form"` (a native HTML attribute — submits the form by id even though the button lives outside its `<form>` tag). `components/Button.jsx` forwards a `form` prop for exactly this.
4. Pass `size="lg"` unless the modal is a short 1-2 field confirm-style dialog (those don't need it — see "When to skip" below).

```jsx
<Modal
  title="..."
  description="..."
  isOpen={isOpen}
  onClose={handleClose}
  size="lg"
  footer={
    <div className="flex flex-col sm:flex-row justify-end gap-3">
      <div className="w-full sm:w-auto">
        <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
      </div>
      <Button type="submit" form="my-form" label={isSubmitting ? 'Saving...' : 'Save'} disabled={isSubmitting} />
    </div>
  }
>
  <form id="my-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
    {/* fields */}
  </form>
</Modal>
```

## Field layout

- Pair related short fields into a 2-column `grid grid-cols-2 gap-4` row instead of stacking them one per row (e.g. Priority + Audience, Expiry Date + Attachment, Class + Section — already the existing convention for Class/Section elsewhere in this codebase).
- A field that's conditionally hidden for one role (e.g. Audience hidden for a Teacher) should still leave its sibling full-width when alone — wrap the row in a ternary (`isTeacher ? '' : 'grid grid-cols-2 gap-4'`) rather than always forcing the grid.
- A file/attachment picker doesn't need `FileDropzone`'s large square preview inside a cramped modal — use a compact single row (icon + filename + small remove button, ~44px tall) with a one-line helper note below it. See `CompactAttachmentField` in `NoticeFormModal.jsx` for the pattern to copy (swap the accept type/size constants for whatever the new modal needs).

## When to skip this

Small dialogs that are really just a confirmation or a single field (e.g. `ResetPasswordDialog.jsx`, `SetActiveDialog.jsx`, `UnassignClassModal.jsx`, `RemarkModal.jsx`) never scroll in the first place — leave them as plain `size="md"` with the button row inline in children. Don't add a `footer` prop or force `size="lg"` on something that's already short; that just adds visual weight for no benefit.
