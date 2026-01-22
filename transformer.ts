/**
 * Transforms Markdown AST to Teams-compatible format
 */

import type { Root, Content, PhrasingContent, TableRow, TableCell } from 'mdast';
import { visit } from 'unist-util-visit';
import type { TransformContext, TransformResult, HeadingState } from './types';

/**
 * Transform a Markdown AST to Teams-compatible HTML and plain text
 *
 * @param ast - The Markdown AST root node
 * @param context - Transformation context with settings
 * @returns The transformed HTML and plain text
 */
export function transformToTeams(ast: Root, context: TransformContext): TransformResult {
	const htmlParts: string[] = [];
	const plainParts: string[] = [];

	// Process each root-level node
	for (const node of ast.children) {
		const result = processNode(node, context, 0);
		if (result.html) {
			htmlParts.push(result.html);
		}
		if (result.plainText) {
			plainParts.push(result.plainText);
		}
	}

	let html = htmlParts.join('');
	let plainText = plainParts.join('');

	// Collapse empty lines if configured
	if (context.settings.collapseEmptyLines) {
		html = html.replace(/\n{3,}/g, '\n\n');
		plainText = plainText.replace(/\n{3,}/g, '\n\n');
	}

	return { html: html.trim(), plainText: plainText.trim() };
}

/**
 * Process a single AST node
 */
function processNode(node: Content, context: TransformContext, depth: number): TransformResult {
	switch (node.type) {
		case 'heading':
			return processHeading(node, context);
		case 'paragraph':
			return processParagraph(node, context);
		case 'list':
			return processList(node, context, depth);
		case 'listItem':
			return processListItem(node, context, depth);
		case 'table':
			return processTable(node, context);
		case 'code':
			return processCodeBlock(node, context);
		case 'blockquote':
			return processBlockquote(node, context);
		case 'thematicBreak':
			return { html: '<hr />\n', plainText: '---\n' };
		default:
			return { html: '', plainText: '' };
	}
}

/**
 * Process heading nodes with hierarchical numbering
 */
function processHeading(node: any, context: TransformContext): TransformResult {
	const level = node.depth;
	const text = processPhrasingContent(node.children, context);

	let prefix = '';
	if (context.settings.headingStyle === 'numbered') {
		prefix = getHeadingNumber(level, context.headingState) + ' ';
	}

	const headingText = prefix + text.plainText;

	let html = '';
	let plainText = '';

	if (context.settings.headingStyle === 'numbered' || context.settings.headingStyle === 'bold') {
		html = `<p><b>${escapeHtml(headingText)}</b></p>\n`;
		plainText = `${headingText}\n`;
	} else {
		// uppercase
		html = `<p>${escapeHtml(headingText.toUpperCase())}</p>\n`;
		plainText = `${headingText.toUpperCase()}\n`;
	}

	return { html, plainText };
}

/**
 * Get hierarchical heading number (e.g., "1.2.3")
 */
function getHeadingNumber(level: number, state: HeadingState): string {
	// Ensure counters array is large enough
	while (state.counters.length < level) {
		state.counters.push(0);
	}

	// Increment current level
	state.counters[level - 1]++;

	// Reset deeper levels
	for (let i = level; i < state.counters.length; i++) {
		state.counters[i] = 0;
	}

	// Build number string
	return state.counters.slice(0, level).filter(n => n > 0).join('.');
}

/**
 * Process paragraph nodes
 */
function processParagraph(node: any, context: TransformContext): TransformResult {
	const content = processPhrasingContent(node.children, context);
	return {
		html: `<p>${content.html}</p>\n`,
		plainText: `${content.plainText}\n`,
	};
}

/**
 * Process list nodes (ordered and unordered)
 */
function processList(node: any, context: TransformContext, depth: number): TransformResult {
	const htmlParts: string[] = [];
	const plainParts: string[] = [];

	let index = node.start || 1;

	for (const child of node.children) {
		const itemResult = processListItem(child, context, depth);

		// Add numbering for ordered lists
		if (node.ordered) {
			const numberedHtml = itemResult.html.replace(/^<p>/, `<p>${index}. `);
			const numberedPlain = itemResult.plainText.replace(/^(\s*)/, `$1${index}. `);
			htmlParts.push(numberedHtml);
			plainParts.push(numberedPlain);
			index++;
		} else {
			htmlParts.push(itemResult.html);
			plainParts.push(itemResult.plainText);
		}
	}

	return {
		html: htmlParts.join(''),
		plainText: plainParts.join(''),
	};
}

/**
 * Process list item nodes
 */
function processListItem(node: any, context: TransformContext, depth: number): TransformResult {
	const indent = '   '.repeat(depth); // 3 spaces per level
	const htmlParts: string[] = [];
	const plainParts: string[] = [];

	// Handle checkboxes
	let checkboxPrefix = '';
	if (node.checked !== null && node.checked !== undefined) {
		const emoji = node.checked
			? context.settings.checkboxChecked
			: context.settings.checkboxUnchecked;
		checkboxPrefix = emoji + ' ';
	}

	// Process children
	for (const child of node.children) {
		if (child.type === 'paragraph') {
			const content = processPhrasingContent(child.children, context);
			htmlParts.push(`<p>${indent}${checkboxPrefix}${content.html}</p>\n`);
			plainParts.push(`${indent}${checkboxPrefix}${content.plainText}\n`);
		} else if (child.type === 'list') {
			// Nested list
			const nestedResult = processList(child, context, depth + 1);
			htmlParts.push(nestedResult.html);
			plainParts.push(nestedResult.plainText);
		}
	}

	return {
		html: htmlParts.join(''),
		plainText: plainParts.join(''),
	};
}

