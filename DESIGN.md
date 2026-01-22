
# Obsidian Teams Copy Plugin — Design Document

**Version:** 0.1 (Draft)  
**Author:** Jost / Claude  
**Date:** 2026-01-22

---

## 1. Overview

### 1.1 Problem Statement

Copying Markdown content from Obsidian to Microsoft Teams results in broken or ugly formatting. Teams chat does not natively support Markdown and has limited rich text capabilities, causing tables, nested lists, checkboxes, and headings to render poorly or lose structure entirely.

### 1.2 Solution

An Obsidian plugin that transforms Markdown content into a Teams-compatible format and copies it to the clipboard. The transformation preserves visual structure and readability within Teams' constraints.

### 1.3 Target Users

Information workers who draft content in Obsidian (meeting notes, task lists, technical documentation) and need to share it in Teams chats or group chats.

---

## 2. Functional Requirements

### 2.1 Core Functionality

| ID | Requirement |
|----|-------------|
| F-01 | Transform Markdown to Teams-compatible rich text/HTML |
| F-02 | Copy transformed content to system clipboard |
| F-03 | Trigger via right-click context menu ("Copy to Teams") |
| F-04 | Copy current selection if present, otherwise entire note |
| F-05 | Display notification on successful copy |
| F-06 | Target: MS Teams desktop app (Windows/macOS) |

### 2.2 Content Scope

**In Scope (v1.0):**
- Headings (H1–H6)
- Tables (including complex cell content)
- Nested lists (ordered, unordered, max 3 levels)
- Checkboxes with state preservation
- Inline code and fenced code blocks
- Wikilinks and external links
- Tags
- Bold, italic, strikethrough
- Frontmatter (stripped by default)

**Backlog:**
- Syntax highlighting for code blocks
- Callouts / admonitions
- Embedded images
- Mermaid diagrams

---

## 3. Transformation Rules

### 3.1 Headings

Headings are converted to **bold numbered text** to establish visual hierarchy without relying on Teams' limited heading support.

| Markdown | Output |
|----------|--------|
| `# Title` | **1. Title** |
| `## Section` | **1.1 Section** |
| `### Subsection` | **1.1.1 Subsection** |

Numbering resets per document. Counter state is maintained during transformation.

### 3.2 Tables

Tables are converted to a fixed-width text representation using Unicode box-drawing characters or a simplified ASCII grid, as Teams does not render HTML tables in chat.

**Input:**
```markdown
| Name | Status | Owner |
|------|--------|-------|
| Task A | Done | Jost |
| Task B | Pending | Anna |
```

**Output Option A (Unicode box):**
```
┌────────┬─────────┬───────┐
│ Name   │ Status  │ Owner │
├────────┼─────────┼───────┤
│ Task A │ Done    │ Jost  │
│ Task B │ Pending │ Anna  │
└────────┴─────────┴───────┘
```

**Output Option B (Simple grid):**
```
| Name   | Status  | Owner |
|--------|---------|-------|
| Task A | Done    | Jost  |
| Task B | Pending | Anna  |
```

**Design Decision:** Start with Option B (simple grid) wrapped in a code block for monospace alignment. Add Unicode box as configurable option later if needed.

### 3.3 Lists and Checkboxes

Nested lists preserve indentation using spaces. Checkboxes are converted to emoji.

| Markdown | Output |
|----------|--------|
| `- [ ] Task` | ⬜ Task |
| `- [x] Task` | ✅ Task |
| `1. Item` | 1. Item |
| Nested items | 3 spaces per level |

**Example:**
```markdown
- [x] Review document
  - [ ] Check tables
  - [x] Verify links
    - [ ] External links
```

**Output:**
```
✅ Review document
   ⬜ Check tables
   ✅ Verify links
      ⬜ External links
```

### 3.4 Code Blocks

**Inline code:** Preserved with backticks or converted to monospace if Teams supports it via HTML.

**Fenced code blocks:** Wrapped in Teams' code block format (triple backticks). Language identifier is stripped as Teams doesn't support syntax highlighting in chat.

**Input:**
````markdown
```python
def hello():
    print("Hello, Teams!")
```
````

**Output:**
```
def hello():
    print("Hello, Teams!")
```

Teams desktop app will render this as a code block when pasted.

### 3.5 Links

