const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2YTE2ODAwNTM1ZTA5MjQyMDgwMTg2MjgiLCJzRW1haWwiOiJyYWp2aUBnbWFpbC5jb20iLCJpYXQiOjE3ODIxMDQ5MzR9.lyBYfpYfFPNyYCwa_KkWS-KAlzWe_DyWuNm6BHwinGs';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': AUTH_TOKEN,
});

// Resolved dynamically — set by fetchGameConfig, used by addToCart / removeFromCart
let gameId = null;

/** Restore gameId after a page refresh (called by Level when loading saved state). */
export function setGameId(id) { gameId = id; }

/**
 * Maps API sItemKey → internal rack/product identifiers.
 * rackId   : key in MARKET_RACKS
 * key      : product key within that rack's products object
 * textureKey: preloaded Phaser texture key
 */
const ITEM_KEY_MAP = {
    // ── beverages ──────────────────────────────────────────────────────────────
    milk: { rackId: 'beverages', key: 'milk', textureKey: 'product_beverages_milk' },
    orange_juice: { rackId: 'beverages', key: 'orangeJuice', textureKey: 'product_beverages_orangeJuice' },
    grape_juice: { rackId: 'beverages', key: 'grapeJuice', textureKey: 'product_beverages_grapeJuice' },
    aloe_vera_juice: {
        rackId: 'beverages',
        key: 'alowveraJuice',
        textureKey: 'product_beverages_alowveraJuice',
        label: 'Aloe Vera Juice',
    },

    // ── fruits / produce (icon textures used in cart / shopping-list / trolley)
    tomato: { rackId: 'fruits', key: 'tomatos', textureKey: 'product_fruits_tomato_icon' },
    potato: { rackId: 'fruits', key: 'potato', textureKey: 'product_fruits_potato_icon' },
    carrot: { rackId: 'fruits', key: 'carrots', textureKey: 'product_fruits_carrot_icon' },
    onion: { rackId: 'fruits', key: 'onion', textureKey: 'product_fruits_onion_icon' },
    capsicum: { rackId: 'fruits', key: 'capsicum', textureKey: 'product_fruits_capsicum_icon' },
    qualiflower: { rackId: 'fruits', key: 'qualiflower', textureKey: 'product_fruits_cabbage_icon' },

    // ── candy ──────────────────────────────────────────────────────────────────
    lollipop: { rackId: 'candy', key: 'lollipop', textureKey: 'product_candy_lollipop' },
    candy: { rackId: 'candy', key: 'candy', textureKey: 'product_candy_candy' },
    jelly: { rackId: 'candy', key: 'jelly', textureKey: 'product_candy_jelly' },
    giftCandy: { rackId: 'candy', key: 'giftCandy', textureKey: 'product_candy_giftCandy' },

    // ── toys ───────────────────────────────────────────────────────────────────
    teddybear: { rackId: 'toys', key: 'teddybear', textureKey: 'product_toys_teddybear' },
    toyCar: { rackId: 'toys', key: 'toyCar', textureKey: 'product_toys_toyCar' },
    rings: { rackId: 'toys', key: 'rings', textureKey: 'product_toys_rings' },
    ball: { rackId: 'toys', key: 'ball', textureKey: 'product_toys_ball' },

    // ── chips / snacks ─────────────────────────────────────────────────────────
    chilliWafers: { rackId: 'chips', key: 'chilliWafers', textureKey: 'product_chips_chilliWafers' },
    lemonWafers: { rackId: 'chips', key: 'lemonWafers', textureKey: 'product_chips_lemonWafers' },
    onionWafers: { rackId: 'chips', key: 'onionWafers', textureKey: 'product_chips_onionWafers' },
    masalaWafers: { rackId: 'chips', key: 'masalaWafers', textureKey: 'product_chips_masalaWafers' },

    // ── bakery ─────────────────────────────────────────────────────────────────
    vanillaCake: { rackId: 'cakes', key: 'vanillaCake', textureKey: 'product_cakes_vanillaCake' },
    chocolateCake: { rackId: 'cakes', key: 'chocolateCake', textureKey: 'product_cakes_chocolateCake' },
    breads: { rackId: 'cakes', key: 'breads', textureKey: 'product_cakes_breads' },
    cookies: { rackId: 'cakes', key: 'cookies', textureKey: 'product_cakes_cookies' },

    // ── toiletries / household ─────────────────────────────────────────────────
    cleaner: { rackId: 'toiletaries', key: 'cleaner', textureKey: 'product_toiletaries_cleaner' },
    dishwash: { rackId: 'toiletaries', key: 'dishwash', textureKey: 'product_toiletaries_dishwash' },
    handwash: { rackId: 'toiletaries', key: 'handwash', textureKey: 'product_toiletaries_handwash' },
    paper: { rackId: 'toiletaries', key: 'paper', textureKey: 'product_toiletaries_paper' },

    // ── electronics ────────────────────────────────────────────────────────────
    laptop: { rackId: 'electronics', key: 'laptop', textureKey: 'product_expensive-items_laptop' },
    mobile: { rackId: 'electronics', key: 'mobile', textureKey: 'product_expensive-items_mobile' },
    headphones: { rackId: 'electronics', key: 'headphones', textureKey: 'product_expensive-items_headphones' },
    gift: { rackId: 'electronics', key: 'gift', textureKey: 'product_expensive-items_gift' },

    // ── ration / grocery ───────────────────────────────────────────────────────
    cola: { rackId: 'ration', key: 'cola', textureKey: 'product_ration_cola' },
    donuts: { rackId: 'ration', key: 'donuts', textureKey: 'product_ration_donuts' },
    icecream: { rackId: 'ration', key: 'icecream', textureKey: 'product_ration_icecreame', label: 'Icecream' },
    rice: { rackId: 'ration', key: 'rice', textureKey: 'product_ration_rice' },
};

