/**
 * TypeScript interfaces and types for the Copy to Teams plugin
 */

/**
 * Plugin settings interface
 */
export interface CopyToTeamsSettings {
	// Checkbox formatting
	checkboxChecked: string;
	checkboxUnchecked: string;

	// Content handling
	stripTags: boolean;
	stripFrontmatter: boolean;

	// Heading style
	headingStyle: 'numbered' | 'bold' | 'uppercase';

	// Formatting
	collapseEmptyLines: boolean;

	// UI
	showNotification: boolean;

	// Links
	showWikilinkUrls: boolean;
	externalLinkFormat: 'text-only' | 'text-url' | 'hyperlink';

	// Tables
	tableStyle: 'simple-grid' | 'unicode-box';

	// Templates
	headerTemplate: string;
	footerTemplate: string;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: CopyToTeamsSettings = {
	checkboxChecked: '✅',
	checkboxUnchecked: '⬜',
	stripTags: false,
	stripFrontmatter: true,
	headingStyle: 'numbered',
	collapseEmptyLines: true,
	showNotification: true,
	showWikilinkUrls: false,
	externalLinkFormat: 'text-url',
	tableStyle: 'simple-grid',
	headerTemplate: '',
	footerTemplate: '',
};

/**
 * Heading state for tracking numbering
 */
export interface HeadingState {
	counters: number[];
}

/**
 * Transformation context passed through the AST visitor
 */
export interface TransformContext {
	settings: CopyToTeamsSettings;
	headingState: HeadingState;
}

/**
 * Result of the transformation process
 */
export interface TransformResult {
	html: string;
	plainText: string;
}