| Type | Markdown | Output |
|------|----------|--------|
| Wikilink | `[[Page Name]]` | Page Name |
| Wikilink with alias | `[[Page Name\|Display]]` | Display |
| External link | `[Text](url)` | Text (url) or hyperlink if HTML supported |

Default: Display text only. URL optionally appended in parentheses (configurable).

### 3.6 Tags

| Setting | Input | Output |
|---------|-------|--------|
| Keep | `#meeting` | #meeting |
| Strip | `#meeting` | *(removed)* |

### 3.7 Frontmatter

YAML frontmatter (`---` delimited block at document start) is stripped by default.

### 3.8 Inline Formatting

| Markdown | Teams Output |
|----------|--------------|
| `**bold**` | **bold** (via HTML `<b>`) |
| `*italic*` | *italic* (via HTML `<i>`) |
| `~~strike~~` | ~~strike~~ (via HTML `<s>`) |

### 3.9 Empty Lines

Consecutive empty lines are collapsed to a single empty line to prevent excessive whitespace.

---

## 4. Configuration

Settings are exposed via Obsidian's settings panel under the plugin section.

| Setting | Type | Options | Default |
|---------|------|---------|---------|
| Checkbox (checked) | Dropdown | ✅, ☑️, [x] | ✅ |
| Checkbox (unchecked) | Dropdown | ⬜, ☐, [ ] | ⬜ |
| Tag handling | Toggle | Keep / Strip | Keep |
| Frontmatter | Toggle | Strip / Keep | Strip |
| Heading style | Dropdown | Numbered / Bold / Uppercase | Numbered |
| Empty line handling | Toggle | Collapse / Preserve | Collapse |
| Show notification | Toggle | On / Off | On |
| Wikilink URLs | Toggle | Hide / Show in parentheses | Hide |
| Table style | Dropdown | Simple grid / Unicode box | Simple grid |
| External link format | Dropdown | Text only / Text (URL) / Hyperlink | Text (URL) |

---

## 5. Technical Architecture

### 5.1 High-Level Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User triggers  │────▶│  Get selection   │────▶│  Parse Markdown │
│  "Copy to Teams"│     │  or full note    │     │  to AST         │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Show toast     │◀────│  Copy to         │◀────│  Transform AST  │
│  notification   │     │  clipboard       │     │  to Teams format│
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 5.2 Components