/**
 * Process table nodes
 */
function processTable(node: any, context: TransformContext): TransformResult {
	const rows: string[][] = [];

	// Extract all rows
	for (const row of node.children) {
		const cells: string[] = [];
		for (const cell of row.children) {
			const content = processPhrasingContent(cell.children, context);
			cells.push(content.plainText.trim());
		}
		rows.push(cells);
	}

	if (rows.length === 0) {
		return { html: '', plainText: '' };
	}

	// Calculate column widths
	const numCols = rows[0].length;
	const colWidths: number[] = new Array(numCols).fill(0);

	for (const row of rows) {
		for (let i = 0; i < row.length; i++) {
			colWidths[i] = Math.max(colWidths[i], row[i].length);
		}
	}

	// Build simple grid table
	const lines: string[] = [];

	for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
		const row = rows[rowIdx];
		const paddedCells = row.map((cell, i) => cell.padEnd(colWidths[i], ' '));
		lines.push('| ' + paddedCells.join(' | ') + ' |');

		// Add separator after header row
		if (rowIdx === 0) {
			const separators = colWidths.map(w => '-'.repeat(w));
			lines.push('|' + separators.map(s => '-' + s + '-').join('|') + '|');
		}
	}

	const tableText = lines.join('\n');

	// Wrap in code block for monospace alignment
	const html = `<pre>${escapeHtml(tableText)}</pre>\n`;
	const plainText = '```\n' + tableText + '\n```\n';

	return { html, plainText };
}

/**
 * Process code block nodes
 */
function processCodeBlock(node: any, context: TransformContext): TransformResult {
	const code = node.value || '';

	// Teams doesn't support syntax highlighting, so we just use plain code block
	const html = `<pre>${escapeHtml(code)}</pre>\n`;
	const plainText = '```\n' + code + '\n```\n';

	return { html, plainText };
}

/**
 * Process blockquote nodes
 */
function processBlockquote(node: any, context: TransformContext): TransformResult {
	const htmlParts: string[] = [];
	const plainParts: string[] = [];

	for (const child of node.children) {
		const result = processNode(child, context, 0);
		htmlParts.push(result.html);
		plainParts.push(result.plainText);
	}

	// Prefix each line with ">"
	const plainLines = plainParts.join('').split('\n').filter(l => l.trim());
	const quotedPlain = plainLines.map(line => '> ' + line).join('\n') + '\n';

	return {
		html: '<blockquote>' + htmlParts.join('') + '</blockquote>\n',
		plainText: quotedPlain,
	};
}

/**
 * Process phrasing content (inline content like text, emphasis, links, etc.)
 */
function processPhrasingContent(nodes: PhrasingContent[], context: TransformContext): TransformResult {
	const htmlParts: string[] = [];
	const plainParts: string[] = [];

	for (const node of nodes) {
		const result = processPhrasingNode(node, context);
		htmlParts.push(result.html);
		plainParts.push(result.plainText);
	}

	return {
		html: htmlParts.join(''),
		plainText: plainParts.join(''),
	};
}

/**
 * Process a single phrasing (inline) node
 */
function processPhrasingNode(node: PhrasingContent, context: TransformContext): TransformResult {
	switch (node.type) {
		case 'text':
			const text = node.value;
			return { html: escapeHtml(text), plainText: text };

		case 'strong':
			const strongContent = processPhrasingContent(node.children, context);
			return {
				html: `<b>${strongContent.html}</b>`,
				plainText: `**${strongContent.plainText}**`,
			};

		case 'emphasis':
			const emContent = processPhrasingContent(node.children, context);
			return {
				html: `<i>${emContent.html}</i>`,
				plainText: `*${emContent.plainText}*`,
			};

		case 'delete':
			const delContent = processPhrasingContent(node.children, context);
			return {
				html: `<s>${delContent.html}</s>`,
				plainText: `~~${delContent.plainText}~~`,
			};

		case 'inlineCode':
			const code = node.value;
			return {
				html: `<code>${escapeHtml(code)}</code>`,
				plainText: `\`${code}\``,
			};

		case 'link':
			const linkContent = processPhrasingContent(node.children, context);
			const url = node.url || '';

			if (context.settings.externalLinkFormat === 'hyperlink') {
				return {
					html: `<a href="${escapeHtml(url)}">${linkContent.html}</a>`,
					plainText: `${linkContent.plainText}`,
				};
			} else if (context.settings.externalLinkFormat === 'text-url') {
				return {
					html: `${linkContent.html} (${escapeHtml(url)})`,
					plainText: `${linkContent.plainText} (${url})`,
				};
			} else {
				// text-only
				return {
					html: linkContent.html,
					plainText: linkContent.plainText,
				};
			}

		case 'break':
			return { html: '<br />', plainText: '\n' };

		default:
			// Handle unknown nodes gracefully
			if ('children' in node && Array.isArray(node.children)) {
				return processPhrasingContent(node.children as PhrasingContent[], context);
			}
			if ('value' in node && typeof node.value === 'string') {
				return { html: escapeHtml(node.value), plainText: node.value };
			}
			return { html: '', plainText: '' };
	}
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Initialize heading state
 */
export function createHeadingState(): HeadingState {
	return { counters: [] };
}
