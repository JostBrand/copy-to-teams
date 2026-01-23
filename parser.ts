/**
 * Markdown parser using remark
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root } from 'remark-parse/lib';

/**
 * Parse Markdown content to an AST (Abstract Syntax Tree)
 *
 * @param markdown - The Markdown content to parse
 * @returns The parsed AST root node
 */
export function parseMarkdown(markdown: string): Root {
	const processor = unified()
		.use(remarkParse)
		.use(remarkGfm); // GitHub Flavored Markdown (tables, checkboxes, strikethrough)

	const ast = processor.parse(markdown);
	return ast as Root;
}

/**
 * Strip frontmatter from Markdown content
 * Supports both YAML (---) and TOML (+++) frontmatter formats
 *
 * @param markdown - The Markdown content
 * @returns The content with frontmatter removed
 */
export function stripFrontmatter(markdown: string): string {
	// Match YAML (---) or TOML (+++) frontmatter at the start of the document
	const frontmatterRegex = /^(---|\+\+\+)\n[\s\S]*?\n\1\n*/;
	return markdown.replace(frontmatterRegex, '');
}

/**
 * Extract frontmatter as key-value pairs
 * Supports simple YAML frontmatter (single-line values only)
 *
 * @param markdown - The Markdown content
 * @returns Object with frontmatter key-value pairs
 */
export function extractFrontmatter(markdown: string): Record<string, string | string[]> {
	const frontmatterRegex = /^(---|\+\+\+)\n([\s\S]*?)\n\1/;
	const match = markdown.match(frontmatterRegex);

	if (!match) {
		return {};
	}

	const frontmatterContent = match[2];
	const result: Record<string, string | string[]> = {};

	// Parse simple YAML key: value pairs
	const lines = frontmatterContent.split('\n');
	let currentKey = '';
	let inList = false;

	for (const line of lines) {
		// Check for list item (starts with "  - " after a key)
		const listMatch = line.match(/^\s+-\s+(.+)$/);
		if (listMatch && currentKey && inList) {
			const existing = result[currentKey];
			if (Array.isArray(existing)) {
				existing.push(listMatch[1].trim());
			}
			continue;
		}

		// Check for key: value pair
		const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
		if (kvMatch) {
			currentKey = kvMatch[1].toLowerCase();
			const value = kvMatch[2].trim();

			if (value === '' || value === '|' || value === '>') {
				// Start of a list or multiline value
				result[currentKey] = [];
				inList = true;
			} else if (value.startsWith('[') && value.endsWith(']')) {
				// Inline array like [item1, item2]
				const items = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
				result[currentKey] = items;
				inList = false;
			} else {
				// Simple value - remove quotes if present
				result[currentKey] = value.replace(/^["']|["']$/g, '');
				inList = false;
			}
		}
	}

	return result;
}
