# Task Editor — Full Feature Specification

> **Context:** This is a main-window editor (not a popup/modal). Built in React.
> **Icon library:** `lucide-react` — install via `npm install lucide-react`. See Section 15 for the complete icon map.

---

## 1. Task Title

- **Type:** Single-line text input
- **Placeholder:** `"Task name"`
- **Font:** 20px, semibold, color `#202020`
- **Border:** None (borderless input), bottom border `1px solid #f0f0f0` on focus
- **Full width**

---

## 2. Description

- **Type:** Multi-line textarea (auto-expanding)
- **Placeholder:** `"Description"` in `#999` color
- **Font:** 14px, regular, color `#444`
- **Border:** None
- **Below the title, separated by 8px gap**

---

## 3. Toolbar Row (horizontal, below description)

A horizontal row of pill-shaped buttons/chips. Each chip has an icon + label.
Chip style: `border: 1px solid #e0e0e0`, `border-radius: 20px`, `padding: 6px 12px`, `gap: 8px` between chips, `font-size: 13px`, `color: #555`, `background: #fff`.

### Chips in order:

| # | Label | Lucide Icon | Behavior |
|---|-------|-------------|----------|
| 1 | **Date** (shows selected date e.g. "Today") | `Calendar` | Opens date section. When a date is set, chip turns green bg `#e8f5e9` with green text `#1b7d2c`. Shows an `X` button to clear. |
| 2 | **Attachment** | `Paperclip` | Opens file picker |
| 3 | **Priority** | `Flag` | Opens priority section. Flag icon color matches selected priority. |
| 4 | **Reminders** | `Bell` | Opens reminders section |
| 5 | **Location** | `MapPin` | Opens location input |
| 6 | **Deadline** | `AlertTriangle` | Opens deadline date picker (separate from due date) |

---

## 4. Date & Scheduling Section

When the Date chip is clicked, this section expands inline below the toolbar.

### 4.1 Calendar Mode Toggle

At the top of the date section, a toggle/segmented control:

| Option | Label |
|--------|-------|
| Left | **Hebrew** (לועזי) |
| Right | **Gregorian** |

- **Toggle style:** Segmented control, selected tab has `background: #db4c3f` (Todoist red) with white text, unselected is `#f5f5f5` with `#666` text.
- **Default:** Gregorian
- When Hebrew is selected, the calendar grid shows Hebrew month names and Hebrew day numbers. Use a library like `hebcal` or `date-fns` with Hebrew locale.

### 4.2 Quick-Pick Shortcuts

A vertical list of shortcut rows. Each row: icon on left, label, resolved date on the right in `#999`.

| Icon (Lucide) | Label | Resolved Date Example |
|---------------|-------|-----------------------|
| `Sun` | Tomorrow | Tue |
| `CalendarRange` | Later this week | Wed |
| `Sofa` (or `CalendarDays`) | This weekend | Sat |
| `ArrowRight` | Next week | Mon 30 Mar |
| `CircleOff` | No Date | — |

- Row style: `padding: 10px 16px`, hover `background: #f5f5f5`, `font-size: 14px`
- Icon color: Each has a unique muted color:
  - Tomorrow: `#ff9a14` (orange-yellow)
  - Later this week: `#7c3aed` (purple)
  - This weekend: `#0ea5e9` (blue)
  - Next week: `#8b5cf6` (violet)
  - No Date: `#999`

### 4.3 Calendar Grid

- **Month/year header:** e.g. "Mar 2026" or Hebrew equivalent, `font-size: 15px`, `font-weight: 600`
- **Navigation:** `ChevronLeft` and `ChevronRight` arrows, with a small circle between them (click to return to today)
- **Day-of-week headers:** M T W T F S S (single letters), `font-size: 12px`, `color: #999`
- **Day cells:** `width: 36px`, `height: 36px`, centered text, `font-size: 13px`
  - **Today:** Red circle `background: #db4c3f`, white text
  - **Selected day (if not today):** Light red circle `background: #fde8e8`, text `#db4c3f`
  - **Hover:** `background: #f0f0f0`
  - **Past days:** `color: #ccc`
  - **Other month overflow days:** `color: #ddd`
