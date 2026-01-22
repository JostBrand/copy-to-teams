/**
 * Clipboard operations for copying transformed content
 */

import type { TransformResult } from './types';

/**
 * Copy the transformed content to the system clipboard
 *
 * This function writes both HTML and plain text to the clipboard
 * to maximize compatibility with Microsoft Teams and other applications.
 *
 * @param result - The transformation result containing HTML and plain text
 * @throws Error if clipboard write fails
 */
export async function copyToClipboard(result: TransformResult): Promise<void> {
	try {
		// Create clipboard items with both MIME types
		const clipboardItem = new ClipboardItem({
			'text/html': new Blob([result.html], { type: 'text/html' }),
			'text/plain': new Blob([result.plainText], { type: 'text/plain' }),
		});

		// Write to clipboard
		await navigator.clipboard.write([clipboardItem]);
	} catch (error) {
		// Fallback: try plain text only if HTML clipboard fails
		try {
			await navigator.clipboard.writeText(result.plainText);
		} catch (fallbackError) {
			throw new Error('Failed to copy to clipboard: ' + (error as Error).message);
		}
	}
}
