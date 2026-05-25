/**
 * Per-bay banner position — independent of product rackOffsetX / shelf tuning.
 * Banners anchor to each bay center on game-bg.png; nudge with offsetX / offsetY.
 *
 * HOW TO MOVE LEFT / RIGHT
 * ─────────────────────────
 *   offsetX: -10  →  move banner 10px LEFT
 *   offsetX:  10  →  move banner 10px RIGHT
 *   offsetY:  -6  →  move banner 6px UP
 *   offsetY:   6  →  move banner 6px DOWN
 *
 * Edit the rack you need below, save, refresh the game.
 *
 * @typedef {Object} BannerAlignment
 * @property {number} [offsetX]
 * @property {number} [offsetY]
 */

/** `shiftX(-12)` = left, `shiftX(12)` = right */
export function shiftX (pixels) {
    return { offsetX: pixels, offsetY: 0 };
}

/** `shiftY(-10)` = up, `shiftY(10)` = down */
export function shiftY (pixels) {
    return { offsetX: 0, offsetY: pixels };
}

/** Left/right and up/down together: `shiftXY(-18, -10)` */
export function shiftXY (pixelsX, pixelsY = 0) {
    return { offsetX: pixelsX, offsetY: pixelsY };
}

/** @type {Record<string, BannerAlignment>} */
export const BANNER_ALIGNMENT = Object.freeze({
    candy: Object.freeze(shiftX(-18)),
    fruits: Object.freeze(shiftXY(-18)),
    beverages: Object.freeze(shiftX(-25)),
    toys: Object.freeze(shiftX(-40)),
    chips: Object.freeze(shiftX(-18)),
    cakes: Object.freeze(shiftX(-18)),
    toiletaries: Object.freeze(shiftX(-18)),
    electronics: Object.freeze(shiftX(5)),
    ration: Object.freeze(shiftX(-10)),

    // Examples (uncomment one style):
    // candy: shiftX(-15),           // 15px left
    // beverages: shiftX(12),        // 12px right
    // fruits: shiftXY(-8, -4),      // left + up
});

const DEFAULT_BANNER_ALIGNMENT = Object.freeze({
    offsetX: 0,
    offsetY: 0,
});

/** @param {string} rackId */
export function getBannerAlignment (rackId) {
    return { ...DEFAULT_BANNER_ALIGNMENT, ...(BANNER_ALIGNMENT[rackId] ?? {}) };
}
