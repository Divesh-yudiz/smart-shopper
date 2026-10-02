import { RACK_SHELF_LAYOUTS } from './shelfLayouts.js';

const DEFAULT_ROW_COUNT = 4;
const PRODUCE_ROW_COUNT = 3;

/** Authored per-product repeats. Checked before RACK_SHELF_LAYOUTS. Keys are compacted. */
const ROW_COUNTS = Object.freeze({
    orangejuice: 9,
    milk: 8,
    water: 7,
    cookingoil: 9,
    teddybear: 6,
    softtoy: 6,
    toy: 4,
    ball: 5,
    car: 4,
    toycar: 4,
    sackofgrains: 5,
    beef: 5,
    chocolate: 5,
    chocolatebar: 5,
    porridgeoats: 5,
    cola: 6,
    fizzydrinksoda: 6,
    donuts: 5,
    donut: 5,
    cookies: 5,
    cookiesbiscuits: 5,
    pie: 5,
    paper: 4,
    toiletpaper: 4,
    fancypens: 4,
    laptop: 5,
    bread: 5,
    breads: 5,
    eggs: 4,
    egg: 4,
    flour: 5,
    floor: 5,
    carrot: 4,
    carrots: 4,
    onion: 4,
    onions: 4,
    aloeverajuice: 10,
    alowverajuice: 10,
    bathingsoap: 6,
    handwash: 6,
    dishwash: 8,
    dishwashingsoap: 8,
    chicken: 5,
    salmon: 5,
    fish: 5,
    tofu: 6,
    potatochips: 6,
    pototochips: 6,
    potatochip: 6,
    pasta: 5,
    driedpasta: 5,
});

/**
 * API sItemKey (snake_case / aliases) → catalog product key used in RACK_SHELF_LAYOUTS.
 * Compact matching also covers orange_juice ↔ orangeJuice without an alias.
 */
const KEY_ALIASES = Object.freeze({
    orange_juice: 'orangeJuice',
    grape_juice: 'grapeJuice',
    aloe_vera_juice: 'alowveraJuice',
    candy_2: 'candy',
    soft_toy: 'teddybear',
    car: 'toyCar',
    toy: 'toyCar',
    cookies_biscuits: 'cookies',
    bread: 'breads',
    cake: 'vanillaCake',
    pie: 'vanillaCake',
    dish_washing_soap: 'dishwash',
    bathing_soap: 'handwash',
    laundry_detergent: 'cleaner',
    smartphone: 'mobile',
    headphone: 'headphones',
    gift_box: 'gift',
    fizzy_drink_soda: 'cola',
    ice_cream_tub: 'icecream',
    tomatoes: 'tomatos',
    tomato: 'tomatos',
    potatoes: 'potato',
    carrot: 'carrots',
    onions: 'onion',
    bell_pepper: 'capsicum',
    cauliflower: 'qualiflower',
    potato_chips: 'potatochips',
    dried_pasta: 'pasta',
});

const PRODUCE_KEYS = new Set([
    'tomatos', 'tomato', 'tomatoes',
    'qualiflower', 'cauliflower',
    'carrots', 'carrot',
    'potato', 'potatoes',
    'capsicum', 'bellpepper',
    'onion', 'onions',
    'grapes',
]);

