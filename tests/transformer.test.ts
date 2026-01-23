/**
 * Core transformation tests for Copy to Teams plugin
 *
 * These tests focus on the transformer and parser modules which are pure functions
 * that don't depend on the Obsidian API.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, stripFrontmatter, extractFrontmatter } from '../parser';
import { transformToTeams, createHeadingState } from '../transformer';
import type { TransformContext } from '../types';
import { DEFAULT_SETTINGS } from '../types';

/**
 * Helper to create a default transform context
 */
function createContext(overrides?: Partial<TransformContext>): TransformContext {
	return {
		settings: { ...DEFAULT_SETTINGS },
		headingState: createHeadingState(),
		images: new Map(),
		...overrides,
	};
}

/**
 * Helper to transform markdown to Teams format
 */
function transform(markdown: string, context?: Partial<TransformContext>) {
	const ast = parseMarkdown(markdown);
	return transformToTeams(ast, createContext(context));
}

// =============================================================================
// TEST 1: Meeting Notes Document (Full Integration)
// =============================================================================

describe('Meeting Notes Document', () => {
	const meetingNotes = `# Project Status Meeting

## Attendees

- **@John Smith** (Project Lead)
- **@Sarah Connor** (Developer)

## Agenda

### 1. Sprint Review

Key updates:

- [x] Homepage redesign completed
- [ ] Contact form integration
- [-] Analytics dashboard (cancelled)

> [!info] Sprint Progress
> We are at 75% completion.

### 2. Timeline

| Milestone | Due Date | Status |
|-----------|----------|--------|
| Design | 2024-02-20 | Done |
| Dev | 2024-03-01 | WIP |

### 3. Action Items

- [ ] Review mockups by Friday
- [ ] Fix the login bug`;

	it('should transform headings with proportional sizes', () => {
		const result = transform(meetingNotes);

		// H1 should have 24px font size
		expect(result.html).toContain('font-size: 24px');
		// H2 should have 20px font size
		expect(result.html).toContain('font-size: 20px');
		// H3 should have 16px font size
		expect(result.html).toContain('font-size: 16px');
	});

	it('should preserve hierarchical heading numbers', () => {
		const result = transform(meetingNotes);

		// Check numbered headings in plain text
		expect(result.plainText).toContain('# Project Status Meeting');
		expect(result.plainText).toContain('## Attendees');
		expect(result.plainText).toContain('### 1. Sprint Review');
	});

	it('should convert checkboxes to emoji', () => {
		const result = transform(meetingNotes);

		// Checked checkbox
		expect(result.html).toContain('✅');
		// Unchecked checkbox
		expect(result.html).toContain('⬜');
		// Cancelled task
		expect(result.html).toContain('⛔');
	});

	it('should render callouts with styling', () => {
		const result = transform(meetingNotes);

		// Callout should have colored border
		expect(result.html).toContain('border-left: 3px solid');
		// Callout should have info icon
		expect(result.html).toContain('ℹ️');
		// Callout title
		expect(result.html).toContain('Sprint Progress');
	});

	it('should render tables in monospace', () => {
		const result = transform(meetingNotes);

		// Table should be wrapped in <pre> for HTML
		expect(result.html).toContain('<pre>');
		// Table should have pipe characters
		expect(result.html).toContain('|');
		// Plain text should have code fence
		expect(result.plainText).toContain('```');
	});

	it('should produce both HTML and plain text output', () => {
		const result = transform(meetingNotes);

		expect(result.html).toBeTruthy();
		expect(result.plainText).toBeTruthy();
		expect(result.html.length).toBeGreaterThan(100);
		expect(result.plainText.length).toBeGreaterThan(100);
	});
});

// =============================================================================
// TEST 2: Deeply Nested Structure
// =============================================================================

