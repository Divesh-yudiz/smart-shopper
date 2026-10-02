import { RACK_SHELF_LAYOUTS } from './shelfLayouts.js';

const DEFAULT_ROW_COUNT = 4;
const PRODUCE_ROW_COUNT = 3;

/**
 * One entry per product. Keys are compacted (no spaces or underscores).
 * Checked before RACK_SHELF_LAYOUTS.
 *
 * count    — copies on the shelf row
 * size     — overall scale (1 = the rack default)
 * height   — fraction of the plank height the art may use
 * fill     — how much of the item slot the art fills
 * fitWidth — slot width is sized as if this many items were in the row
 * span     — how many equal slices of the bay the row occupies
 * gap      — pixels between copies (negative pulls them closer)
 * sideGap  — empty pixels on the left and on the right of the row
 *
 * @type {Readonly<Record<string, {
 *   count: number,
 *   size?: number,
 *   height?: number,
 *   fill?: number,
 *   fitWidth?: number,
 *   span?: number,
 *   gap?: number,
 *   sideGap?: number,
 * }>>}
 */
export const PRODUCT_SHELF = Object.freeze({
    milk: { count: 12, size: 2.35, height: 1.40, fill: 2.00, fitWidth: 8, span: 10, gap: 32 },
    orangejuice: { count: 12, size: 2.35, height: 1.40, fill: 2.00, fitWidth: 8, span: 10, gap: 32 },
    grapejuice: { count: 7, size: 1.62, height: 1.10, fill: 1.48, gap: 20 },
    water: { count: 12, size: 2.35, height: 1.40, fill: 2.00, fitWidth: 8, span: 10, gap: 32 },
    aloeverajuice: { count: 12, size: 2.35, height: 1.40, fill: 2.00, fitWidth: 7, span: 10, gap: 32 },

    softtoy: { count: 5, size: 1.35, height: 1.28, fill: 1.38, gap: 18 },
    teddybear: { count: 5, size: 1.35, height: 1.28, fill: 1.38, gap: 18, sideGap: -4 },
    toy: { count: 6, gap: 14 },
    car: { count: 5, size: 1.32, height: 1.18, fill: 1.38, fitWidth: 5, gap: 22 },
    toycar: { count: 3, size: 1.32, height: 1.18, fill: 1.38, fitWidth: 5, gap: 16 },
    ball: { count: 6, size: 1.32 },

    donuts: { count: 5, gap: 12, sideGap: -4 },
    cookingoil: { count: 10, fill: 1.42, sideGap: -4 },
    lollipop: { count: 3 },
    lollies: { count: 7, fitWidth: 4, gap: 14, sideGap: 2 },
    potatochips: { count: 5, fitWidth: 4, gap: -8 },
    pototochips: { count: 5, fitWidth: 4, gap: -8 },
    potatochip: { count: 5, fitWidth: 4, gap: -8 },
    beef: { count: 5, size: 1.25, height: 0.88, fill: 1.22 },

    bread: { count: 4, size: 1.22, height: 0.82, fill: 1.14 },
    breads: { count: 4, size: 1.22, height: 0.82, fill: 1.14 },
    cake: { count: 5, height: 0.52, fitWidth: 4, fill: 0.86 },
    pie: { count: 5, height: 0.52, fitWidth: 4, fill: 0.86 },
    vanillacake: { count: 3, height: 0.52, fill: 0.88 },
    chocolatecake: { count: 3, height: 0.52, fill: 0.88 },
    croissants: { count: 5, size: 1.22, height: 0.82, fill: 1.14 },
    cookies: { count: 5, size: 1.12, height: 0.72, fill: 1.08 },
    cookiesbiscuits: { count: 5, size: 1.12, height: 0.72, fill: 1.08 },

    cola: { count: 10, sideGap: -4 },
    fizzydrinksoda: { count: 6, size: 1.90, height: 1.32, fill: 1.72, fitWidth: 6, span: 8, gap: 18 },
    chocolate: { count: 5, gap: 14 },
    chocolatebar: { count: 5, gap: 18 },
    porridgeoats: { count: 5, size: 1.48, gap: 18 },
    sackofgrains: { count: 5 },
    rice: { count: 5, size: 1.18, gap: 16 },
    chicken: { count: 5, size: 1.16, height: 0.95, fill: 1.18, gap: 18 },
    salmon: { count: 5, fitWidth: 4, gap: 30, sideGap: 4 },
    fish: { count: 5, fitWidth: 4, gap: 18 },
    tofu: { count: 5, gap: 4 },
    eggs: { count: 5, gap: 24 },
    pasta: { count: 5, fitWidth: 4, sideGap: 10, gap: 20 },
    driedpasta: { count: 5, fitWidth: 4, gap: 16 },
    flour: { count: 5, fill: 1.08, fitWidth: 4, gap: 16 },
    floor: { count: 5, fill: 1.08, fitWidth: 4, gap: 16 },
    icecream: { count: 6, fill: 1.08, fitWidth: 4, gap: 24 },

    bathingsoap: { count: 6, fitWidth: 4 },
    handwash: { count: 6, fitWidth: 4 },
    dishwash: { count: 8, size: 1.38, height: 1.05, fill: 1.35, gap: -6 },
    dishwashingsoap: { count: 9, size: 1.38, height: 1.05, fill: 1.35, gap: -5 },
    paper: { count: 4, gap: 18 },
    toiletpaper: { count: 5, gap: 18 },
    fancypens: { count: 5, gap: 16 },
    laptop: { count: 5, height: 0.55, fill: 0.92, fitWidth: 4 },

    carrot: { count: 4 },
    carrots: { count: 4 },
    onion: { count: 4 },
    onions: { count: 4 },
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
    'potato', 'potatoes', 'sweetpotato',
    'capsicum', 'bellpepper', 'pepper',
    'onion', 'onions',
    'grapes', 'grape',
    'apple', 'apples',
    'banana', 'bananas',
    'orange', 'oranges',
    'lemon', 'lemons', 'lime', 'limes',
    'mango', 'mangoes', 'mangos',
    'strawberry', 'strawberries', 'blueberry', 'blueberries', 'berry', 'berries',
    'lettuce', 'cucumber', 'cucumbers', 'broccoli', 'cabbage', 'spinach',
    'pumpkin', 'garlic', 'avocado', 'avocados',
    'peach', 'peaches', 'pear', 'pears', 'cherry', 'cherries',
    'melon', 'watermelon', 'kiwi', 'corn',
    'peas', 'pea', 'beans', 'bean',
    'celery', 'radish', 'radishes', 'beet', 'beets',
    'mushroom', 'mushrooms', 'zucchini', 'eggplant', 'aubergine', 'ginger',
]);

