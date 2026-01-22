# Copy to Teams - Obsidian Plugin

Transform and copy Markdown content from Obsidian to Microsoft Teams format with preserved formatting.

## Overview

This plugin solves the problem of broken or ugly formatting when copying Markdown content from Obsidian to Microsoft Teams. It transforms Markdown into a Teams-compatible format that preserves visual structure and readability.

## Features

- **Numbered Headings**: Converts headings to hierarchical numbered format (1, 1.1, 1.1.1)
- **Tables**: Transforms tables to monospaced grid format that aligns correctly in Teams
- **Lists & Checkboxes**: Preserves nested lists with proper indentation and converts checkboxes to emoji
- **Code Blocks**: Maintains code block formatting for Teams
- **Inline Formatting**: Preserves bold, italic, and strikethrough text
- **Links**: Handles both wikilinks and external links
- **Customizable**: Extensive settings for checkbox symbols, heading styles, and more

## Installation

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/JostBrand/copy-to-teams/releases)
2. Extract the files to your Obsidian plugins folder:
   - On Windows: `%APPDATA%\Obsidian\plugins\copy-to-teams\`
   - On macOS: `~/Library/Application Support/obsidian/plugins/copy-to-teams/`
   - On Linux: `~/.config/obsidian/plugins/copy-to-teams/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### From Obsidian Community Plugins

> Coming soon - the plugin will be submitted to the Obsidian community plugins directory

## Usage

### Copy Current Selection or Note

1. **Using the Context Menu**:
   - Right-click in the editor
   - Select "Copy to Teams"

2. **Using the Command Palette**:
   - Press `Ctrl/Cmd + P` to open the command palette
   - Type "Copy to Teams"
   - Press Enter

3. **Using a Hotkey** (optional):
   - Go to Settings → Hotkeys
   - Search for "Copy to Teams"
   - Assign your preferred hotkey (e.g., `Ctrl/Cmd + Shift + T`)

### Behavior

- If text is selected, only the selection is copied
- If no text is selected, the entire note is copied
- A notification appears when the copy is successful
- Both HTML and plain text are copied to the clipboard for maximum compatibility

## Supported Markdown Elements

### In Scope (v0.1)

- Headings (H1–H6)
- Tables (complex cell content supported)
- Nested lists (ordered, unordered, up to 3 levels)
- Checkboxes with state preservation
- Inline code and fenced code blocks
- Wikilinks and external links
- Tags
- Bold, italic, strikethrough
- Frontmatter (stripped by default)

### Backlog (Future Versions)

- Syntax highlighting for code blocks
- Callouts / admonitions
- Embedded images
- Mermaid diagrams

## Settings

Access settings via Settings → Copy to Teams

### Checkbox Formatting

- **Checked checkbox**: Choose symbol (✅, ☑️, or [x])
- **Unchecked checkbox**: Choose symbol (⬜, ☐, or [ ])

### Content Handling

- **Strip tags**: Remove #tags from output
- **Strip frontmatter**: Remove YAML frontmatter (enabled by default)
- **Collapse empty lines**: Reduce multiple consecutive empty lines to one

### Heading Style

- **Numbered**: 1, 1.1, 1.1.1 (default)
- **Bold**: Bold headings without numbers
- **Uppercase**: Convert to uppercase

### Link Formatting

- **Show wikilink URLs**: Display resolved URLs for [[wikilinks]]
- **External link format**:
  - Text only
  - Text (URL)
  - Hyperlink (HTML)

### Table Style

- **Simple grid**: Uses `|---|` format (default)
- **Unicode box**: Uses `┌─┐` characters (coming soon)

### User Interface

- **Show notification**: Display success message after copying

## Examples

### Headings

**Input:**
```markdown
# Project Overview
## Goals
### Q1 Objectives
```

**Output:**
```
**1. Project Overview**
**1.1 Goals**
**1.1.1 Q1 Objectives**
```

### Tables

**Input:**
```markdown
| Name   | Status  | Owner |
|--------|---------|-------|
| Task A | Done    | Jost  |
| Task B | Pending | Anna  |
```

**Output:**
```
| Name   | Status  | Owner |
|--------|---------|-------|
| Task A | Done    | Jost  |
| Task B | Pending | Anna  |
```
*(Rendered in monospace for alignment)*

### Checkboxes

**Input:**
```markdown
- [x] Review document
  - [ ] Check tables
  - [x] Verify links
```

**Output:**
```
✅ Review document
   ⬜ Check tables
   ✅ Verify links
```

## Development

### Build from Source

```bash
# Clone the repository
git clone https://github.com/JostBrand/copy-to-teams.git
cd copy-to-teams

# Install dependencies
npm install

# Build the plugin
npm run build

# For development with auto-rebuild
npm run dev
```

### Project Structure

```
├── main.ts          # Plugin entry point
├── parser.ts        # Markdown parsing using remark
├── transformer.ts   # AST transformation to Teams format
├── clipboard.ts     # Clipboard operations
├── settings.ts      # Settings UI
├── types.ts         # TypeScript interfaces
└── DESIGN.md        # Detailed design document
```

## Technical Details

- Uses [remark](https://github.com/remarkjs/remark) and [remark-gfm](https://github.com/remarkjs/remark-gfm) for robust Markdown parsing
- Transforms Markdown AST to Teams-compatible HTML and plain text
- Writes both MIME types to clipboard for maximum compatibility
- Tested with Microsoft Teams desktop app (Windows/macOS)

## Troubleshooting

### Formatting doesn't look right in Teams

- Make sure you're pasting into Teams desktop app (web version has different limitations)
- Try changing the link format in settings
- For tables, ensure they're wrapped in code blocks for monospace alignment

### Copy fails silently

- Check if clipboard permissions are enabled in your browser/Obsidian
- Try the plain text fallback by checking the notification message

### Code blocks lose formatting

- Ensure the code block uses triple backticks in Markdown
- Teams may not preserve all code formatting in chat (this is a Teams limitation)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/JostBrand/copy-to-teams/issues)
- **Discussions**: [GitHub Discussions](https://github.com/JostBrand/copy-to-teams/discussions)

## Changelog

### v0.1.0 (2026-01-22)

- Initial release
- Basic Markdown transformation
- Context menu integration
- Configurable settings
- Support for headings, lists, tables, code blocks, and inline formatting

## Acknowledgments

- Built with the [Obsidian Plugin API](https://docs.obsidian.md/)
- Uses [remark](https://github.com/remarkjs/remark) for Markdown parsing
- Inspired by the need for better Obsidian → Teams workflow