describe('Deeply Nested Structure', () => {
	const nestedContent = `# Nested List Test

- Level 1 item A
   - Level 2 item A.1
      - Level 3 item A.1.1
         - Level 4 item A.1.1.1
      - Level 3 item A.1.2
   - Level 2 item A.2
- Level 1 item B
   - [x] Checked at level 2
      - [ ] Unchecked at level 3
         - [?] Question at level 4

1. Ordered level 1
   1. Ordered level 2
      1. Ordered level 3
   2. Another at level 2

> Blockquote with list inside
> - Item in quote
>    - Nested in quote`;

	it('should maintain correct indentation at all levels', () => {
		const result = transform(nestedContent);

		// Check that indentation increases with depth
		// Level 2 should have 3 spaces, Level 3 should have 6 spaces, etc.
		expect(result.plainText).toContain('   Level 2 item');
		expect(result.plainText).toContain('      Level 3 item');
		expect(result.plainText).toContain('         Level 4 item');
	});

	it('should preserve checkbox states at all nesting levels', () => {
		const result = transform(nestedContent);

		// All checkbox types should be present
		expect(result.html).toContain('✅'); // checked
		expect(result.html).toContain('⬜'); // unchecked
		expect(result.html).toContain('❓'); // question
	});

	it('should number ordered lists correctly at each level', () => {
		const result = transform(nestedContent);

		// Should have "1." at various levels
		expect(result.plainText).toContain('1. Ordered level 1');
		expect(result.plainText).toContain('1. Ordered level 2');
	});

	it('should handle blockquote with nested content', () => {
		const result = transform(nestedContent);

		// Blockquote should be rendered
		expect(result.html).toContain('<blockquote>');
		expect(result.plainText).toContain('> ');
	});
});

// =============================================================================
// TEST 3: Mentions Gauntlet
// =============================================================================

describe('Mentions Gauntlet', () => {
	it('should convert @Name mentions to bold', () => {
		// Note: Mention processing happens in main.ts before parsing
		// Here we test that bold text is preserved through transformation
		const markdown = '**@John Smith** will handle this task.';
		const result = transform(markdown);

		expect(result.html).toContain('<b>@John Smith</b>');
		expect(result.plainText).toContain('**@John Smith**');
	});

	it('should NOT convert mentions inside inline code', () => {
		const markdown = 'Use `@decorator` for the function and contact @John.';
		const result = transform(markdown);

		// @decorator should be in code tags, not bolded
		expect(result.html).toContain('<code>@decorator</code>');
	});

	it('should NOT convert email addresses', () => {
		const markdown = 'Contact us at support@example.com for help.';
		const result = transform(markdown);

		// Email should remain unchanged (not bolded as mention)
		expect(result.plainText).toContain('support@example.com');
		// Should not have bold tags around the email
		expect(result.html).not.toContain('<b>@example.com</b>');
	});

	it('should handle multiple mentions in same paragraph', () => {
		const markdown = '**@John** and **@Sarah** will meet with **@Mike**.';
		const result = transform(markdown);

		expect(result.html).toContain('<b>@John</b>');
		expect(result.html).toContain('<b>@Sarah</b>');
		expect(result.html).toContain('<b>@Mike</b>');
	});
});

// =============================================================================
// TEST 4: HTML Escaping (Security Critical)
// =============================================================================

