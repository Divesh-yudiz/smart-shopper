import { PRODUCT_CATALOG, RACK_ASSET_CATEGORIES } from '../pages/game/config/productAssets.js';
import { getProductShelfFit } from '../pages/game/config/productRowCounts.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2YTE2ODAwNTM1ZTA5MjQyMDgwMTg2MjgiLCJzRW1haWwiOiJyYWp2aUBnbWFpbC5jb20iLCJpYXQiOjE3ODIxMDQ5MzR9.lyBYfpYfFPNyYCwa_KkWS-KAlzWe_DyWuNm6BHwinGs';

const DEFAULT_USER_ID = import.meta.env.VITE_USER_ID ?? '6aabdef802349a8149f87e42';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': AUTH_TOKEN,
});

/**
 * Resolve the player user id for mission-list requests.
 * Prefer `?userId=` / `?iUserId=` on the page URL, then VITE_USER_ID.
 */
export function getUserId() {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get('userId') || params.get('iUserId');
        if (fromQuery) return fromQuery;
    }
    return DEFAULT_USER_ID;
}

// Resolved dynamically — set by fetchGameConfig / startMission, used by cart APIs
let gameId = null;
let sessionId = null;
let missionId = null;

/** Restore gameId after a page refresh (called by Level when loading saved state). */
export function setGameId(id) { gameId = id; }
export function getGameId() { return gameId; }

/** Active mission session from POST .../missions/:id/start. */
export function setSessionId(id) { sessionId = id; }
export function getSessionId() { return sessionId; }

/** Active mission id — required by POST /cart/add. */
export function setMissionId(id) { missionId = id; }
export function getMissionId() { return missionId; }

function sessionPayload(extra = {}) {
    const body = { ...extra };
    if (gameId) body.iMiniGameId = gameId;
    if (sessionId) body.iSessionId = sessionId;
    return body;
}

// sItemKey → { sName, standard: {price, ecoImpact, description, image}|null, eco: {...}|null }
let itemVariantsBySItemKey = {};
// sItemKey → { id, sName } — aItems no longer carries oNormal/oEco, only enough to look an item back up by id
let itemMetaBySItemKey = {};