- **Scrollable:** Show current month + next month. Infinite scroll or month-by-month navigation.
- Shabbat/weekend columns can be lightly shaded `#fafafa` (optional).

### 4.4 Time Picker

- **Button:** Full width, `border: 1px solid #e0e0e0`, `border-radius: 8px`, `padding: 10px`
- **Icon:** `Clock` (Lucide), left of label "Time"
- **On click:** Expands to show hour:minute picker
  - Two side-by-side scroll selectors or dropdowns: Hours (1–12) and Minutes (00, 05, 10, ... 55)
  - AM/PM toggle
  - Or a 24-hour input field, depending on locale

### 4.5 Repeat / Recurrence

- **Button:** Same style as Time button
- **Icon:** `Repeat` (Lucide), left of label "Repeat"
- **On click:** Expands to recurrence options:
  - Quick picks: Daily, Weekly, Monthly, Yearly
  - Custom: Every `[number]` `[day/week/month/year]`
  - On specific days (for weekly): checkboxes for Su Mo Tu We Th Fr Sa
  - End condition: Never / On date / After X occurrences

---

## 5. Priority Section

When the Priority chip is clicked, this section expands inline.

A vertical list of 4 options. Each row has a flag icon and label. Selected row has a checkmark `Check` icon on the right.

| Flag Color | Label | Hex |
|------------|-------|-----|
| 🔴 Filled red flag | Priority 1 | `#db4c3f` |
| 🟠 Filled orange flag | Priority 2 | `#f49c18` |
| 🔵 Filled blue flag | Priority 3 | `#4073ff` |
| ⚪ Outline-only flag | Priority 4 (default) | `#808080` (outline only, no fill) |

- **Icon:** Use Lucide `Flag` icon. For P1–P3, the icon is filled (use `fill` prop + `stroke` same color). For P4, outline only (default Lucide rendering).
- **Row style:** `padding: 10px 16px`, hover `background: #f5f5f5`
- **Selected indicator:** `Check` icon in `#db4c3f` on the right side of the selected row
- **Default:** Priority 4

---

## 6. Reminders Section

When the Reminders chip is clicked, this section expands inline.

### 6.1 Section Header

- **Title:** "Reminders" in `font-weight: 600`, `font-size: 15px`

### 6.2 Mode Tabs

Segmented control / pill toggle with two tabs:

| Tab | Label | Icon |
|-----|-------|------|
| Left | Date & time | `CalendarClock` — with a small orange settings gear overlay (or just the text) |
| Right | Before task | (text only) |

- **Active tab:** `background: #f5f5f5`, `border: 1px solid #e0e0e0`, `font-weight: 600`
- **Inactive tab:** `background: transparent`, `color: #666`

### 6.3 Date & Time Mode (default)

- **Dropdown:** Full-width select, default value "At time of task"
- **Icon:** `Clock` on the left inside the dropdown
- **Dropdown options:**
  - At time of task
  - 5 minutes before
  - 10 minutes before
  - 15 minutes before
  - 30 minutes before
  - 1 hour before
  - 2 hours before
  - 1 day before
  - Custom date & time (opens a mini date-time picker)
- **Helper text:** Below the dropdown, `font-size: 12px`, `color: #999`: "Get a notification when it's time for this task."

### 6.4 Before Task Mode

- **Dropdown:** Same style, options:
  - 5 minutes before
  - 10 minutes before
  - 15 minutes before
  - 30 minutes before
  - 1 hour before
  - 2 hours before
  - 1 day before
  - 2 days before
  - 1 week before

### 6.5 Add Reminder Button

- **Style:** `background: #db4c3f`, `color: white`, `border-radius: 8px`, `padding: 8px 20px`, `font-weight: 600`
- **Label:** "Add reminder"
- **Alignment:** Right-aligned
- **Behavior:** Adds the reminder to a list. Multiple reminders can be added. Each added reminder shows as a chip with an `X` to remove.

