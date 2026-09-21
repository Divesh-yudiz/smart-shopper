import { PRODUCT_CATALOG } from '../pages/game/config/productAssets.js';

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

// sItemKey → { sName, standard: {price, ecoImpact, description, image}|null, eco: {...}|null }
let itemVariantsBySItemKey = {};
// sItemKey → { id, sName } — aItems no longer carries oNormal/oEco, only enough to look an item back up by id
let itemMetaBySItemKey = {};

const toVariant = (v) => v ? {
    price: v.nPrice,
    ecoImpact: v.nEcoPoints,
    description: v.sDescription,
    image: v.sImage || null,
} : null;

const buildVariants = (item) => ({
    sName: item.sName,
    standard: toVariant(item.oNormal),
    eco: toVariant(item.oEco),
});

/** Populates the item id/name lookup from aItems (called on fresh load and on resume). */
export function setItemVariants(aItems) {
    itemVariantsBySItemKey = {};
    itemMetaBySItemKey = {};
    for (const item of aItems ?? []) {
        if (!item?.sItemKey) continue;
        itemMetaBySItemKey[item.sItemKey] = { id: item._id, sName: item.sName };
        // Older API shape embedded oNormal/oEco directly on the item — cache it if present.
        if (item.oNormal || item.oEco) {
            itemVariantsBySItemKey[item.sItemKey] = buildVariants(item);
        }
    }
}

/** @param {string} sItemKey @returns {{sName, standard, eco}|null} */
export function getItemVariants(sItemKey) {
    return itemVariantsBySItemKey[sItemKey] ?? null;
}

/** @param {string} sItemKey @returns {string|null} the item's Mongo _id, for fetchItemVariants */
export function getItemId(sItemKey) {
    return itemMetaBySItemKey[sItemKey]?.id ?? null;
}