function compact (value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function buildCountsByCompactKey () {
    const map = {};
    for (const rows of Object.values(RACK_SHELF_LAYOUTS)) {
        for (const row of rows) {
            if (row.product && Number.isFinite(row.count)) {
                map[compact(row.product)] = row.count;
            }
        }
    }
    return map;
}

const COUNTS_BY_COMPACT_KEY = buildCountsByCompactKey();

/**
 * Extra size tweaks for API photos that overflow a single plank
 * (wide cakes, loaves, toys). Applied on top of rack alignment.
 */
const PRODUCT_SHELF_FIT = Object.freeze({
    pie: { shelfHeightFactor: 0.82, iconSlotFill: 1.18, iconScale: 1.22 },
    cake: { shelfHeightFactor: 0.52, iconSlotFill: 0.86 },
    vanillacake: { shelfHeightFactor: 0.52, iconSlotFill: 0.88 },
    chocolatecake: { shelfHeightFactor: 0.52, iconSlotFill: 0.88 },
    breads: { shelfHeightFactor: 0.82, iconSlotFill: 1.14, iconScale: 1.22 },
    bread: { shelfHeightFactor: 0.82, iconSlotFill: 1.14, iconScale: 1.22 },
    croissants: { shelfHeightFactor: 0.82, iconSlotFill: 1.14, iconScale: 1.22 },
    cookies: { shelfHeightFactor: 0.72, iconSlotFill: 1.08, iconScale: 1.12 },
    cookiesbiscuits: { shelfHeightFactor: 0.72, iconSlotFill: 1.08, iconScale: 1.12 },
    teddybear: { shelfHeightFactor: 1.28, iconSlotFill: 1.38, iconScale: 1.35, gap: 18 },
    softtoy: { shelfHeightFactor: 1.28, iconSlotFill: 1.38, iconScale: 1.35, gap: 18 },
    eggs: { fitWidthCount: 4, shelfHeightFactor: 1.10, iconSlotFill: 1.28, iconScale: 1.22, gap: 16 },
    egg: { fitWidthCount: 4, shelfHeightFactor: 1.10, iconSlotFill: 1.28, iconScale: 1.22, gap: 16 },
    flour: { fitWidthCount: 4, iconSlotFill: 1.08, gap: 16 },
    floor: { fitWidthCount: 4, iconSlotFill: 1.08, gap: 16 },
    laptop: { shelfHeightFactor: 0.55, iconSlotFill: 0.92, fitWidthCount: 4 },
    fancypens: { gap: 16 },
    paper: { gap: 18 },
    toiletpaper: { gap: 18 },
    cola: { shelfHeightFactor: 1.32, iconSlotFill: 1.72, iconScale: 1.90, fitWidthCount: 6, spanCount: 8, gap: 18 },
    fizzydrinksoda: { shelfHeightFactor: 1.32, iconSlotFill: 1.72, iconScale: 1.90, fitWidthCount: 6, spanCount: 8, gap: 18 },
    milk: { shelfHeightFactor: 0.95, iconSlotFill: 1.28, iconScale: 1.32, fitWidthCount: 6, gap: 22 },
    water: { shelfHeightFactor: 1.28, iconSlotFill: 1.70, iconScale: 1.85, fitWidthCount: 6, spanCount: 8, gap: 22 },
    alowverajuice: { shelfHeightFactor: 1.10, iconSlotFill: 1.40, iconScale: 1.48, fitWidthCount: 6, gap: 12 },
    aloeverajuice: { shelfHeightFactor: 1.10, iconSlotFill: 1.40, iconScale: 1.48, fitWidthCount: 6, gap: 12 },
    orangejuice: { shelfHeightFactor: 1.10, iconSlotFill: 1.40, iconScale: 1.48, fitWidthCount: 6, gap: 18 },
    grapejuice: { shelfHeightFactor: 0.95, iconSlotFill: 1.28, iconScale: 1.32 },
    cookingoil: { shelfHeightFactor: 1.12, iconSlotFill: 1.42, iconScale: 1.52, gap: -8 },
    beef: { shelfHeightFactor: 0.88, iconSlotFill: 1.22, iconScale: 1.25 },
    chocolate: { gap: 14 },
    chocolatebar: { gap: 14 },
    rice: { gap: 16 },
    bathingsoap: { fitWidthCount: 4 },
    handwash: { fitWidthCount: 4 },
    dishwash: { shelfHeightFactor: 1.05, iconSlotFill: 1.35, iconScale: 1.38, gap: -6 },
    dishwashingsoap: { shelfHeightFactor: 1.05, iconSlotFill: 1.35, iconScale: 1.38, gap: -6 },
    chicken: { shelfHeightFactor: 0.95, iconSlotFill: 1.18, iconScale: 1.16, gap: 18 },
    salmon: { fitWidthCount: 4, gap: 16 },
    fish: { fitWidthCount: 4, gap: 18 },
    car: { shelfHeightFactor: 1.18, iconSlotFill: 1.38, iconScale: 1.32, fitWidthCount: 5, gap: 16 },
    toycar: { shelfHeightFactor: 1.18, iconSlotFill: 1.38, iconScale: 1.32, fitWidthCount: 5, gap: 16 },
    toy: { shelfHeightFactor: 1.18, iconSlotFill: 1.38, iconScale: 1.32, fitWidthCount: 5, gap: 16 },
    porridgeoats: { shelfHeightFactor: 1.15, iconSlotFill: 1.42, iconScale: 1.48, gap: 14 },
    tofu: { fitWidthCount: 4 },
    potatochips: { fitWidthCount: 4, gap: -8 },
    pototochips: { fitWidthCount: 4, gap: -8 },
    potatochip: { fitWidthCount: 4, gap: -8 },
    pasta: { fitWidthCount: 4, gap: 16 },
    driedpasta: { fitWidthCount: 4, gap: 16 },
});

function candidateKeys (sItemKey, sName) {
    const aliased = KEY_ALIASES[sItemKey] ?? KEY_ALIASES[compact(sItemKey)];
    return [sItemKey, aliased, sName].filter(Boolean);
}

/**
 * How many copies of a product to repeat across one shelf row.
 * Looks up the authored count from RACK_SHELF_LAYOUTS by sItemKey or display name.
 *
 * @param {string} sItemKey
 * @param {string} [sName]
 * @returns {number}
 */
export function getProductRowCount (sItemKey, sName) {
    for (const key of candidateKeys(sItemKey, sName)) {
        const compactKey = compact(key);
        const count = ROW_COUNTS[compactKey] ?? COUNTS_BY_COMPACT_KEY[compactKey];
        if (count) return count;
    }

    if (PRODUCE_KEYS.has(String(sItemKey ?? '')) || PRODUCE_KEYS.has(compact(sItemKey))) {
        return PRODUCE_ROW_COUNT;
    }

    return DEFAULT_ROW_COUNT;
}

/**
 * Per-product shelf sizing so API art keeps aspect and stays on one plank.
 *
 * @param {string} sItemKey
 * @param {string} [sName]
 * @returns {{ count: number, keepAspect: boolean, shelfHeightFactor?: number, iconSlotFill?: number, iconScale?: number, fitWidthCount?: number, spanCount?: number, gap?: number }}
 */
export function getProductShelfFit (sItemKey, sName) {
    const count = getProductRowCount(sItemKey, sName);
    for (const key of candidateKeys(sItemKey, sName)) {
        const fit = PRODUCT_SHELF_FIT[compact(key)];
        if (fit) return { count, keepAspect: true, ...fit };
    }
    return { count, keepAspect: true };
}
