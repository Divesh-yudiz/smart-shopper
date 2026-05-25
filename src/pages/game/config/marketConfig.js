import { buildRackProductsFromAssets } from './productAssets.js';

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
    contentOffsetY: 80,
    ceilingHeight: 175,
    labelHeight: 60,
    labelTopPadding: 12,
    labelRackGap: 10,
    rowGap: 0,
    rowBottomSpace: 0,
    productIconScale: 1.35,
    /** Reference art has no category banners — products sit on shelves only */
    showCategoryLabel: false,
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
 * Per-shelf row display: same product repeated across the row.
 * @example
 * rows: [
 *   { product: 'lollipop', count: 7 },
 *   { product: 'candy', count: 6 },
 * ]
 */

/**
 * Store bay order (left → right) matching game-bg.png:
 * 1 Candy → 2 Produce → 3 Beverages → 4 Toys → 5 Chips → 6 Bakery →
 * 7 Toiletries → 8 Electronics → 9 Ration
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

export const MARKET_RACKS = {
    /** 1 — Confectionery */
    candy: {
        category: 'Candy',
        headerColor: 0xE91E63,
        ceilingHeight: 175,
        layout: {
            ...DEFAULT_RACK_LAYOUT,
            shelfRows: 4,
            rows: [
                { product: 'lollipop', count: 7 },
                { product: 'candy', count: 6 },
                { product: 'jelly', count: 6 },
                { product: 'giftCandy', count: 5 },
            ],
        },
        products: buildRackProductsFromAssets('candy', 0),
    },
    /** 2 — Produce stand (green awning) */
    fruits: {
        category: 'Produce',
        headerColor: 0x27AE60,
        ceilingHeight: 255,
        layout: {
            ...DEFAULT_RACK_LAYOUT,
            productsPerRow: 3,
            shelfRows: 3,
            gridYOffset: 10,
        },
        rowBottomSpace: { 0: 8, 1: 14, 2: 48 },
        products: buildRackProductsFromAssets('fruits', 4),
    },
    /** 3 — Beverages */
    beverages: {
        category: 'Beverages',
        headerColor: 0x2980B9,
        ceilingHeight: 175,
        layout: { ...DEFAULT_RACK_LAYOUT, productsPerRow: 4, shelfRows: 4 },
        products: buildRackProductsFromAssets('beverages', 10),
    },
    /** 4 — Toys */
    toys: {
        category: 'Toys',
        headerColor: 0x9B59B6,
        ceilingHeight: 175,
        layout: { ...DEFAULT_RACK_LAYOUT, productsPerRow: 4, shelfRows: 4 },
        products: buildRackProductsFromAssets('toys', 14),
    },
    /** 5 — Snacks / chips */
    chips: {
        category: 'Snacks',
        headerColor: 0xE67E22,
        ceilingHeight: 175,
        layout: { ...DEFAULT_RACK_LAYOUT, productsPerRow: 4, shelfRows: 4 },
        products: buildRackProductsFromAssets('chips', 18),
    },
    /** 6 — Bakery */
    cakes: {
        category: 'Bakery',
        headerColor: 0xD35400,
        ceilingHeight: 175,
        layout: { ...DEFAULT_RACK_LAYOUT, productsPerRow: 4, shelfRows: 4 },
        products: buildRackProductsFromAssets('cakes', 22),
    },
    /** 7 — Household / cleaning */
    toiletaries: {
        category: 'Household',
        headerColor: 0x1ABC9C,
        ceilingHeight: 175,
        layout: { ...DEFAULT_RACK_LAYOUT, productsPerRow: 4, shelfRows: 4 },
        products: buildRackProductsFromAssets('toiletaries', 26),
    },
    /** 8 — Electronics */
    electronics: {
        category: 'Electronics',
        headerColor: 0x34495E,
        ceilingHeight: 175,
        layout: { ...DEFAULT_RACK_LAYOUT, productsPerRow: 4, shelfRows: 4 },
        products: buildRackProductsFromAssets('electronics', 30),
    },
    /** 9 — Misc / ration */
    ration: {
        category: 'Grocery',
        headerColor: 0xC0392B,
        ceilingHeight: 175,
        layout: { ...DEFAULT_RACK_LAYOUT, productsPerRow: 4, shelfRows: 4 },
        products: buildRackProductsFromAssets('ration', 34),
    },
};