/** GET /item/:iItemId — a single item's oNormal/oEco detail by id, cached for getItemVariants. */
export async function fetchItemVariants(itemId) {
    const res = await fetch(`${BASE_URL}/item/${itemId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Item details ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const item = json.data;
    const variants = buildVariants(item);
    if (item?.sItemKey) itemVariantsBySItemKey[item.sItemKey] = variants;
    return variants;
}

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
    cauliflower: { rackId: 'fruits', key: 'qualiflower', textureKey: 'product_fruits_cabbage_icon', label: 'Cauliflower' },

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

/** POST /cart/add */
export async function addToCart(sItemKey, quantity = 1) {
    const res = await fetch(`${BASE_URL}/cart/add`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ iMiniGameId: gameId, sItemKey, nQuantity: quantity }),
    });
    if (!res.ok) throw new Error(`Cart add ${res.status}: ${res.statusText}`);
    return res.json();
}

/** POST /checkout */
export async function checkoutGame() {
    const res = await fetch(`${BASE_URL}/checkout`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ iMiniGameId: gameId }),
    });
    if (!res.ok) throw new Error(`Checkout ${res.status}: ${res.statusText}`);
    return res.json();
}

/** POST /cart/remove */
export async function removeFromCart(sItemKey) {
    const res = await fetch(`${BASE_URL}/cart/remove`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ iMiniGameId: gameId, sItemKey }),
    });
    if (!res.ok) throw new Error(`Cart remove ${res.status}: ${res.statusText}`);
    return res.json();
}

function normalizeMission(m = {}) {
    return {
        _id: m._id,
        iMiniGameId: m.iMiniGameId,
        eAgeCategory: m.eAgeCategory,
        nOrder: m.nOrder ?? 0,
        sName: m.sName ?? 'Mission',
        sDescription: m.sDescription ?? '',
        nBudget: m.nBudget ?? 0,
        nTimeLimit: m.nTimeLimit ?? 0,
        aShoppingList: m.aShoppingList ?? [],
        eStatus: m.eStatus ?? m.sStatus ?? null,
        sImage: m.sImage ?? m.sThumbnail ?? null,
    };
}

/**
 * GET /mini-games/missions — pickable missions for the player's age category.
 * Shown in the Choose Your Mission popup on Start.
 * @returns {Promise<{gameId: string, ageCategory: string, name: string, missions: Array}>}
 */
export async function fetchMissions() {
    const res = await fetch(`${BASE_URL}/missions`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Missions API ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const data = json.data ?? {};
    const raw = data.missions ?? data.aMissions ?? [];
    const missions = raw.map(normalizeMission).sort((a, b) => a.nOrder - b.nOrder);

    return {
        gameId: data.iMiniGameId,
        ageCategory: data.eAgeCategory,
        name: data.sMiniGameName,
        missions,
    };
}

/**
 * GET /mini-games/missions/:id — full brief for one mission.
 * `:id` is the mission's `_id` from the list response (not iMiniGameId —
 * that value is the shared mini-game and returns 404 here).
 * @param {string} missionId
 * @returns {Promise<{gameId: string, ageCategory: string, name: string, mission: object}>}
 */
export async function fetchMissionBrief(missionId) {
    const res = await fetch(`${BASE_URL}/missions/${missionId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Mission brief ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const data = json.data ?? {};
    const mission = normalizeMission(data.mission ?? data);
    return {
        gameId: data.iMiniGameId ?? mission.iMiniGameId,
        ageCategory: data.eAgeCategory,
        name: data.sMiniGameName,
        mission,
    };
}

/**
 * Builds the gameConfig shape Level/Preload expect directly from a single
 * mission picked in the mission-select popup — no separate module-config
 * fetch needed. `items` is reshaped from aShoppingList's iItemId/sItemKey/sName
 * so Level's setItemVariants(gameConfig.items) call keeps getItemId /
 * fetchItemVariants working for this mission's items, including after a
 * page-refresh resume (gameConfig round-trips through sessionStorage).
 * @param {object} mission one entry from fetchMissions().missions
 * @param {string} gameId fetchMissions().gameId
 */
export function buildGameConfigFromMission(mission, gameId) {
    setGameId(gameId);
    const items = (mission.aShoppingList ?? []).map((it) => ({
        _id: it.iItemId,
        sItemKey: it.sItemKey,
        sName: it.sName,
    }));

    return {
        gameId,
        missionId: mission._id,
        budget: mission.nBudget,
        timeLimit: mission.nTimeLimit,
        items,
        shoppingList: mission.aShoppingList ?? [],
        shoppingListTotal: 0,
        category: mission.sName ?? '',
        description: mission.sDescription ?? '',
        missionOrder: mission.nOrder ?? 0,
        ecoMeter: 100,
        ecoMeterMax: 100,
        badge: null,
    };
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
        ecoMeter: cfg.nEcoMeter ?? cfg.nEcoMeterMax ?? cfg.nMaxEcoMeter ?? 100,
        ecoMeterMax: cfg.nEcoMeterMax ?? cfg.nMaxEcoMeter ?? 100,
        badge: gamesJson.data.eBadge,
    };
}

/**
 * Returns a new racks array with prices/labels overridden from aItems.
 * Products not listed in aItems keep their default price and catalog label.
 * @param {Array<{sItemKey:string, sName?:string, oNormal?:{nPrice:number}, nPrice?:number}>} aItems
 * @param {ReturnType<getRacksForView>} racksData
 */
export function patchRacksWithApiPrices(aItems, racksData) {
    // Build { rackId → { productKey → { price, label } } }
    const dataLookup = {};
    for (const item of aItems) {
        const resolved = resolveItem(item.sItemKey);
        if (!resolved) continue;
        // oNormal.nPrice is the current shape; nPrice is kept as a fallback for older API responses.
        const price = item.oNormal?.nPrice ?? item.nPrice ?? null;
        (dataLookup[resolved.rackId] ??= {})[resolved.key] = { price, label: item.sName };
    }

    return racksData.map((rack) => {
        const rackData = dataLookup[rack.id];
        const patchedProducts = Object.fromEntries(
            Object.entries(rack.products).map(([key, product]) => {
                const entry = rackData?.[key];
                return [key, {
                    ...product,
                    // null price → item not in API response, shelf tag shows '-'
                    price: entry?.price ?? null,
                    label: entry?.label ?? product.label,
                }];
            })
        );
        return { ...rack, products: patchedProducts };
    });
}

/** Resolves a display label for an API shopping-list/cart item: API name → ITEM_KEY_MAP override → catalog label → humanized key. */
export function resolveItemLabel(sItemKey, resolved) {
    const apiName = getItemVariants(sItemKey)?.sName;
    if (apiName) return apiName;
    if (resolved.label) return resolved.label;
    const catalogLabel = PRODUCT_CATALOG[resolved.rackId]?.[resolved.key]?.label;
    if (catalogLabel) return catalogLabel;
    return resolved.key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Converts aShoppingList from the API into the format expected by ShoppingListPanel.
 * Always returns exactly 6 slots (pads with null).
 * @param {Array<{sItemKey:string, nQuantity:number, nPrice:number}>} aShoppingList
 * @returns {Array<{key,textureKey,label,required,collected}|null>}
 */
export function buildShoppingListEntries(aShoppingList) {
    const SLOT_COUNT = 6;
    const entries = aShoppingList.map((item) => {
        const resolved = resolveItem(item.sItemKey);
        if (!resolved) return null;
        return {
            key: resolved.key,
            textureKey: resolved.textureKey,
            label: resolveItemLabel(item.sItemKey, resolved),
            required: item.nQuantity,
            collected: 0,
        };
    });
    while (entries.length < SLOT_COUNT) entries.push(null);
    return entries.slice(0, SLOT_COUNT);
}

/**
 * Converts the aCartItems array from a cart/add or cart/remove response into the
 * flat, one-entry-per-unit item list MyCartPanel expects — the cart's authoritative
 * source of truth is always this server response, never local bookkeeping.
 * @param {Array<{sItemKey:string, nQuantity:number, nPrice:number}>} aCartItems
 */
export function buildCartItemsFromApi(aCartItems) {
    const items = [];
    for (const entry of aCartItems ?? []) {
        const resolved = resolveItem(entry.sItemKey);
        if (!resolved) continue;
        const label = resolveItemLabel(entry.sItemKey, resolved);
        const qty = Math.max(0, entry.nQuantity ?? 0);
        for (let i = 0; i < qty; i++) {
            items.push({
                key: resolved.key,
                textureKey: resolved.textureKey,
                rackId: resolved.rackId,
                label,
                price: entry.nPrice ?? 0,
            });
        }
    }
    return items;
}