---

## 7. Location Section

When the Location chip is clicked, expands inline.

- **Text input:** `placeholder: "Add a location"`, with `MapPin` icon
- **Autocomplete:** Optional integration with a geocoding API
- **Selected location:** Shows as a chip with the location name and an `X` to clear

---

## 8. Deadline Section

When the Deadline chip is clicked, expands inline.

- **Explanation text:** `font-size: 12px`, `color: #999`: "A hard deadline, separate from the scheduled date."
- **Same date picker UI as section 4** (quick picks + calendar grid + Hebrew/Gregorian toggle), but stored as a separate field (`deadline` vs `dueDate`)

---

## 9. Attachment Section

When the Attachment chip is clicked:

- Opens native file picker (`<input type="file" multiple />`)
- **Accepted types:** All common types (images, PDFs, docs, etc.)
- **Attached files display:** Below the toolbar as a horizontal list of file chips
  - Each chip: file icon (based on type) + filename (truncated) + file size + `X` to remove
  - Image files show a small thumbnail `32x32`

---

## 10. Project Selector (Bottom Left)

- **Position:** Bottom of the editor, left-aligned
- **Icon:** `Inbox` (Lucide) or project-specific icon/color
- **Label:** Project name, e.g. "Inbox"
- **Dropdown arrow:** `ChevronDown`
- **Style:** `font-size: 13px`, `color: #666`, clickable
- **On click:** Dropdown with all projects, each with their color dot + name
- **Default:** "Inbox"

---

## 11. Action Buttons (Bottom Right)

- **Position:** Bottom of the editor, right-aligned
- **Cancel button:**
  - `background: transparent`, `color: #666`, `border: none`, `font-size: 14px`
  - Label: "Cancel"
- **Add Task / Save button:**
  - `background: #db4c3f`, `color: white`, `border-radius: 8px`, `padding: 8px 20px`, `font-weight: 600`, `font-size: 14px`
  - Label: "Add task" (new task) or "Save" (editing)
  - **Disabled state:** `opacity: 0.5`, when title is empty

---

## 12. Color Palette Reference

| Usage | Hex | Description |
|-------|-----|-------------|
| Primary / CTA | `#db4c3f` | Todoist red — buttons, today indicator, active states |
| Primary hover | `#c53929` | Darker red on hover |
| Text primary | `#202020` | Main text |
| Text secondary | `#666` | Labels, secondary info |
| Text muted | `#999` | Placeholders, helper text |
| Text disabled | `#ccc` | Past dates, disabled elements |
| Border | `#e0e0e0` | Chip borders, dividers |
| Background hover | `#f5f5f5` | List row hover, inactive tabs |
| Background surface | `#fafafa` | Subtle section backgrounds |
| Date chip active bg | `#e8f5e9` | Green tint when date is set |
| Date chip active text | `#1b7d2c` | Green text when date is set |
| Priority 1 | `#db4c3f` | Red flag |
| Priority 2 | `#f49c18` | Orange flag |
| Priority 3 | `#4073ff` | Blue flag |
| Priority 4 | `#808080` | Gray outline flag |
| Quick-pick: Tomorrow | `#ff9a14` | Orange-yellow icon |
| Quick-pick: Later this week | `#7c3aed` | Purple icon |
| Quick-pick: This weekend | `#0ea5e9` | Blue icon |
| Quick-pick: Next week | `#8b5cf6` | Violet icon |

---

## 13. Overall Layout Summary

```
┌─────────────────────────────────────────────┐
│ [Task title input]                          │
│ [Description textarea]                      │
│                                             │
│ [Date] [Attachment] [Priority] [Reminders]  │
│ [Location] [Deadline]                       │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │  (Expanded section for whichever chip   │ │
│ │   is active — only one open at a time)  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Attached files chips row]                  │
│                                             │
│ 📥 Inbox ▾                    Cancel  [Add] │
└─────────────────────────────────────────────┘
```

---

## 14. Interaction Rules