describe('HTML Escaping', () => {
	it('should escape script tags in paragraphs', () => {
		const markdown = 'Hello <script>alert("xss")</script> world';
		const result = transform(markdown);

		expect(result.html).not.toContain('<script>');
		expect(result.html).toContain('&lt;script&gt;');
	});

	it('should escape HTML in headings', () => {
		const markdown = '# Title with <b>HTML</b> and "quotes"';
		const result = transform(markdown);

		expect(result.html).toContain('&lt;b&gt;');
		expect(result.html).toContain('&quot;quotes&quot;');
	});

	it('should escape HTML in table cells', () => {
		const markdown = `| Header |
|--------|
| <img src=x onerror=alert(1)> |`;
		const result = transform(markdown);

		expect(result.html).not.toContain('<img');
		expect(result.html).toContain('&lt;img');
	});

	it('should escape ampersands correctly', () => {
		const markdown = 'Tom & Jerry & Friends';
		const result = transform(markdown);

		expect(result.html).toContain('&amp;');
		// Should not double-escape
		expect(result.html).not.toContain('&amp;amp;');
	});

	it('should preserve content in code blocks without executing', () => {
		const markdown = '```\n<script>alert("xss")</script>\n```';
		const result = transform(markdown);

		// Should be escaped inside <pre>
		expect(result.html).toContain('<pre>');
		expect(result.html).toContain('&lt;script&gt;');
	});

	it('should escape special characters in inline code', () => {
		const markdown = 'Use `<div class="test">` for the container.';
		const result = transform(markdown);

		expect(result.html).toContain('<code>');
		expect(result.html).toContain('&lt;div');
	});

	it('should handle apostrophes and quotes in text', () => {
		const markdown = "It's a \"quoted\" string with 'single quotes'.";
		const result = transform(markdown);

		expect(result.html).toContain('&#039;');
		expect(result.html).toContain('&quot;');
	});
});

// =============================================================================
// TEST 5: Empty/Minimal Document
// =============================================================================

describe('Empty/Minimal Document', () => {
	it('should handle empty string without crashing', () => {
		const result = transform('');

		expect(result.html).toBe('');
		expect(result.plainText).toBe('');
	});

	it('should handle whitespace-only content', () => {
		const result = transform('   \n\n   \t\t\n   ');

		// Should produce minimal or empty output
		expect(result.html.trim()).toBe('');
		expect(result.plainText.trim()).toBe('');
	});

	it('should handle single word', () => {
		const result = transform('Hello');

		expect(result.html).toContain('Hello');
		expect(result.plainText).toContain('Hello');
	});

	it('should handle single heading', () => {
		const result = transform('# Just a Title');

		expect(result.html).toContain('Just a Title');
		expect(result.html).toContain('font-size: 24px');
	});

	it('should handle content with only frontmatter', () => {
		// After frontmatter is stripped, content is empty
		const markdown = `---
title: Test
---`;
		const stripped = stripFrontmatter(markdown);
		const result = transform(stripped);

		expect(result.html.trim()).toBe('');
		expect(result.plainText.trim()).toBe('');
	});

	it('should handle single checkbox', () => {
		const result = transform('- [ ] Single task');

		expect(result.html).toContain('⬜');
		expect(result.plainText).toContain('⬜');
	});

	it('should handle single code block', () => {
		const result = transform('```\ncode\n```');

		expect(result.html).toContain('<pre>');
		expect(result.plainText).toContain('```');
	});
});

// =============================================================================
// Additional Parser Tests
// =============================================================================

describe('Frontmatter Extraction', () => {
	it('should extract simple key-value pairs', () => {
		const markdown = `---
title: My Meeting
date: 2024-02-15
---
Content here`;

		const frontmatter = extractFrontmatter(markdown);

		expect(frontmatter['title']).toBe('My Meeting');
		expect(frontmatter['date']).toBe('2024-02-15');
	});

	it('should extract array values', () => {
		const markdown = `---
attendees: [John, Sarah, Mike]
---
Content`;

		const frontmatter = extractFrontmatter(markdown);

		expect(frontmatter['attendees']).toEqual(['John', 'Sarah', 'Mike']);
	});

	it('should handle TOML frontmatter', () => {
		const markdown = `+++
title = "My Meeting"
+++
Content`;

		// stripFrontmatter should work with TOML
		const stripped = stripFrontmatter(markdown);
		expect(stripped.trim()).toBe('Content');
	});

	it('should return empty object for no frontmatter', () => {
		const markdown = 'Just content, no frontmatter';

		const frontmatter = extractFrontmatter(markdown);

		expect(frontmatter).toEqual({});
	});

	it('should handle quoted values', () => {
		const markdown = `---
client: "Acme Corp"
project: 'Website'
---`;

		const frontmatter = extractFrontmatter(markdown);

		expect(frontmatter['client']).toBe('Acme Corp');
		expect(frontmatter['project']).toBe('Website');
	});
});