const toVariant = (v) => v ? {
    price: v.nCoins ?? v.nPrice ?? null,
    ecoImpact: v.nEcoPoints ?? null,
    description: v.sDescription ?? '',
    image: v.sImage || null,
    name: v.sName || null,
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
        itemMetaBySItemKey[item.sItemKey] = {
            id: item._id ?? item.iItemId ?? item.id ?? null,
            sName: item.sName ?? null,
            sImage: item.sImage ?? item.oNormal?.sImage ?? null,
        };
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

/** GET /smart-shopper/item/:iItemId — a single item's oNormal/oEco detail by id, cached for getItemVariants. */
export async function fetchItemVariants(itemId) {
    const res = await fetch(`${BASE_URL}/smart-shopper/item/${itemId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Item details ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const item = json.data;
    const variants = buildVariants(item);
    if (item?.sItemKey) itemVariantsBySItemKey[item.sItemKey] = variants;
    return variants;
}

/**
 * GET /smart-shopper/items?iMissionId=… — full catalog of items available in a mission
 * (prices, eco, names). Used to drive shelf tags / variant cache in gameplay.
 * @param {string} missionId
 * @returns {Promise<Array<object>>}
 */
export async function fetchMissionItems(missionId) {
    if (!missionId) throw new Error('fetchMissionItems requires a missionId');
    const res = await fetch(
        `${BASE_URL}/smart-shopper/items?iMissionId=${encodeURIComponent(missionId)}`,
        { headers: authHeaders() },
    );
    if (!res.ok) throw new Error(`Mission items ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const data = json.data ?? json ?? {};
    const raw = Array.isArray(data)
        ? data
        : (data.aItems ?? data.items ?? data.aItemList ?? []);

    return (raw ?? []).filter(Boolean).map((item) => ({
        ...item,
        _id: item._id ?? item.iItemId ?? item.id ?? null,
        sItemKey: item.sItemKey ?? item.sKey ?? null,
        sName: item.sName ?? item.sLabel ?? item.name ?? null,
    }));
}

/** Phaser texture key for an API item's normal (shelf) image. */
export function apiNormalTextureKey(sItemKey) {
    if (!sItemKey) return null;
    return `api_item_${String(sItemKey).replace(/[^a-zA-Z0-9_-]/g, '_')}_normal`;
}

/** Phaser texture key for an API item's eco image. */
export function apiEcoTextureKey(sItemKey) {
    if (!sItemKey) return null;
    return `api_item_${String(sItemKey).replace(/[^a-zA-Z0-9_-]/g, '_')}_eco`;
}

/**
 * Maps API sItemKey → internal rack placement.
 * Product art/labels come from the items API (sName + oNormal.sImage).
 * `key` defaults to sItemKey when shelves are rebuilt from aItems.
 */
const ITEM_KEY_MAP = {
    // ── beverages ──────────────────────────────────────────────────────────────
    milk: { rackId: 'beverages' },
    orange_juice: { rackId: 'beverages' },
    grape_juice: { rackId: 'beverages' },
    aloe_vera_juice: { rackId: 'beverages', label: 'Aloe Vera Juice' },
    water: { rackId: 'beverages' },

    // ── fruits / produce ───────────────────────────────────────────────────────
    tomato: { rackId: 'fruits' },
    tomatoes: { rackId: 'fruits', label: 'Tomatoes' },
    tomatos: { rackId: 'fruits' },
    potato: { rackId: 'fruits' },
    potatoes: { rackId: 'fruits', label: 'Potatoes' },
    carrot: { rackId: 'fruits' },
    carrots: { rackId: 'fruits' },
    onion: { rackId: 'fruits' },
    onions: { rackId: 'fruits' },
    capsicum: { rackId: 'fruits' },
    bell_pepper: { rackId: 'fruits', label: 'Bell Pepper' },
    qualiflower: { rackId: 'fruits' },
    cauliflower: { rackId: 'fruits', label: 'Cauliflower' },
    grapes: { rackId: 'fruits' },

    // ── candy ──────────────────────────────────────────────────────────────────
    lollipop: { rackId: 'candy' },
    candy: { rackId: 'candy' },
    candy_2: { rackId: 'candy', label: 'Candy' },
    jelly: { rackId: 'candy' },
    giftCandy: { rackId: 'candy' },

    // ── toys ───────────────────────────────────────────────────────────────────
    teddybear: { rackId: 'toys' },
    soft_toy: { rackId: 'toys', label: 'Soft Toy' },
    toyCar: { rackId: 'toys' },
    toy: { rackId: 'toys', label: 'Toy' },
    rings: { rackId: 'toys' },
    ball: { rackId: 'toys' },
    car: { rackId: 'toys' },

    // ── chips / snacks ─────────────────────────────────────────────────────────
    chilliWafers: { rackId: 'chips' },
    lemonWafers: { rackId: 'chips' },
    onionWafers: { rackId: 'chips' },
    masalaWafers: { rackId: 'chips' },

    // ── bakery ─────────────────────────────────────────────────────────────────
    vanillaCake: { rackId: 'cakes' },
    chocolateCake: { rackId: 'cakes' },
    cake: { rackId: 'cakes', label: 'Cake' },
    pie: { rackId: 'cakes', label: 'Pie' },
    breads: { rackId: 'cakes' },
    bread: { rackId: 'cakes', label: 'Bread' },
    butter: { rackId: 'cakes', label: 'Butter' },
    cookies: { rackId: 'cakes' },
    cookies_biscuits: { rackId: 'cakes', label: 'Cookies / Biscuits' },
    croissants: { rackId: 'cakes' },

    // ── toiletries / household ─────────────────────────────────────────────────
    cleaner: { rackId: 'toiletaries' },
    laundry_detergent: { rackId: 'toiletaries', label: 'Laundry Detergent' },
    dishwash: { rackId: 'toiletaries' },
    dish_washing_soap: { rackId: 'toiletaries', label: 'Dish Washing Soap' },
    handwash: { rackId: 'toiletaries' },
    paper: { rackId: 'toiletaries' },
    fancy_pens: { rackId: 'toiletaries', label: 'Fancy Pens' },

    // ── electronics ────────────────────────────────────────────────────────────
    laptop: { rackId: 'electronics' },
    mobile: { rackId: 'electronics' },
    smartphone: { rackId: 'electronics', label: 'Smartphone' },
    headphones: { rackId: 'electronics' },
    headphone: { rackId: 'electronics', label: 'Headphone' },
    gift: { rackId: 'electronics' },
    gift_box: { rackId: 'electronics', label: 'Gift Box' },
    video_game: { rackId: 'electronics', label: 'Video Game' },

    // ── ration / grocery ───────────────────────────────────────────────────────
    cola: { rackId: 'ration' },
    fizzy_drink_soda: { rackId: 'ration', label: 'Fizzy Drink / Soda' },
    donuts: { rackId: 'ration' },
    icecream: { rackId: 'ration', label: 'Icecream' },
    ice_cream_tub: { rackId: 'ration', label: 'Ice Cream Tub' },
    rice: { rackId: 'ration' },
    salmon: { rackId: 'ration', label: 'Salmon' },
    beef: { rackId: 'ration' },
    tofu: { rackId: 'ration' },
    chicken: { rackId: 'ration' },
    fish: { rackId: 'ration' },
    eggs: { rackId: 'ration' },
    porridge_oats: { rackId: 'ration', label: 'Porridge Oats' },
    sack_of_grains: { rackId: 'ration', label: 'Sack of Grains' },
    cooking_oil: { rackId: 'ration', label: 'Cooking Oil' },
};

/** Image URL folder under /products/normal|eco/ → market rack id */
const URL_CATEGORY_TO_RACK = Object.freeze({
    candy: 'candy',
    fruits: 'fruits',
    beverages: 'beverages',
    toys: 'toys',
    chips: 'chips',
    cakes: 'cakes',
    toiletaries: 'toiletaries',
    'expensive-items': 'electronics',
    ration: 'ration',
});

/** Root-level product images (no category folder in URL) → rack */
const ROOT_ITEM_RACK = Object.freeze({
    tofu: 'ration',
    fancy_pens: 'toiletaries',
    beef: 'ration',
    croissants: 'cakes',
    porridge_oats: 'ration',
    cookies_biscuits: 'cakes',
    chicken: 'ration',
    eggs: 'ration',
    video_game: 'electronics',
    car: 'toys',
    water: 'beverages',
    sack_of_grains: 'ration',
    fish: 'ration',
    cooking_oil: 'ration',
});

/**
 * Infer market rack from an items-API image URL
 * (…/products/normal|eco/<category>/<file>.png).
 */
export function rackIdFromProductImageUrl(url) {
    if (!url) return null;
    const withFolder = String(url).match(/\/products\/(?:normal|eco)\/([^/]+)\/[^/?#]+/i);
    if (withFolder?.[1] && URL_CATEGORY_TO_RACK[withFolder[1]]) {
        return URL_CATEGORY_TO_RACK[withFolder[1]];
    }
    return null;
}

function resolveRackIdForApiItem(item, sItemKey) {
    const imageUrl = item?.oNormal?.sImage ?? item?.sImage
        ?? itemMetaBySItemKey[sItemKey]?.sImage
        ?? getItemVariants(sItemKey)?.standard?.image
        ?? null;
    return rackIdFromProductImageUrl(imageUrl)
        ?? ITEM_KEY_MAP[sItemKey]?.rackId
        ?? ROOT_ITEM_RACK[sItemKey]
        ?? 'ration';
}

/**
 * Phaser texture key for an item variant (API images loaded in Preload).
 * @param {string} sItemKey
 * @param {{ eco?: boolean }} [opts]
 */
export function resolveItemTextureKey(sItemKey, { eco = false } = {}) {
    if (!sItemKey) return null;
    return eco ? apiEcoTextureKey(sItemKey) : apiNormalTextureKey(sItemKey);
}

function humanizeItemKey(sItemKey) {
    return String(sItemKey ?? 'Item')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @param {string} sItemKey @param {{ eco?: boolean }} [opts] */
export function resolveItem(sItemKey, { eco = false } = {}) {
    if (!sItemKey) return null;
    const textureKey = resolveItemTextureKey(sItemKey, { eco });
    const mapped = ITEM_KEY_MAP[sItemKey];
    const meta = itemMetaBySItemKey[sItemKey];
    const rackId = resolveRackIdForApiItem(null, sItemKey)
        ?? mapped?.rackId
        ?? 'ration';
    const label = meta?.sName
        ?? mapped?.label
        ?? humanizeItemKey(sItemKey);

    return {
        rackId,
        key: sItemKey,
        textureKey,
        label,
        sItemKey,
        fallback: !mapped && !meta,
    };
}

// reverse map: product key / API texture key → sItemKey
const PRODUCT_TO_ITEM_KEY = {};
for (const sItemKey of Object.keys(ITEM_KEY_MAP)) {
    PRODUCT_TO_ITEM_KEY[sItemKey] = sItemKey;
    const normalKey = apiNormalTextureKey(sItemKey);
    const ecoKey = apiEcoTextureKey(sItemKey);
    if (normalKey) PRODUCT_TO_ITEM_KEY[normalKey] = sItemKey;
    if (ecoKey) PRODUCT_TO_ITEM_KEY[ecoKey] = sItemKey;
}

/** Resolve a cart product object back to its API sItemKey. */
export function resolveItemKeyFromProduct(product) {
    return product?.sItemKey
        ?? PRODUCT_TO_ITEM_KEY[product?.key]
        ?? PRODUCT_TO_ITEM_KEY[product?.textureKey]
        ?? null;
}

/**
 * GET /cart?iMissionId=… — current cart details for View Cart.
 * @param {string} [iMissionId]
 */
export async function fetchCart(iMissionId) {
    const mission = iMissionId ?? missionId;
    if (!mission) throw new Error('fetchCart requires iMissionId');
    const res = await fetch(
        `${BASE_URL}/cart?iMissionId=${encodeURIComponent(mission)}`,
        { headers: authHeaders() },
    );
    if (!res.ok) throw new Error(`Cart fetch ${res.status}: ${res.statusText}`);
    return res.json();
}

/** Cart line variant sent to /cart/add and /cart/remove. */
export function cartVariantOf(entry) {
    if (entry?.eVariant === 'sale' || entry?.isSaleVariant) return 'sale';
    if (entry?.eVariant === 'eco' || entry?.isEcoVariant) return 'eco';
    return 'normal';
}

function resolveCartVariant(eVariant) {
    if (eVariant === 'eco' || eVariant === 'sale') return eVariant;
    return 'normal';
}

/**
 * POST /cart/add — body: { iMissionId, iItemId, eVariant }.
 * @param {{ iItemId: string, eVariant?: 'eco'|'normal'|'sale', iMissionId?: string }} opts
 */
export async function addToCart({ iItemId, eVariant = 'normal', iMissionId } = {}) {
    const mission = iMissionId ?? missionId;
    if (!mission) throw new Error('addToCart requires iMissionId');
    if (!iItemId) throw new Error('addToCart requires iItemId');
    const variant = resolveCartVariant(eVariant);
    const res = await fetch(`${BASE_URL}/cart/add`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            iMissionId: mission,
            iItemId,
            eVariant: variant,
        }),
    });
    let json = null;
    try {
        json = await res.json();
    } catch {
        json = null;
    }
    const data = json?.data ?? {};
    const rejected = !res.ok
        || json?.success === false
        || json?.bSuccess === false
        || data.bAdded === false
        || data.bCanAdd === false
        || data.canAdd === false;
    if (rejected) {
        const err = new Error(json?.message || data.sMessage || data.message || `Cart add ${res.status}`);
        err.payload = json;
        err.status = res.status;
        throw err;
    }
    return json;
}

/**
 * POST /checkout — body: { iMissionId, iMiniGameId, nTimeRemaining }.
 * @param {{ iMissionId?: string, iMiniGameId?: string, nTimeRemaining?: number }} [opts]
 */
export async function checkoutGame({ iMissionId, iMiniGameId, nTimeRemaining } = {}) {
    const mission = iMissionId ?? missionId;
    const miniGame = iMiniGameId ?? gameId;
    if (!mission) throw new Error('checkoutGame requires iMissionId');
    if (!miniGame) throw new Error('checkoutGame requires iMiniGameId');
    const body = {
        iMissionId: mission,
        iMiniGameId: miniGame,
    };
    if (nTimeRemaining != null) body.nTimeRemaining = Math.max(0, Math.round(nTimeRemaining));
    const res = await fetch(`${BASE_URL}/checkout`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Checkout ${res.status}: ${res.statusText}`);
    return res.json();
}

/** Mission id from checkout / start payloads (`data.iMissionId`, session, or nested mission). */
export function missionIdFromResponse(json) {
    const data = json?.data ?? json ?? {};
    return data.iMissionId
        ?? data.missionId
        ?? data.session?.iMissionId
        ?? data.oMission?._id
        ?? data.oMission?.iMissionId
        ?? data.mission?._id
        ?? data.mission?.iMissionId
        ?? null;
}

/**
 * POST /cart/remove — body: { iMissionId, iItemId, eVariant }.
 * @param {{ iItemId: string, eVariant?: 'eco'|'normal'|'sale', iMissionId?: string }} opts
 */
export async function removeFromCart({ iItemId, eVariant = 'normal', iMissionId } = {}) {
    const mission = iMissionId ?? missionId;
    if (!mission) throw new Error('removeFromCart requires iMissionId');
    if (!iItemId) throw new Error('removeFromCart requires iItemId');
    const variant = resolveCartVariant(eVariant);
    const res = await fetch(`${BASE_URL}/cart/remove`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            iMissionId: mission,
            iItemId,
            eVariant: variant,
        }),
    });
    let json = null;
    try {
        json = await res.json();
    } catch {
        json = null;
    }
    const data = json?.data ?? {};
    const rejected = !res.ok
        || json?.success === false
        || json?.bSuccess === false
        || data.bRemoved === false
        || data.removed === false;
    if (rejected) {
        const err = new Error(json?.message || data.sMessage || data.message || `Cart remove ${res.status}`);
        err.payload = json;
        err.status = res.status;
        throw err;
    }
    return json;
}

function normalizeMission(m = {}, index = 0) {
    const nCoins = m.nCoins ?? m.nBudget ?? 0;
    const nTimeLimit = m.nTimeLimit ?? 0;
    const sTimeLimit = m.sTimeLimit
        ?? (nTimeLimit > 0
            ? `${String(Math.floor(nTimeLimit / 60)).padStart(2, '0')}:${String(nTimeLimit % 60).padStart(2, '0')}`
            : '');

    const bPlayed = m.bPlayed === true || m.bPlayed === 'true';
    const nShoppingListCount = m.nShoppingListCount
        ?? (Array.isArray(m.aShoppingList)
            ? m.aShoppingList.reduce((sum, it) => sum + (it.nQuantity ?? 0), 0)
            : 0);

    return {
        _id: m._id ?? m.iMissionId ?? m.id ?? null,
        iMiniGameId: m.iMiniGameId,
        eAgeCategory: m.eAgeCategory,
        nOrder: m.nOrder ?? m.nMissionNumber ?? index + 1,
        sMissionLabel: m.sMissionLabel ?? null,
        sName: m.sName ?? 'Mission',
        sDescription: m.sDescription ?? '',
        nCoins,
        nBudget: nCoins,
        nEcoLimit: m.nEcoLimit ?? 100,
        nTimeLimit,
        sTimeLimit,
        nShoppingListCount,
        aShoppingList: m.aShoppingList ?? [],
        bPlayed,
        eStatus: m.eStatus ?? m.sStatus ?? (bPlayed ? 'played' : 'not_played'),
        sImage: m.sImage ?? m.sThumbnail ?? null,
        nRating: m.nRating ?? m.nStars ?? 0,
        nScore: m.nScore ?? m.nBestScore ?? null,
    };
}

/**
 * GET /mini-games/smart-shopper/missions — all pickable missions.
 * Shown in Choose Your Mission.
 * @returns {Promise<{gameId: string, ageCategory: string, name: string, missions: Array}>}
 */
export async function fetchMissions() {
    const res = await fetch(`${BASE_URL}/smart-shopper/missions`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Missions API ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const data = json.data ?? json ?? {};
    const raw = Array.isArray(data)
        ? data
        : (data.missions ?? data.aMissions ?? data.aMissionList ?? []);
    const missions = raw
        .map((m, i) => normalizeMission(m, i))
        .sort((a, b) => a.nOrder - b.nOrder);

    return {
        gameId: data.iMiniGameId ?? missions[0]?.iMiniGameId,
        ageCategory: data.eAgeCategory,
        name: data.sName ?? data.sMiniGameName,
        missions,
    };
}

/**
 * GET /mini-games/smart-shopper/missions/:id — full detail for one mission.
 * `:id` is the mission's `_id` from the list response.
 * @param {string} missionId
 * @returns {Promise<{gameId: string, ageCategory: string, name: string, mission: object}>}
 */
export async function fetchMissionBrief(missionId) {
    if (!missionId) throw new Error('fetchMissionBrief requires a missionId');
    const res = await fetch(`${BASE_URL}/smart-shopper/missions/${missionId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Mission brief ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const data = json.data ?? json ?? {};
    const rawMission = data.mission ?? data.oMission ?? data;
    const mission = normalizeMission({
        ...rawMission,
        _id: rawMission?._id ?? rawMission?.iMissionId ?? rawMission?.id ?? missionId,
    });
    return {
        gameId: data.iMiniGameId ?? mission.iMiniGameId,
        ageCategory: data.eAgeCategory ?? mission.eAgeCategory,
        name: data.sName ?? data.sMiniGameName ?? mission.sName,
        mission,
    };
}

/**
 * POST /smart-shopper/missions/:id/start — begin a mission session.
 * `:id` is the mission's `_id`. Call when entering gameplay (not on resume).
 * @param {string} missionId
 */
export async function startMission(missionId) {
    if (!missionId) throw new Error('startMission requires a missionId');
    const res = await fetch(`${BASE_URL}/smart-shopper/missions/${missionId}/start`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(sessionPayload()),
    });
    if (!res.ok) {
        let detail = res.statusText;
        try {
            const errJson = await res.json();
            detail = errJson?.message ?? errJson?.sMessage ?? detail;
        } catch { /* ignore */ }
        throw new Error(`Mission start ${res.status}: ${detail}`);
    }
    return res.json();
}

/**
 * Merge POST .../missions/:id/start response into the brief gameConfig so Level
 * boots with the server session (timer, coins, eco, cart, shopping list).
 */
export function mergeStartSessionIntoConfig(baseConfig = {}, startJson = {}) {
    const data = startJson?.data ?? startJson ?? {};
    const session = data.session ?? {};

    if (session.iMiniGameId) setGameId(session.iMiniGameId);
    else if (baseConfig.gameId) setGameId(baseConfig.gameId);
    if (session.iSessionId) setSessionId(session.iSessionId);
    const nextMissionId = session.iMissionId ?? baseConfig.missionId ?? null;
    if (nextMissionId) setMissionId(nextMissionId);

    const nameByKey = Object.fromEntries(
        (baseConfig.shoppingList ?? [])
            .filter((it) => it?.sItemKey)
            .map((it) => [it.sItemKey, it.sName]),
    );

    const shoppingList = (session.aShoppingList ?? baseConfig.shoppingList ?? []).map((it) => ({
        ...it,
        sName: it.sName ?? nameByKey[it.sItemKey] ?? it.sItemKey,
    }));

    const items = shoppingList.map((it) => ({
        _id: it.iItemId,
        sItemKey: it.sItemKey,
        sName: it.sName,
    }));

    const ecoMax = session.nEcoLimit ?? baseConfig.ecoMeterMax ?? 100;
    const ecoRemaining = session.nEcoRemaining
        ?? (session.nEcoSpent != null ? Math.max(0, ecoMax - session.nEcoSpent) : null);

    const oSale = normalizeSaleOffer(
        data.oSale ?? session.oSale ?? startJson?.oSale ?? baseConfig.oSale ?? null,
    );

    return {
        ...baseConfig,
        sessionId: session.iSessionId ?? baseConfig.sessionId ?? null,
        gameId: session.iMiniGameId ?? baseConfig.gameId,
        missionId: session.iMissionId ?? baseConfig.missionId,
        budget: session.nCoinsBudget ?? baseConfig.budget,
        timeLimit: session.nTimeRemaining ?? session.nTimeLimit ?? baseConfig.timeLimit,
        ecoMeterMax: ecoMax,
        ecoMeter: ecoRemaining ?? baseConfig.ecoMeter ?? ecoMax,
        shoppingList,
        items: (baseConfig.items?.length > items.length)
            ? baseConfig.items
            : (items.length ? items : (baseConfig.items ?? [])),
        category: data.sName ?? baseConfig.category,
        description: data.sDescription ?? baseConfig.description,
        coinsRemaining: session.nCoinsRemaining ?? null,
        initialCartItems: session.aCartItems ?? [],
        oSale,
    };
}

/** Flash-sale shelf item from POST .../missions/:id/start (`oSale`). */
function normalizeSaleOffer(raw) {
    if (!raw || typeof raw !== 'object' || !raw.sItemKey) return null;
    const salePrice = raw.nSalePrice ?? raw.nCoins ?? null;
    return {
        nOrder: raw.nOrder ?? 0,
        sItemKey: raw.sItemKey,
        iItemId: raw.iItemId ?? raw._id ?? null,
        sName: raw.sName ?? '',
        sDisplayName: raw.sDisplayName ?? raw.sName ?? '',
        eShelf: raw.eShelf ?? '',
        sImage: raw.sImage ?? null,
        nOriginalPrice: raw.nOriginalPrice ?? raw.nPrice ?? salePrice,
        nSalePrice: salePrice,
        nCoins: raw.nCoins ?? salePrice,
        nEcoPoints: raw.nEcoPoints ?? 0,
        sPitch: raw.sPitch ?? '',
        eVariant: raw.eVariant ?? 'sale',
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
    const nextMissionId = mission._id ?? mission.iMissionId ?? mission.id ?? null;
    if (nextMissionId) setMissionId(nextMissionId);
    const items = (mission.aShoppingList ?? []).map((it) => ({
        _id: it.iItemId,
        sItemKey: it.sItemKey,
        sName: it.sName,
    }));
    const ecoMax = mission.nEcoLimit ?? 100;

    return {
        gameId,
        missionId: nextMissionId,
        budget: mission.nBudget ?? mission.nCoins ?? 0,
        timeLimit: mission.nTimeLimit,
        items,
        shoppingList: mission.aShoppingList ?? [],
        shoppingListTotal: 0,
        category: mission.sName ?? '',
        description: mission.sDescription ?? '',
        missionOrder: mission.nOrder ?? mission.nMissionNumber ?? 0,
        missionLabel: mission.sMissionLabel ?? null,
        ecoMeter: ecoMax,
        ecoMeterMax: ecoMax,
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

function toShelfProduct(item, index) {
    const key = item.sItemKey;
    const normalImage = item.oNormal?.sImage || item.sImage || null;
    return {
        id: index,
        key,
        label: item.sName || humanizeItemKey(key),
        price: item.oNormal?.nCoins
            ?? item.oNormal?.nPrice
            ?? item.nCoins
            ?? item.nPrice
            ?? null,
        textureKey: normalImage ? apiNormalTextureKey(key) : null,
        sItemKey: key,
        iItemId: item.iItemId ?? item._id ?? null,
        color: 0x4A90D9,
    };
}

/** Produce rows hold up to three different fruits/vegetables. Every other bay is one product. */
const PRODUCE_PER_ROW = 3;

function rowCapacity(rackId) {
    return rackId === 'fruits' ? PRODUCE_PER_ROW : 1;
}

/** One template per visual plank. Produce keeps its authored planks (under the awning). */
function shelfSlotTemplates(rack) {
    const baseRows = (rack.layout?.rows ?? []).filter((row) => row && !row.skip);

    if (rack.id === 'fruits') {
        const authored = baseRows.length
            ? baseRows
            : [{ shelfRow: 1, gap: 18, priceTagOffsetY: 6 }, { shelfRow: 3, gap: 18, priceTagOffsetY: 15, offsetY: 8 }];
        return authored.map((src) => {
            const {
                stacks: _stacks,
                product: _product,
                skip: _skip,
                priceTagPerItem: _perItem,
                ...rest
            } = src;
            return {
                ...rest,
                shelfRow: src.shelfRow ?? 1,
                offsetY: src.offsetY ?? 0,
                gap: 18,
                priceTagOffsetY: src.priceTagOffsetY ?? 8,
                iconScale: 1.12,
                iconSlotFill: 1.08,
                shelfHeightFactor: 0.98,
                capacity: PRODUCE_PER_ROW,
                skip: false,
            };
        });
    }

    const declared = rack.layout?.shelfRows ?? 0;
    const mappedMax = baseRows.reduce(
        (max, row, index) => Math.max(max, (row.shelfRow ?? index) + 1),
        baseRows.length,
    );
    const shelfCount = Math.max(4, declared, mappedMax, baseRows.length);
    const slots = [];

    for (let shelf = 0; shelf < shelfCount; shelf += 1) {
        const exact = baseRows.find((row, index) => (row.shelfRow ?? index) === shelf);
        const src = exact
            ?? baseRows[Math.min(shelf, Math.max(0, baseRows.length - 1))]
            ?? { count: 4 };
        const repeat = src.count ?? 4;
        const {
            stacks: _stacks,
            priceTagPerItem: _perItem,
            product: _product,
            skip: _skip,
            ...rest
        } = src;
        slots.push({
            ...rest,
            shelfRow: shelf,
            offsetY: exact ? (src.offsetY ?? 0) : 0,
            count: Math.max(1, repeat),
            capacity: 1,
            skip: false,
        });
    }
    return slots;
}

function placeOnRack(plan, item) {
    const capacity = rowCapacity(plan.rack.id);
    let index = plan.assigned.findIndex((bucket) => (bucket?.length ?? 0) < capacity);
    if (index === -1) index = plan.assigned.length;
    if (index >= plan.slots.length) return false;
    if (!plan.assigned[index]) plan.assigned[index] = [];
    plan.assigned[index].push(item);
    return true;
}

/**
 * One normal product per shelf row, repeated across that row.
 * Category items fill their own bay first. Leftover items fill empty rows
 * in other bays so a short aisle does not stay blank while another aisle overflows.
 * Eco art is not placed on racks.
 *
 * @param {Array<object>} aItems
 * @param {ReturnType<getRacksForView>} racksData
 */
export function patchRacksWithApiPrices(aItems, racksData) {
    const byRack = {};
    const allItems = [];
    for (const item of aItems ?? []) {
        if (!item?.sItemKey) continue;
        allItems.push(item);
        const rackId = resolveRackIdForApiItem(item, item.sItemKey);
        if (!rackId) continue;
        (byRack[rackId] ??= []).push(item);
    }

    const slotPlan = racksData.map((rack) => ({
        rack,
        slots: shelfSlotTemplates(rack),
        assigned: [],
    }));

    const placed = new Set();
    const overflow = [];

    slotPlan.forEach((plan) => {
        const local = byRack[plan.rack.id] ?? [];
        local.forEach((item) => {
            if (placed.has(item.sItemKey)) return;
            if (!placeOnRack(plan, item)) {
                overflow.push(item);
                return;
            }
            placed.add(item.sItemKey);
        });
    });

    const rackHasRoom = (plan, item) => {
        const home = resolveRackIdForApiItem(item, item.sItemKey);
        // Keep non-produce off the produce bay so those rows stay fruits/vegetables.
        if (plan.rack.id === 'fruits' && home !== 'fruits') return false;
        const capacity = rowCapacity(plan.rack.id);
        return plan.assigned.some((bucket, index) => index < plan.slots.length && (bucket?.length ?? 0) < capacity)
            || plan.assigned.length < plan.slots.length;
    };

    for (const item of [...overflow, ...allItems]) {
        if (placed.has(item.sItemKey)) continue;
        const plan = slotPlan.find((entry) => rackHasRoom(entry, item));
        if (!plan || !placeOnRack(plan, item)) continue;
        placed.add(item.sItemKey);
    }

    return slotPlan.map((plan) => {
        const products = {};
        const produce = plan.rack.id === 'fruits';
        const rows = plan.slots.map((slot, index) => {
            const items = plan.assigned[index] ?? [];
            if (!items.length) return { ...slot, skip: true };
            items.forEach((item, itemIndex) => {
                products[item.sItemKey] = toShelfProduct(item, index * 10 + itemIndex);
            });
            if (produce && items.length > 1) {
                return {
                    ...slot,
                    stacks: items.map((item) => ({ product: item.sItemKey })),
                    priceTagPerItem: true,
                    // Crate width stays one-third of the shelf. Empty spots are not filled.
                    slotCount: PRODUCE_PER_ROW,
                    keepAspect: true,
                    // Same plank line for every product. Ignore authored per-item nudges.
                    offsetY: 0,
                    skip: false,
                };
            }
            const item = items[0];
            const fit = getProductShelfFit(item.sItemKey, item.sName);
            return {
                ...slot,
                stacks: undefined,
                priceTagPerItem: false,
                product: item.sItemKey,
                count: fit.count,
                keepAspect: true,
                ...(fit.shelfHeightFactor != null ? { shelfHeightFactor: fit.shelfHeightFactor } : {}),
                ...(fit.iconSlotFill != null ? { iconSlotFill: fit.iconSlotFill } : {}),
                ...(fit.iconScale != null ? { iconScale: fit.iconScale } : {}),
                ...(fit.fitWidthCount != null ? { fitWidthCount: fit.fitWidthCount } : {}),
                ...(fit.spanCount != null ? { spanCount: fit.spanCount } : {}),
                ...(fit.gap != null ? { gap: fit.gap } : {}),
                // Shelf rows share one baseline. Product art no longer shifts the row.
                offsetY: 0,
                skip: false,
            };
        });

        return {
            ...plan.rack,
            products,
            layout: {
                ...plan.rack.layout,
                shelfRows: plan.slots.length,
                rows,
            },
        };
    });
}

/** Resolves a display label for an API shopping-list/cart item: API name → ITEM_KEY_MAP override → catalog label → humanized key. */
export function resolveItemLabel(sItemKey, resolved) {
    const apiName = getItemVariants(sItemKey)?.sName;
    if (apiName) return apiName;
    if (resolved.label) return resolved.label;
    const catalogId = RACK_ASSET_CATEGORIES[resolved.rackId] ?? resolved.rackId;
    const catalogLabel = PRODUCT_CATALOG[catalogId]?.[resolved.key]?.label;
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
    const SLOT_COUNT = Math.max(6, aShoppingList?.length ?? 0);
    const entries = (aShoppingList ?? []).map((item) => {
        if (!item?.sItemKey) return null;
        const resolved = resolveItem(item.sItemKey);
        return {
            key: resolved.key,
            textureKey: resolved.textureKey,
            label: item.sName || resolveItemLabel(item.sItemKey, resolved),
            required: item.nQuantity ?? 1,
            collected: 0,
            sItemKey: item.sItemKey,
            sImage: item.sImage || null,
            rackId: resolved.rackId,
        };
    });
    while (entries.length < SLOT_COUNT) entries.push(null);
    return entries.slice(0, SLOT_COUNT);
}

/** Mark shopping-list collected counts from session/cart quantities. */
export function applyCartCollectedToEntries(entries, aCartItems) {
    const collectedByKey = {};
    for (const cart of aCartItems ?? []) {
        if (!cart?.sItemKey) continue;
        const resolved = resolveItem(cart.sItemKey);
        collectedByKey[resolved.key] = (collectedByKey[resolved.key] ?? 0) + Math.max(0, cart.nQuantity ?? 0);
        collectedByKey[cart.sItemKey] = (collectedByKey[cart.sItemKey] ?? 0) + Math.max(0, cart.nQuantity ?? 0);
    }
    return (entries ?? []).map((entry) => {
        if (!entry) return null;
        const collected = Math.min(
            entry.required ?? 0,
            collectedByKey[entry.sItemKey] ?? collectedByKey[entry.key] ?? 0,
        );
        return { ...entry, collected };
    });
}

/**
 * Converts the aCartItems array from a cart/add or cart/remove response into the
 * flat, one-entry-per-unit item list MyCartPanel expects — the cart's authoritative
 * source of truth is always this server response, never local bookkeeping.
 * @param {Array<{sItemKey:string, nQuantity:number, nPrice:number, nCoins?:number, nEcoPoints?:number}>} aCartItems
 */
export function buildCartItemsFromApi(aCartItems) {
    const items = [];
    for (const entry of aCartItems ?? []) {
        if (!entry?.sItemKey) continue;
        const variant = cartVariantOf(entry);
        const isEco = variant === 'eco';
        const resolved = resolveItem(entry.sItemKey, { eco: isEco });
        const label = entry.sName || resolveItemLabel(entry.sItemKey, resolved);
        const qty = Math.max(0, entry.nQuantity ?? 0);
        const price = entry.nPrice ?? entry.nCoins ?? 0;
        const ecoImpact = entry.nEcoPoints ?? entry.ecoImpact ?? 0;
        for (let i = 0; i < qty; i++) {
            items.push({
                key: resolved.key,
                textureKey: resolved.textureKey,
                rackId: resolved.rackId,
                label,
                price,
                ecoImpact,
                isEcoVariant: isEco,
                isSaleVariant: variant === 'sale',
                sItemKey: entry.sItemKey,
                iItemId: entry.iItemId ?? null,
            });
        }
    }
    return items;
}

/**
 * Maps API aCartItems into ViewCartPopup rows (one row per line with qty).
 * @param {Array<object>} aCartItems
 * @param {Set<string>} [requiredKeys] — sItemKey / product keys on the shopping list
 */
export function buildViewCartRowsFromApi(aCartItems, requiredKeys = null) {
    const rows = [];
    for (const entry of aCartItems ?? []) {
        if (!entry?.sItemKey) continue;
        const qty = Math.max(0, entry.nQuantity ?? 0);
        if (qty <= 0) continue;
        const variant = cartVariantOf(entry);
        const isEco = variant === 'eco';
        const resolved = resolveItem(entry.sItemKey, { eco: isEco });
        const label = entry.sName || resolveItemLabel(entry.sItemKey, resolved);
        const required = requiredKeys
            ? (requiredKeys.has(entry.sItemKey) || requiredKeys.has(resolved.key))
            : true;
        rows.push({
            name: label,
            pack: '1 Pack',
            price: entry.nPrice ?? entry.nCoins ?? 0,
            eco: entry.nEcoPoints ?? entry.ecoImpact ?? 0,
            qty,
            required,
            textureKey: resolved.textureKey,
            isEcoVariant: isEco,
            isSaleVariant: variant === 'sale',
            sItemKey: entry.sItemKey,
            iItemId: entry.iItemId ?? getItemId(entry.sItemKey) ?? null,
        });
    }
    return rows;
}