/** Juices, snacks, and packaged goods that share a produce word stay off the stand. */
const NOT_PRODUCE = /\b(juice|juices|wafer|wafers|chip|chips|soda|cake|cakes|bread|breads|cookie|cookies|biscuit|biscuits|milk|soap|detergent|oil|pasta|rice|candy|lollipop)\b/i;

const PRODUCE_WORD = /\b(apple|apples|banana|bananas|grape|grapes|orange|oranges|lemon|lemons|lime|limes|mango|mangoes|mangos|berry|berries|strawberry|strawberries|blueberry|blueberries|tomato|tomatoes|potato|potatoes|carrot|carrots|onion|onions|pepper|peppers|capsicum|cauliflower|qualiflower|lettuce|cucumber|cucumbers|broccoli|cabbage|spinach|pumpkin|garlic|avocado|avocados|peach|peaches|pear|pears|cherry|cherries|melon|watermelon|kiwi|corn|pea|peas|bean|beans|celery|radish|radishes|beet|beets|mushroom|mushrooms|zucchini|eggplant|aubergine|ginger|fruit|fruits|vegetable|vegetables)\b/i;

function compact(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function buildCountsByCompactKey() {
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

/** Maps the editable shelf fields onto the names ProductRack already reads. */
function shelfSizeFromEntry(entry) {
    if (!entry) return null;
    const fit = {};
    const height = entry.height ?? entry.shelfHeightFactor;
    const fill = entry.fill ?? entry.iconSlotFill;
    const size = entry.size ?? entry.iconScale;
    const fitWidth = entry.fitWidth ?? entry.fitWidthCount;
    const span = entry.span ?? entry.spanCount;
    if (height != null) fit.shelfHeightFactor = height;
    if (fill != null) fit.iconSlotFill = fill;
    if (size != null) fit.iconScale = size;
    if (fitWidth != null) fit.fitWidthCount = fitWidth;
    if (span != null) fit.spanCount = span;
    if (entry.gap != null) fit.gap = entry.gap;
    if (entry.sideGap != null) fit.sideGap = entry.sideGap;
    return fit;
}

/**
 * Fruits and vegetables belong on the produce stand.
 * Packaged lookalikes (grape juice, onion wafers) are excluded.
 *
 * @param {string} sItemKey
 * @param {string} [sName]
 * @returns {boolean}
 */
export function isFruitOrVegetable(sItemKey, sName) {
    const hay = `${sItemKey ?? ''} ${sName ?? ''}`.replace(/[_-]+/g, ' ');
    if (NOT_PRODUCE.test(hay)) return false;
    for (const key of [sItemKey, sName]) {
        if (!key) continue;
        const raw = String(key).trim().toLowerCase();
        if (PRODUCE_KEYS.has(raw) || PRODUCE_KEYS.has(compact(key))) return true;
    }
    return PRODUCE_WORD.test(hay);
}

function candidateKeys(sItemKey, sName) {
    const aliased = KEY_ALIASES[sItemKey] ?? KEY_ALIASES[compact(sItemKey)];
    return [sItemKey, aliased, sName].filter(Boolean);
}

/**
 * How many copies of a product to repeat across one shelf row.
 * Uses PRODUCT_SHELF first, then the authored count in RACK_SHELF_LAYOUTS.
 *
 * @param {string} sItemKey
 * @param {string} [sName]
 * @returns {number}
 */
export function getProductRowCount(sItemKey, sName) {
    if (isFruitOrVegetable(sItemKey, sName)) return PRODUCE_ROW_COUNT;

    for (const key of candidateKeys(sItemKey, sName)) {
        const compactKey = compact(key);
        const count = PRODUCT_SHELF[compactKey]?.count ?? COUNTS_BY_COMPACT_KEY[compactKey];
        if (count) return count;
    }

    return DEFAULT_ROW_COUNT;
}

/**
 * Per-product shelf sizing so API art keeps aspect and stays on one plank.
 *
 * @param {string} sItemKey
 * @param {string} [sName]
 * @returns {{ count: number, keepAspect: boolean, shelfHeightFactor?: number, iconSlotFill?: number, iconScale?: number, fitWidthCount?: number, spanCount?: number, gap?: number, sideGap?: number }}
 */
export function getProductShelfFit(sItemKey, sName) {
    const count = getProductRowCount(sItemKey, sName);
    for (const key of candidateKeys(sItemKey, sName)) {
        const entry = PRODUCT_SHELF[compact(key)];
        if (!entry) continue;
        return { count, keepAspect: true, ...shelfSizeFromEntry(entry) };
    }
    return { count, keepAspect: true };
}