/** @param {string} sItemKey */
export function resolveItem(sItemKey) {
    return ITEM_KEY_MAP[sItemKey] ?? null;
}

// reverse map: product.key or product.textureKey → sItemKey
const PRODUCT_TO_ITEM_KEY = {};
for (const [sItemKey, info] of Object.entries(ITEM_KEY_MAP)) {
    PRODUCT_TO_ITEM_KEY[info.key] = sItemKey;
    PRODUCT_TO_ITEM_KEY[info.textureKey] = sItemKey;
}

/** Resolve a cart product object back to its API sItemKey. */
export function resolveItemKeyFromProduct(product) {
    return PRODUCT_TO_ITEM_KEY[product?.key]
        ?? PRODUCT_TO_ITEM_KEY[product?.textureKey]
        ?? null;
}

/** POST /mini-games/cart/add */
export async function addToCart(sItemKey) {
    const res = await fetch(`${BASE_URL}/mini-games/cart/add`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ iMiniGameId: gameId, sItemKey }),
    });
    if (!res.ok) throw new Error(`Cart add ${res.status}: ${res.statusText}`);
    return res.json();
}

/** POST /mini-games/checkout */
export async function checkoutGame() {
    const res = await fetch(`${BASE_URL}/mini-games/checkout`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ iMiniGameId: gameId }),
    });
    if (!res.ok) throw new Error(`Checkout ${res.status}: ${res.statusText}`);
    return res.json();
}

/** POST /mini-games/cart/remove */
export async function removeFromCart(sItemKey) {
    const res = await fetch(`${BASE_URL}/mini-games/cart/remove`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ iMiniGameId: gameId, sItemKey }),
    });
    if (!res.ok) throw new Error(`Cart remove ${res.status}: ${res.statusText}`);
    return res.json();
}

/**
 * Fetch mini-games config for the configured module.
 * Sets the module-level `gameId` used by addToCart / removeFromCart.
 */
const MODULE_ID = import.meta.env.VITE_MODULE_ID ?? '69c2724009d18ece8c914c74';

export async function fetchGameConfig() {
    const gamesRes = await fetch(`${BASE_URL}/${MODULE_ID}`, { headers: authHeaders() });
    if (!gamesRes.ok) throw new Error(`Mini-games API ${gamesRes.status}: ${gamesRes.statusText}`);

    const gamesJson = await gamesRes.json();
    const game = gamesJson.data.miniGames.find((g) => g.eGameType === 'smart_shopper');
    if (!game) throw new Error('smart_shopper mini-game not found in module');

    gameId = game._id;
    const cfg = game.oGameConfig;
    return {
        gameId: game._id,
        budget: cfg.nBudget,
        timeLimit: game.nTimeLimit,
        items: cfg.aItems,
        shoppingList: cfg.aShoppingList,
        shoppingListTotal: cfg.nShoppingListTotal ?? 0,
        category: cfg.sSelectedCategory ?? '',
        badge: gamesJson.data.eBadge,
    };
}

/**
 * Returns a new racks array with prices overridden from aItems.
 * Products not listed in aItems keep their default price.
 * @param {Array<{sItemKey:string, nPrice:number}>} aItems
 * @param {ReturnType<getRacksForView>} racksData
 */
export function patchRacksWithApiPrices(aItems, racksData) {
    // Build { rackId → { productKey → price } }
    const priceLookup = {};
    for (const item of aItems) {
        const resolved = resolveItem(item.sItemKey);
        if (!resolved) continue;
        (priceLookup[resolved.rackId] ??= {})[resolved.key] = item.nPrice;
    }

    return racksData.map((rack) => {
        const prices = priceLookup[rack.id];
        const patchedProducts = Object.fromEntries(
            Object.entries(rack.products).map(([key, product]) => [
                key,
                // null price → item not in API response, shelf tag shows '-'
                { ...product, price: prices?.[key] ?? null },
            ])
        );
        return { ...rack, products: patchedProducts };
    });
}

/**
 * Converts aShoppingList from the API into the format expected by ShoppingListPanel.
 * Always returns exactly 6 slots (pads with null).
 * @param {Array<{sItemKey:string, nQuantity:number, nPrice:number}>} aShoppingList
 * @returns {Array<{key,textureKey,required,collected}|null>}
 */
export function buildShoppingListEntries(aShoppingList) {
    const SLOT_COUNT = 6;
    const entries = aShoppingList.map((item) => {
        const resolved = resolveItem(item.sItemKey);
        if (!resolved) return null;
        return {
            key: resolved.key,
            textureKey: resolved.textureKey,
            required: item.nQuantity,
            collected: 0,
        };
    });
    while (entries.length < SLOT_COUNT) entries.push(null);
    return entries.slice(0, SLOT_COUNT);
}
