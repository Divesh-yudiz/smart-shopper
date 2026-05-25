import { buildRackProductsFromAssets } from './productAssets.js';
import { getRackAlignment } from './shelfAlignment.js';
import { getShelfRowCount, getShelfRowsForRack } from './shelfLayouts.js';

/** game-bg.png is 3840×1080 — nine bays left → right */
const BAY_COUNT = 9;
const BACKGROUND_WIDTH = 3840;
const SECTION_WIDTH = BACKGROUND_WIDTH / BAY_COUNT;

export const MARKET_LAYOUT = {
    margin: 0,
    rackGap: 0,
    backgroundWidth: BACKGROUND_WIDTH,
    rackWidth: SECTION_WIDTH,
    sectionWidth: SECTION_WIDTH,
    rackHeight: 500,
    /** Distance from ceiling art to top of product area (matches game-bg planks) */
    contentOffsetY: 72,
    ceilingHeight: 175,
    labelHeight: 60,
    labelTopPadding: 12,
    labelRackGap: 10,
    rowGap: 0,
    rowBottomSpace: 0,
    productIconScale: 1.16,
    showCategoryLabel: false,
    /**
     * Category banners (plate + icon). Y uses ceilingHeight above (175), not per-rack ceiling.
     * Per-bay nudge: bannerAlignment.js (offsetX / offsetY).
     */
    showBanners: true,
    bannerAnimate: true,
    bannerOffsetY: 108,
    bannerWidthRatio: 0.68,
    bannerIconScale: 0.22,
};

export const DEFAULT_RACK_LAYOUT = {
    productsPerRow: 4,
    shelfRows: 4,
    gridXOffset: 0,
    gridYOffset: 0,
    rowGap: 0,
    rowBottomSpace: 0,
};

/**
 * Store bay order (left → right) matching game-bg.png:
 * 1 Candy → 2 Produce → 3 Beverages → 4 Toys → 5 Chips → 6 Bakery →
 * 7 Toiletries → 8 Electronics → 9 Ration
 *
 * Shelf assignments live in config/shelfLayouts.js
 */
export const MARKET_RACK_ORDER = [
    'candy',
    'fruits',
    'beverages',
    'toys',
    'chips',
    'cakes',
    'toiletaries',
    'electronics',
    'ration',
];

function rackLayout (rackId, extra = {}) {
    const rows = getShelfRowsForRack(rackId);
    const align = getRackAlignment(rackId);
    return {
        ...DEFAULT_RACK_LAYOUT,
        shelfRows: getShelfRowCount(rackId),
        rows,
        gridXOffset: align.gridXOffset,
        gridYOffset: align.gridYOffset,
        insetLeft: align.insetLeft,
        insetRight: align.insetRight,
        shelfSurfaceInset: align.shelfSurfaceInset,
        rowYAdjust: align.rowYAdjust,
        rowXAdjust: align.rowXAdjust,
        iconScale: align.iconScale,
        shelfHeightFactor: align.shelfHeightFactor,
        iconAspect: align.iconAspect,
        iconSlotFill: align.iconSlotFill,
        spreadFullBay: align.spreadFullBay,
        rowSidePad: align.rowSidePad,
        shelfPlankOffset: align.shelfPlankOffset,
        ...extra,
    };
}

export const MARKET_RACKS = {
    candy: {
        category: 'Candy',
        headerColor: 0xE91E63,
        ceilingHeight: 175,
        layout: rackLayout('candy'),
        products: buildRackProductsFromAssets('candy', 0),
    },
    fruits: {
        category: 'Produce',
        headerColor: 0x27AE60,
        ceilingHeight: 255,
        layout: rackLayout('fruits', { shelfRows: 4 }),
        rowBottomSpace: { 0: 85, 1: 8, 2: 20, 3: 40 },
        products: buildRackProductsFromAssets('fruits', 4),
    },
    beverages: {
        category: 'Beverages',
        headerColor: 0x2980B9,
        ceilingHeight: 175,
        layout: rackLayout('beverages'),
        products: buildRackProductsFromAssets('beverages', 10),
    },
    toys: {
        category: 'Toys',
        headerColor: 0x9B59B6,
        ceilingHeight: 175,
        layout: rackLayout('toys'),
        products: buildRackProductsFromAssets('toys', 14),
    },
    chips: {
        category: 'Snacks',
        headerColor: 0xE67E22,
        ceilingHeight: 175,
        layout: rackLayout('chips'),
        products: buildRackProductsFromAssets('chips', 18),
    },
    cakes: {
        category: 'Bakery',
        headerColor: 0xD35400,
        ceilingHeight: 175,
        layout: rackLayout('cakes'),
        products: buildRackProductsFromAssets('cakes', 22),
    },
    toiletaries: {
        category: 'Household',
        headerColor: 0x1ABC9C,
        ceilingHeight: 175,
        layout: rackLayout('toiletaries'),
        products: buildRackProductsFromAssets('toiletaries', 26),
    },
    electronics: {
        category: 'Electronics',
        headerColor: 0x34495E,
        ceilingHeight: 175,
        layout: rackLayout('electronics'),
        products: buildRackProductsFromAssets('electronics', 30),
    },
    ration: {
        category: 'Grocery',
        headerColor: 0xC0392B,
        ceilingHeight: 175,
        layout: rackLayout('ration'),
        products: buildRackProductsFromAssets('ration', 34),
    },
};