| Component | Responsibility |
|-----------|----------------|
| `main.ts` | Plugin entry, register commands and context menu |
| `parser.ts` | Parse Markdown to AST (using remark or Obsidian's parser) |
| `transformer.ts` | Transform AST nodes to Teams-compatible output |
| `clipboard.ts` | Handle clipboard operations (HTML + plain text) |
| `settings.ts` | Settings tab UI and persistence |
| `types.ts` | TypeScript interfaces and types |

### 5.3 Markdown Parsing

**Option A: Use Obsidian's internal parser**
- Pro: Handles Obsidian-specific syntax (wikilinks, callouts) natively
- Con: Less control, undocumented API

**Option B: Use remark/unified ecosystem**
- Pro: Well-documented, extensible, testable
- Con: Additional dependency, need plugins for Obsidian syntax

**Recommendation:** Start with `remark` + `remark-gfm` for tables and checkboxes, add custom plugin for wikilinks. This provides better testability and control.

### 5.4 Clipboard Handling

Teams accepts both HTML and plain text from clipboard. To maximize compatibility:

1. Generate both HTML and plain text representations
2. Use `navigator.clipboard.write()` with multiple MIME types:
   - `text/html` — for rich formatting (bold, italic, links)
   - `text/plain` — fallback for code blocks and tables

```typescript
const clipboardItem = new ClipboardItem({
  'text/html': new Blob([htmlContent], { type: 'text/html' }),
  'text/plain': new Blob([plainContent], { type: 'text/plain' }),
});
await navigator.clipboard.write([clipboardItem]);
```

### 5.5 Heading Number State

Heading numbers require state tracking during transformation:

```typescript
interface HeadingState {
  counters: number[]; // [h1Count, h2Count, h3Count, ...]
}

function getHeadingNumber(level: number, state: HeadingState): string {
  // Increment current level
  state.counters[level - 1]++;
  // Reset deeper levels
  for (let i = level; i < state.counters.length; i++) {
    state.counters[i] = 0;
  }
  // Build number string: "1.2.3"
  return state.counters.slice(0, level).join('.');
}
```

---

## 6. User Interface

### 6.1 Context Menu

Add entry to editor context menu (right-click):

```
─────────────────────
  Cut
  Copy
  Paste
─────────────────────
▶ Copy to Teams        ← New entry
─────────────────────
```

### 6.2 Command Palette

Register command: `Copy to Teams`

Optional hotkey: User-configurable (suggest `Ctrl+Shift+T` / `Cmd+Shift+T`)

### 6.3 Notification

On successful copy, display Obsidian notice:

```
✓ Copied to clipboard (Teams format)
```

Duration: 2 seconds, non-blocking.

---

## 7. Implementation Plan

### Phase 1: MVP (v0.1)

| Task | Priority | Estimate |
|------|----------|----------|
| Project scaffold (TypeScript, esbuild) | P0 | 1h |
| Basic Markdown parsing (remark) | P0 | 2h |
| Transform: headings (numbered) | P0 | 1h |
| Transform: lists + checkboxes | P0 | 2h |
| Transform: tables (simple grid) | P0 | 3h |
| Transform: code blocks | P0 | 1h |
| Transform: inline formatting | P0 | 1h |
| Clipboard write (HTML + plain) | P0 | 1h |
| Context menu integration | P0 | 1h |
| Basic settings panel | P1 | 2h |
| Notification | P1 | 0.5h |
| **Total** | | **~15h** |

### Phase 2: Polish (v0.2)

| Task | Priority |
|------|----------|
| Wikilink transformation | P1 |
| Tag handling (configurable) | P1 |
| Frontmatter stripping | P1 |
| Comprehensive settings UI | P1 |
| Unicode box table option | P2 |
| Edge case handling | P1 |

### Phase 3: Backlog (v0.3+)

| Task |
|------|
| Syntax highlighting (if Teams ever supports it) |
| Callout transformation |
| Image handling (placeholder or link) |
| Mermaid diagram → image conversion |

---

## 8. Testing Strategy

### 8.1 Unit Tests

- Transformer functions for each Markdown element
- Heading number state management
- Edge cases: empty input, malformed Markdown, deeply nested structures

### 8.2 Integration Tests

- Full document transformation
- Clipboard write/read cycle

### 8.3 Manual Test Cases

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| T-01 | Copy simple paragraph | Plain text preserved |
| T-02 | Copy H1 → H3 sequence | Numbered 1, 1.1, 1.1.1 |
| T-03 | Copy 3-level nested checkbox list | Emoji + indentation preserved |
| T-04 | Copy table with 5 columns | Grid aligned in monospace |
| T-05 | Copy Python code block | Code block in Teams |
| T-06 | Copy note with frontmatter | Frontmatter stripped |
| T-07 | Paste in Teams chat | Formatting intact |
| T-08 | Paste in Teams group chat | Formatting intact |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Teams clipboard behavior changes | High | Abstract clipboard logic; monitor Teams updates |
| Complex tables break alignment | Medium | Fallback to HTML table or warn user |
| Obsidian API changes | Low | Pin API version; follow Obsidian releases |
| Performance on large documents | Low | Process in chunks if needed; test with 1000+ line docs |

---

## 10. Open Questions

1. **Table cell wrapping:** How should long cell content be handled? Truncate, wrap, or let it overflow?
2. **Mixed content in cells:** Can cells contain checkboxes, code, or bold? If so, those transformations must be recursive.
3. **Hotkey default:** Should we ship with a default hotkey or leave unassigned?

---

## 11. Appendix

### A. Teams Formatting Limitations (as of 2026-01)

- No native Markdown rendering in chat
- Limited HTML support: `<b>`, `<i>`, `<s>`, `<a>`, `<code>`, `<pre>`
- No `<table>` rendering in chat messages
- No heading tags (`<h1>`, etc.)
- Code blocks supported via triple backticks (no syntax highlighting)
- Max message length: ~28,000 characters

### B. Related Projects

- [obsidian-copy-as-html](https://github.com/mvdkwast/obsidian-copy-as-html) — general HTML copy
- [obsidian-copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link) — block reference copy

### C. References

- Obsidian Plugin API: https://docs.obsidian.md/
- remark: https://github.com/remarkjs/remark
- Teams message formatting: https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-format
