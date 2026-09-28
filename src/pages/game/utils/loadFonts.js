import config from './config.js';

/** Weights declared in src/index.css for the Cause family. */
const CAUSE_WEIGHTS = Object.freeze([400, 500, 600, 700, 800, 900]);

/**
 * Force-download every Cause face, then wait until the FontFaceSet is idle.
 * `document.fonts.ready` alone is not enough — unused @font-face files are
 * not fetched, so Phaser would paint with a fallback and wrong metrics.
 */
export async function waitForCauseFonts () {
    if (typeof document === 'undefined' || !document.fonts?.load) return;

    const family = config.fonts.text;
    const sample = (weight) => `${weight} 64px "${family}"`;

    try {
        await Promise.all(CAUSE_WEIGHTS.map((w) => document.fonts.load(sample(w))));
        await document.fonts.ready;

        const missing = CAUSE_WEIGHTS.filter((w) => !document.fonts.check(sample(w)));
        if (missing.length) {
            await Promise.all(missing.map((w) => document.fonts.load(sample(w))));
            await document.fonts.ready;
        }
    } catch {
        // Proceed anyway — game still plays with system fallback if load fails.
    }
}