1. **One section open at a time** — clicking a chip closes any other open section and opens the new one. Clicking the same chip again closes it.
2. **Auto-save chip state:** When a user picks a date, priority, etc., the chip updates immediately (e.g. flag color changes, date label updates).
3. **Escape key:** Closes the currently open section.
4. **Tab order:** Title → Description → Chips left-to-right → Project → Cancel → Add Task.

---

## 15. Icon Library & Complete Icon Reference

### Recommended Library: `lucide-react`

**Install:** `npm install lucide-react`
**Import pattern:** `import { Calendar, Flag, Bell } from 'lucide-react'`
**Default icon size:** `size={16}` for chips, `size={18}` for section rows, `size={20}` for headers.
**Default stroke width:** `strokeWidth={2}`

### Complete Icon Map — Every Icon Used in This Spec

| Where Used | Lucide Import Name | Props / Notes |
|------------|---------------------|---------------|
| **Toolbar Chips** | | |
| Date chip | `Calendar` | `size={16}`, default color `#555`, green `#1b7d2c` when date set |
| Attachment chip | `Paperclip` | `size={16}`, color `#555` |
| Priority chip | `Flag` | `size={16}`, color changes to match selected priority |
| Reminders chip | `Bell` | `size={16}`, color `#555` |
| Location chip | `MapPin` | `size={16}`, color `#555` |
| Deadline chip | `AlertTriangle` | `size={16}`, color `#555` |
| Clear/remove (on chips) | `X` | `size={14}`, color `#999` |
| **Date Quick-Picks** | | |
| Tomorrow | `Sun` | `size={18}`, color `#ff9a14` |
| Later this week | `CalendarRange` | `size={18}`, color `#7c3aed` |
| This weekend | `CalendarDays` | `size={18}`, color `#0ea5e9` |
| Next week | `ArrowRight` | `size={18}`, color `#8b5cf6` |
| No Date | `CircleOff` | `size={18}`, color `#999` |
| **Calendar Navigation** | | |
| Previous month | `ChevronLeft` | `size={18}`, color `#666` |
| Next month | `ChevronRight` | `size={18}`, color `#666` |
| Return to today | `Circle` | `size={10}`, color `#ccc`, filled on hover |
| **Date Sub-Buttons** | | |
| Time button | `Clock` | `size={16}`, color `#555` |
| Repeat button | `Repeat` | `size={16}`, color `#555` |
| **Priority Rows** | | |
| Priority 1 flag | `Flag` | `size={18}`, `fill="#db4c3f"`, `stroke="#db4c3f"` |
| Priority 2 flag | `Flag` | `size={18}`, `fill="#f49c18"`, `stroke="#f49c18"` |
| Priority 3 flag | `Flag` | `size={18}`, `fill="#4073ff"`, `stroke="#4073ff"` |
| Priority 4 flag (default) | `Flag` | `size={18}`, `fill="none"`, `stroke="#808080"` (outline only) |
| Selected priority checkmark | `Check` | `size={18}`, color `#db4c3f` |
| **Reminders** | | |
| Date & time tab icon | `CalendarClock` | `size={14}`, color `#555` |
| Dropdown clock icon | `Clock` | `size={16}`, color `#999` |
| Dropdown arrow | `ChevronDown` | `size={14}`, color `#999` |
| Remove reminder | `X` | `size={14}`, color `#999` |
| **Location** | | |
| Location input icon | `MapPin` | `size={16}`, color `#999` |
| Clear location | `X` | `size={14}`, color `#999` |
| **Attachments** | | |
| Generic file icon | `File` | `size={16}`, color `#999` |
| Image file icon | `Image` | `size={16}`, color `#999` |
| PDF file icon | `FileText` | `size={16}`, color `#999` |
| Remove attachment | `X` | `size={14}`, color `#999` |
| **Project Selector** | | |
| Inbox icon | `Inbox` | `size={16}`, color `#666` |
| Project dropdown arrow | `ChevronDown` | `size={14}`, color `#999` |
