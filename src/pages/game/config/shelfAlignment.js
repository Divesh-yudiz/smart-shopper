/**
 * Per-bay alignment tuned to game-bg.png (3840×1080, 9 equal sections).
 * Usable shelf sits between pillars — asymmetric insets + gridXOffset shift items within the bay.
 * rackOffsetX — moves the whole ProductRack left/right (applied in getRackPlacements).
 * rowYAdjust[n] — positive = row moves DOWN; negative = UP (per shelf, top index 0).
 * rowXAdjust[n] — positive = row moves RIGHT; negative = LEFT.
 * Per-row fine-tune in shelfLayouts.js: offsetX, offsetY (added on top of rowX/YAdjust).
 */

/** @type {Record<string, object>} */
export const RACK_ALIGNMENT = Object.freeze({
    candy: Object.freeze({
        insetLeft: 36,
        insetRight: 52,
        gridXOffset: -28,
        gridYOffset: 8,
        shelfSurfaceInset: 15,
        shelfHeightFactor: 0.80,
        iconSlotFill: 1.75,
        rowYAdjust: [6, 20, 22, 28],
        iconScale: 1.00,
        rackOffsetX: -10,
    }),
    fruits: Object.freeze({
        insetLeft: 24,
        insetRight: 50,
        gridXOffset: -12,
        gridYOffset: 8,
        shelfSurfaceInset: 4,
        shelfPlankOffset: 36,
        rowYAdjust: [0, 2, 0, 15],
        rowXAdjust: [0, 0, 0, 0],
        iconScale: 1.2,
        iconSlotFill: 1.30,
        shelfHeightFactor: 1.50,
        rackOffsetX: 6,
    }),
    beverages: Object.freeze({
        insetLeft: 0,
        insetRight: 90,
        gridXOffset: -70,
        gridYOffset: 14,
        shelfSurfaceInset: 8,
        rowYAdjust: [20, 20, 20, 20],
        iconScale: 1.62,
        shelfHeightFactor: 1.04,
        iconSlotFill: 1.38,
        iconAspect: 1.1,
        rackOffsetX: -88,
    }),
    toys: Object.freeze({
        insetLeft: 26,
        insetRight: 40,
        gridXOffset: -12,
        gridYOffset: 8,
        shelfSurfaceInset: 12,
        rowYAdjust: [26, 48, 30, 28],
        iconScale: 0.95,
        shelfHeightFactor: 0.85,
        iconSlotFill: 1.00,
        rackOffsetX: 30,
    }),
    chips: Object.freeze({
        spreadFullBay: true,
        rowSidePad: 10,
        gridXOffset: 0,
        gridYOffset: 8,
        shelfHeightFactor: 0.75,
        iconSlotFill: 1.45,
        shelfSurfaceInset: 12,
        shelfPlankOffset: 34,
        rowYAdjust: [0, 4, 0, 0],
        rowXAdjust: [0, 0, 0, 0],
        iconScale: 1.05,
        rackOffsetX: 20,
    }),
    cakes: Object.freeze({
        insetLeft: 38,
        insetRight: 48,
        gridXOffset: -28,
        gridYOffset: 8,
        shelfHeightFactor: 0.75,
        iconSlotFill: 1.00,
        rowYAdjust: [26, 45, 48, 48],
        iconScale: 1.05,
        rackOffsetX: -10,
    }),
    toiletaries: Object.freeze({
        insetLeft: 28,
        insetRight: 38,
        gridXOffset: 0,
        gridYOffset: 8,
        shelfHeightFactor: 0.80,
        iconSlotFill: 1.35,
        rowYAdjust: [26, 45, 48, 48],
        iconScale: 1.05,
        rackOffsetX: 20,
    }),
    electronics: Object.freeze({
        insetLeft: 28,
        insetRight: 38,
        gridXOffset: -28,
        gridYOffset: 8,
        shelfHeightFactor: 0.85,
        iconSlotFill: 1.20,
        rowYAdjust: [36, 45, 48, 48],
        iconScale: 1.02,
        rackOffsetX: -35,
    }),
    ration: Object.freeze({
        insetLeft: 38,
        insetRight: 48,
        gridXOffset: -28,
        gridYOffset: 8,
        shelfHeightFactor: 0.65,
        iconSlotFill: 1.00,
        rowYAdjust: [26, 45, 48, 48],
        iconScale: 1.05,
        rackOffsetX: -25,
    }),
});

const DEFAULT_ALIGNMENT = Object.freeze({
    insetLeft: 38,
    insetRight: 48,
    gridXOffset: -28,
    gridYOffset: 6,
    shelfSurfaceInset: 12,
    rowYAdjust: [],
    rowXAdjust: [],
    iconScale: null,
    shelfHeightFactor: 0.92,
    iconAspect: 1,
    iconSlotFill: 1.02,
    rackOffsetX: 190,
});

/** @param {string} rackId */
export function getRackAlignment (rackId) {
    return { ...DEFAULT_ALIGNMENT, ...(RACK_ALIGNMENT[rackId] ?? {}) };
}
