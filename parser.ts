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
 * Strip YAML frontmatter from Markdown content
 *
 * @param markdown - The Markdown content
 * @returns The content with frontmatter removed
 */
export function stripFrontmatter(markdown: string): string {
	// Match YAML frontmatter at the start of the document
	const frontmatterRegex = /^---\n[\s\S]*?\n---\n*/;
	return markdown.replace(frontmatterRegex, '');
}
