

/** @typedef {{ product: string, count?: number, gap?: number, shelfRow?: number, skip?: boolean, priceTagOffsetY?: number }} ShelfRowRepeat */
/** @typedef {{ stacks: Array<{ product: string, count?: number, priceTagOffsetY?: number }>, gap?: number, shelfRow?: number, skip?: boolean, priceTagPerItem?: boolean, priceTagOffsetY?: number }} ShelfRowMixed */

/** @type {Record<string, Array<ShelfRowRepeat | ShelfRowMixed>>} */
export const RACK_SHELF_LAYOUTS = Object.freeze({
    /** Bay 1 — Candy (pink): lollipops → jars → canes → gift boxes */
    candy: Object.freeze([
        { product: 'lollipop', count: 7, priceTagOffsetY: 18 },
        { product: 'candy', count: 6, priceTagOffsetY: 18 },
        { product: 'jelly', count: 6, iconSlotFill: 1.10, priceTagOffsetY: 18 },
        { product: 'giftCandy', count: 5, priceTagOffsetY: 22 },
    ]),

    /** Bay 2 — Produce: 3×2 crates on middle planks (game-bg has 4 shelves; rows 1–2) */
    fruits: Object.freeze([
        {
            shelfRow: 1,
            priceTagPerItem: true,
            priceTagOffsetY: 6,
            stacks: [
                { product: 'tomatos' },
                { product: 'qualiflower' },
                { product: 'carrots' },
            ],
            gap: 45,
        },
        {
            shelfRow: 3,
            priceTagPerItem: true,
            priceTagOffsetY: 15,
            stacks: [
                { product: 'potato' },
                { product: 'capsicum' },
                { product: 'onion' },
            ],
            gap: 45,
            offsetY: 8,
        },
    ]),

    /** Bay 3 — Beverages: 4 per row, kept left of center pillar (see shelfAlignment insetRight) */
    beverages: Object.freeze([
        { product: 'milk', count: 7, gap: 6, priceTagOffsetY: 15 },
        { product: 'orangeJuice', count: 7, gap: 6, priceTagOffsetY: 18 },
        { product: 'grapeJuice', count: 7, gap: 6, priceTagOffsetY: 16 },
        { product: 'alowveraJuice', count: 7, gap: 6, priceTagOffsetY: 14 },
    ]),

    /** Bay 4 — Toys: teddy → car → rings → ball */
    toys: Object.freeze([
        { product: 'teddybear', count: 5, iconSlotFill: 1.30, priceTagOffsetY: 20 },
        { product: 'toyCar', count: 4, iconSlotFill: 1.15, priceTagOffsetY: 2 },
        { product: 'rings', count: 6, iconSlotFill: 1.30, priceTagOffsetY: 16 },
        { product: 'ball', count: 4, shelfHeightFactor: 0.85, iconSlotFill: 1.35, gap: 20, priceTagOffsetY: 14 },
    ]),

    /** Bay 5 — Chips: red → yellow → green → blue bags */
    chips: Object.freeze([
        { product: 'chilliWafers', count: 5, offsetY: -10, priceTagOffsetY: 16 },
        { product: 'lemonWafers', count: 5, offsetY: -10, priceTagOffsetY: 16 },
        { product: 'onionWafers', count: 5, offsetY: -10, shelfHeightFactor: 0.70, priceTagOffsetY: 18 },
        { product: 'masalaWafers', count: 5, offsetY: -10, shelfHeightFactor: 0.70, priceTagOffsetY: 18 },
    ]),

    /** Bay 6 — Bakery: vanilla → chocolate → bread → cookies */
    cakes: Object.freeze([
        { product: 'vanillaCake', count: 4, priceTagOffsetY: 16 },
        { product: 'chocolateCake', count: 4, offsetY: -12, priceTagOffsetY: 16 },
        { product: 'breads', count: 4, priceTagOffsetY: 4 },
        { product: 'cookies', count: 4, offsetY: -12, priceTagOffsetY: 12 },
    ]),

    /** Bay 7 — Cleaning: spray → dish → hand → paper */
    toiletaries: Object.freeze([
        { product: 'cleaner', count: 6, iconSlotFill: 1.75, gap: 20, priceTagOffsetY: 14 },
        { product: 'dishwash', count: 7, offsetY: -12, iconSlotFill: 1.95, priceTagOffsetY: 12 },
        { product: 'handwash', count: 6, offsetY: -12, iconSlotFill: 1.75, priceTagOffsetY: 12 },
        { product: 'paper', count: 6, offsetY: -18, gap: 10, shelfHeightFactor: 0.70, priceTagOffsetY: 10 },
    ]),

    /** Bay 8 — Electronics: laptop → mobile → headphones → gift */
    electronics: Object.freeze([
        { product: 'laptop', count: 4, priceTagOffsetY: 8 },
        { product: 'mobile', count: 5, offsetY: -15, shelfHeightFactor: 0.65, iconSlotFill: 1.80, gap: 30, priceTagOffsetY: 16 },
        { product: 'headphones', count: 5, offsetY: -15, shelfHeightFactor: 0.65, iconSlotFill: 1.80, gap: 20, priceTagOffsetY: 16 },
        { product: 'gift', count: 6, offsetY: -15, shelfHeightFactor: 0.75, iconSlotFill: 1.80, gap: 25, priceTagOffsetY: 10 },
    ]),

    /** Bay 9 — Grocery: cola → donuts → ice cream → rice/bags */
    ration: Object.freeze([
        { product: 'cola', count: 6, gap: -25, priceTagOffsetY: 10 },
        { product: 'donuts', count: 5, shelfHeightFactor: 0.65, iconSlotFill: 1.20, priceTagOffsetY: 4 },
        { product: 'icecreame', count: 6, offsetY: -15, gap: -5, priceTagOffsetY: 10 },
        { product: 'rice', count: 5, offsetY: -15, gap: -15, priceTagOffsetY: 10 },
    ]),
});

/**
 * @param {string} rackId — key from MARKET_RACK_ORDER
 * @returns {Array<ShelfRowRepeat | ShelfRowMixed>}
 */
export function getShelfRowsForRack (rackId) {
    const rows = RACK_SHELF_LAYOUTS[rackId];
    if (!rows) {
        console.warn(`[shelfLayouts] No shelf layout for rack "${rackId}"`);
        return [];
    }
    return rows;
}

/** Number of shelf rows for a rack (drives vertical layout). */
export function getShelfRowCount (rackId) {
    return getShelfRowsForRack(rackId).length;
}
