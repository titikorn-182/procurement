# POL-01 TOR — implemented local extension

## Overview

This Operate-mode extension adds editable, category-specific TOR documents to step 4 of `/requests/new` and the standard returned-request editor. It inherits the Document Control Center in root `DESIGN.md`; it does not introduce a new identity, checklist category, or approval route. Root `DESIGN.md` and `.impeccable/design.json` remain unchanged.

Authority: `SURFACE POL01-TOR-A` in `app/layout.tsx`, `.impeccable/pol01-tor.brief.md`, and the user-approved accordion composition in `.impeccable/mocks/pol01-tor/option-a.json`. The matching surface record is `.impeccable/surfaces/app-requests-tor-fields-tsx.md`. Mockup wording is not authority for behavior: the implementation downloads a preview and generates fresh attachments on submission, not through a separate attach button.

## Colors

Existing tokens remain the source of truth in `app/globals.css`: document paper `--paper` (#fffdf9), reading ink `--ink` (#171b20), rules `--line` (#c7c4bd), field borders `--line-dark` (#6b7075), and orange category headings `--orange-dark` (#9a3412). Existing primary buttons use `--orange` (#c2410c). Alerts use `--red` (#b42318) with explanatory text; white fields contrast with paper. Local focus outlines use `--blue` (#175cd3), alongside the inherited keyboard ring `--focus` (#005fcc). Supporting copy uses the existing stone-600 utility.

**The State Must Read Twice Rule.** Category status, missing content, errors, and unsaved state have words; color alone never reports readiness or approval.

## Typography

The editor inherits Sarabun. Section/category headings are 18px bold; labels and supporting text are 14px, with 24px line-height for introductory explanations. Fields are 16px below the small breakpoint and 14px from it upward. The PDF uses TH SarabunPSK, an 18pt title, 16pt numbered headings, 12pt running category label, and 1.2 page line-height. These are local editor/print roles, not additions to the global display scale.

## Layout

The existing checklist precedes the TOR block; other attachments follow it. Selected categories are full-width native disclosure rows with shared borders. Subject/project and section groups become two columns at the existing `sm` breakpoint and stack in source order below it. Open category content uses 16px horizontal padding, increasing to 20px from `sm`, with 20px spacing between groups.

At a category container width of at least 760px, its open-panel download/remove toolbar shares the heading row: the summary reserves 390px on the right and at least 64px height; the toolbar sits 12px from the top and 20px from the right. Narrow containers keep the wrapping toolbar in normal flow. This is a component container query, not a viewport breakpoint.

**The Category Owns Its TOR Rule.** One category owns one document, its fields, preview, and remove action. Changing checklist selection never silently deletes an existing TOR.

## Elevation & Depth

Persistent TOR surfaces are flat, with paper tone and one-pixel rules instead of shadows. The existing keyboard focus ring supplies interactive emphasis. No new motion or elevation system is introduced.

## Shapes

Square controls and shared-edge category rows inherit the existing dossier language. Inputs use a minimum 44px height and 12px horizontal/8px vertical padding. Existing `Button` variants provide secondary preview and ghost removal controls; there are no new button primitives.

## Components

### Editing and preview

- Choosing a checklist category exposes its disclosure; “เริ่มจัดทำ TOR” explicitly creates its document. New documents copy the current request subject and rationale once, not as a live binding. Existing documents for deselected categories stay visible with an alert and must be reselected or explicitly removed before submission.
- Each document has subject, project, twelve source headings, and three author slots. Background/objectives are initially open within the category; the remaining section disclosures and author group start collapsed. All twelve sections plus subject/project and the first author's name/position are required at submission. Fields expose `aria-required`; missing-section labels, native disclosures, disabled fieldsets, and alert text support operation without relying on color.
- Preview downloads a newly rendered `TOR-<category label>.pdf`; it does not save data or attach the file. Preview buttons show a busy label and disable concurrent previews. Removal asks for confirmation and only removes the selected TOR from local form state until submission.
- Source defaults for qualifications, selection, payment, penalty, warranty, and responsible unit remain editable. They reproduce the supplied sample, not verified legal advice or universally valid purchase/hire conditions. The user must review applicability. Creating a TOR neither checks the checklist nor approves the request.

### Persistence and limits

`procurement_requests.form_data` carries optional `torDocuments` and `removedTorAttachmentIds`; this uses the existing JSON storage and requires no SQL migration. Missing TOR data reads as an empty list, while invalid saved data produces an error rather than silently discarding it.

Each strict `torDocuments` entry has `version: 1`, an existing checklist `category` ID, stable UUID `attachmentId`, `subject`/`project` strings (300 characters each), exactly twelve `sections` strings (5,000 characters each), and exactly three `{ name, position }` author objects (200/300 characters). A maximum of ten documents is accepted, with unique categories and attachment UUIDs. All created documents must belong to selected categories and pass completeness validation; selecting a category does not itself mandate generating a TOR.

`removedTorAttachmentIds` is an optional list of up to ten UUID tombstones. Returned edits merge previously pending removals with previously saved TOR IDs, excluding IDs still present. Persisting these tombstones with the form preserves cleanup intent across failed attempts and reloads. They are not inferred from file names and are not automatically cleared by the client after synchronization.

New submission validates and renders fresh PDFs, saves the request data through draft creation, uploads generated and manually chosen files, then invokes the existing submission action. There is no new standalone Save Draft button, local autosave, or persistence on preview. A failed upload can leave the draft data saved for retry. Returned requests restore structured TOR data; resubmission saves edits and removal tombstones, uploads manual additions, synchronizes TOR files, then invokes the existing return-to-approval action.

Generated PDFs count with all other attachments toward **10 files, 20 MB per file, 50 MB total** (the implementation uses powers of 1024). Serialized `form_data` is limited to 250,000 characters only for the standard form with a nonempty TOR list; the existing 20,000-character limit remains otherwise. These aggregate limits still apply even when individual fields pass validation.

Synchronization replaces PDFs using stable attachment IDs/storage paths, never matching a filename. It upserts file metadata in `request_attachments`, retains unrelated attachments, and removes only explicit obsolete TOR paths. Errors are reported for retry; there is no cross-storage/database transaction or promise of all-or-nothing rollback. A previous valid PDF is not deleted as upload rollback.

### PDF document

`document.tsx` uses the shared A4 paginator and capture verification. All twelve headings are present, with source-aligned page breaks before sections 4 and 11; longer content may create additional pages. Section 4 is bordered, entered line breaks are retained, and long text can wrap. Three unsigned signature spaces remain in the output. The renderer creates an isolated latest snapshot, waits for layout readiness (up to 30 seconds), and cleans up its temporary host after success or failure. It is not a digital-signature or legal-verification service.

### Finish record

Reviewer disposition: **ship**, with two findings resolved: same-row desktop toolbar placement and required-field `aria-required` semantics. Reported local verification: 482 tests across 45 files; lint, typecheck, and formatting passed; desktop/mobile (390px) overflow checks and downloaded/native-print three-page sample inspection completed. Production build status is recorded by the parent task, not asserted here. No Supabase production writes or real-database end-to-end run are claimed, and this record makes no deployment claim.

## Do's and Don'ts

- Do preserve the original checklist categories, approval route, shared buttons, focus treatments, and mobile source order.
- Do keep preview, in-memory editing, persisted form data, and actual uploaded attachments distinct in copy and tests.
- Do regenerate PDFs from current structured data and retain stable IDs when editing returned documents.
- Don't canonize mockup-only controls, invented categories/limits, gradients, approval claims, or source default clauses as system policy.
- Don't treat the three-page sample as a fixed page limit, unsigned signature spaces as signatures, or local QA as evidence of deployment.
