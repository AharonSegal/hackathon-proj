# UI / Frontend Suggestions

Ideas to improve the user interface and frontend experience.

---

## Already Built ✅

- **GradientButton** — primary action button with indigo base + purple shimmer sweep on hover
- **Sidebar reordering** — top: Dashboard, Events, Todos, Notes, Messages; bottom: Calendar, Daily Times, Trash, Settings
- **Trash page** — grouped notes/events sections, per-item restore/delete, multi-select bulk toolbar, Empty Trash
- **Todos page** — rocket-launch completion animation (shake → fly → slide-out), confetti, show/hide completed, active count in subtitle
- **Attachment modals** — paperclip badge with count on NoteCard and EventCard; full attachment manager modal

---

## Todos

- **Drag-and-drop reorder** — drag active todos to reorder them (react-dnd or dnd-kit); persist order in DB via an `order` column
- **Due date picker** — inline date input on each todo row; overdue items turn red
- **Priority badge** — small colored dot (green/yellow/orange/red) beside the todo title
- **Swipe to complete on mobile** — swipe right on a todo row to trigger the rocket animation
- **Completed todos count badge** — show a small count badge next to "Show completed" so the user knows how many without expanding
- **Bulk actions** — select multiple active todos and bulk-complete or bulk-delete them (same multi-select pattern as TrashPage)
- **Empty state illustration** — replace the plain CheckSquare icon with a more cheerful illustrated empty state

## Notes

- **Tag filter chips** — horizontal scrollable row of tag chips above the notes list; clicking one filters to notes with that tag
- **Folder collapse** — allow collapsing a folder section in the sidebar to hide its notes
- **Note word count** — show a live word/block count in the editor footer
- **Pin animation** — small bounce animation when a note is pinned/unpinned
- **Search bar** — search input above the notes list that filters by title and content in real-time

## Trash

- **Filter tabs** — "All / Notes / Events" tab row at the top of TrashPage to view one type at a time
- **Deleted-ago relative time** — show "3 days ago" instead of just the date for recently deleted items
- **Undo toast** — when deleting or emptying trash, show a 5-second undo toast (like Gmail) that cancels the operation before it's final
- **Trash item count badge** — show a small count badge on the Trash sidebar link when there are items in trash (same as email unread count)

## Calendar

- **Month/week/day view toggle** — switch between month, week (7-column day timeline), and day (single-day hour grid) views
- **Event tooltip on hover** — small popover with full title, time, and description on hover over a truncated pill
- **"Today" highlight ring** — pulsing ring animation around today's date cell
- **Color-coded holiday categories** — distinct colors for major holidays, minor holidays, Israeli national days, parasha
- **Mini month picker** — sidebar calendar widget for jumping to a month by clicking a small preview grid

## Dashboard

- **Todos widget** — show active todo count and the next 3 upcoming todos directly on the dashboard
- **Charts / graphs** — bar chart of events per week/month; line chart of messages sent over time (recharts)
- **Quick-add widget** — inline "add event" or "add todo" input on the dashboard without opening a modal
- **Upcoming events timeline** — replace the flat list with a vertical timeline (line with dots)

## Messages

- **Message preview modal** — show full message content in a confirmation modal before sending
- **Bulk send** — select multiple recipients and send to all in one action
- **Message templates library** — dedicated screen to create and reuse message templates
- **Email HTML editor** — rich text / HTML mode toggle for the email composer

## General UX

- **Loading skeletons** — replace blank spaces during data fetch with animated skeleton placeholders
- **Undo / redo** — 5-second "Undo" toast after deleting a note, event, or todo (soft-delete makes this trivial)
- **Responsive / mobile layout** — collapsible sidebar (hamburger menu), touch-friendly day cells, bottom-sheet modals
- **Accessibility (a11y)** — ensure all interactive elements have `aria-label`s, visible focus rings, and full keyboard navigation
- **Onboarding tour** — first-run walkthrough highlighting key features for new users
- **PWA manifest** — add `manifest.json` so the app is installable on phone home screen
