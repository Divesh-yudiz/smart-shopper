import { PRODUCT_CATALOG } from '../pages/game/config/productAssets.js';

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
export function getUserId () {
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

function sessionPayload (extra = {}) {
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
    tomatoes: { rackId: 'fruits', key: 'tomatos', textureKey: 'product_fruits_tomato_icon', label: 'Tomatoes' },
    tomatos: { rackId: 'fruits', key: 'tomatos', textureKey: 'product_fruits_tomato_icon' },
    potato: { rackId: 'fruits', key: 'potato', textureKey: 'product_fruits_potato_icon' },
    potatoes: { rackId: 'fruits', key: 'potato', textureKey: 'product_fruits_potato_icon', label: 'Potatoes' },
    carrot: { rackId: 'fruits', key: 'carrots', textureKey: 'product_fruits_carrot_icon' },
    carrots: { rackId: 'fruits', key: 'carrots', textureKey: 'product_fruits_carrot_icon' },
    onion: { rackId: 'fruits', key: 'onion', textureKey: 'product_fruits_onion_icon' },
    onions: { rackId: 'fruits', key: 'onion', textureKey: 'product_fruits_onion_icon' },
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
    soft_toy: { rackId: 'toys', key: 'teddybear', textureKey: 'product_toys_teddybear', label: 'Soft Toy' },

    // ── chips / snacks ─────────────────────────────────────────────────────────
    chilliWafers: { rackId: 'chips', key: 'chilliWafers', textureKey: 'product_chips_chilliWafers' },
    lemonWafers: { rackId: 'chips', key: 'lemonWafers', textureKey: 'product_chips_lemonWafers' },
    onionWafers: { rackId: 'chips', key: 'onionWafers', textureKey: 'product_chips_onionWafers' },
    masalaWafers: { rackId: 'chips', key: 'masalaWafers', textureKey: 'product_chips_masalaWafers' },

    // ── bakery ─────────────────────────────────────────────────────────────────
    vanillaCake: { rackId: 'cakes', key: 'vanillaCake', textureKey: 'product_cakes_vanillaCake' },
    chocolateCake: { rackId: 'cakes', key: 'chocolateCake', textureKey: 'product_cakes_chocolateCake' },
    cake: { rackId: 'cakes', key: 'vanillaCake', textureKey: 'product_cakes_vanillaCake', label: 'Cake' },
    pie: { rackId: 'cakes', key: 'cookies', textureKey: 'product_cakes_cookies', label: 'Pie' },
    breads: { rackId: 'cakes', key: 'breads', textureKey: 'product_cakes_breads' },
    bread: { rackId: 'cakes', key: 'breads', textureKey: 'product_cakes_breads', label: 'Bread' },
    butter: { rackId: 'cakes', key: 'breads', textureKey: 'product_cakes_breads', label: 'Butter' },
    cookies: { rackId: 'cakes', key: 'cookies', textureKey: 'product_cakes_cookies' },

    // ── toiletries / household ─────────────────────────────────────────────────
    cleaner: { rackId: 'toiletaries', key: 'cleaner', textureKey: 'product_toiletaries_cleaner' },
    dishwash: { rackId: 'toiletaries', key: 'dishwash', textureKey: 'product_toiletaries_dishwash' },
    handwash: { rackId: 'toiletaries', key: 'handwash', textureKey: 'product_toiletaries_handwash' },
    paper: { rackId: 'toiletaries', key: 'paper', textureKey: 'product_toiletaries_paper' },
    fancy_pens: { rackId: 'toiletaries', key: 'paper', textureKey: 'product_toiletaries_paper', label: 'Fancy Pens' },

    // ── electronics ────────────────────────────────────────────────────────────
    laptop: { rackId: 'electronics', key: 'laptop', textureKey: 'product_expensive-items_laptop' },
    mobile: { rackId: 'electronics', key: 'mobile', textureKey: 'product_expensive-items_mobile' },
    headphones: { rackId: 'electronics', key: 'headphones', textureKey: 'product_expensive-items_headphones' },
    gift: { rackId: 'electronics', key: 'gift', textureKey: 'product_expensive-items_gift' },
    gift_box: { rackId: 'electronics', key: 'gift', textureKey: 'product_expensive-items_gift', label: 'Gift Box' },

    // ── ration / grocery ───────────────────────────────────────────────────────
    cola: { rackId: 'ration', key: 'cola', textureKey: 'product_ration_cola' },
    donuts: { rackId: 'ration', key: 'donuts', textureKey: 'product_ration_donuts' },
    icecream: { rackId: 'ration', key: 'icecream', textureKey: 'product_ration_icecreame', label: 'Icecream' },
    rice: { rackId: 'ration', key: 'rice', textureKey: 'product_ration_rice' },
    salmon: { rackId: 'ration', key: 'rice', textureKey: 'product_ration_rice', label: 'Salmon' },
    beef: { rackId: 'ration', key: 'donuts', textureKey: 'product_ration_donuts', label: 'Beef' },
};

function humanizeItemKey (sItemKey) {
    return String(sItemKey ?? 'Item')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @param {string} sItemKey */
export function resolveItem(sItemKey) {
    if (!sItemKey) return null;
    const mapped = ITEM_KEY_MAP[sItemKey];
    if (mapped) return { ...mapped, sItemKey };

    // Always return a displayable fallback so API list/cart rows are never dropped.
    return {
        rackId: 'unknown',
        key: sItemKey,
        textureKey: 'product_expensive-items_gift',
        label: humanizeItemKey(sItemKey),
        sItemKey,
        fallback: true,
    };
}

// reverse map: product.key or product.textureKey → sItemKey
const PRODUCT_TO_ITEM_KEY = {};
for (const [sItemKey, info] of Object.entries(ITEM_KEY_MAP)) {
    PRODUCT_TO_ITEM_KEY[info.key] = sItemKey;
    PRODUCT_TO_ITEM_KEY[info.textureKey] = sItemKey;
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
export async function fetchCart (iMissionId) {
    const mission = iMissionId ?? missionId;
    if (!mission) throw new Error('fetchCart requires iMissionId');
    const res = await fetch(
        `${BASE_URL}/cart?iMissionId=${encodeURIComponent(mission)}`,
        { headers: authHeaders() },
    );
    if (!res.ok) throw new Error(`Cart fetch ${res.status}: ${res.statusText}`);
    return res.json();
}

/**
 * POST /cart/add — body: { iMissionId, iItemId, eVariant }.
 * @param {{ iItemId: string, eVariant?: 'eco'|'normal', iMissionId?: string }} opts
 */
export async function addToCart ({ iItemId, eVariant = 'normal', iMissionId } = {}) {
    const mission = iMissionId ?? missionId;
    if (!mission) throw new Error('addToCart requires iMissionId');
    if (!iItemId) throw new Error('addToCart requires iItemId');
    const variant = eVariant === 'eco' ? 'eco' : 'normal';
    const res = await fetch(`${BASE_URL}/cart/add`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            iMissionId: mission,
            iItemId,
            eVariant: variant,
        }),
    });
    if (!res.ok) throw new Error(`Cart add ${res.status}: ${res.statusText}`);
    return res.json();
}

/**
 * POST /checkout — body: { iMissionId, iMiniGameId, nTimeRemaining }.
 * @param {{ iMissionId?: string, iMiniGameId?: string, nTimeRemaining?: number }} [opts]
 */
export async function checkoutGame ({ iMissionId, iMiniGameId, nTimeRemaining } = {}) {
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

/**
 * POST /cart/remove — body: { iMissionId, iItemId, eVariant }.
 * @param {{ iItemId: string, eVariant?: 'eco'|'normal', iMissionId?: string }} opts
 */
export async function removeFromCart ({ iItemId, eVariant = 'normal', iMissionId } = {}) {
    const mission = iMissionId ?? missionId;
    if (!mission) throw new Error('removeFromCart requires iMissionId');
    if (!iItemId) throw new Error('removeFromCart requires iItemId');
    const variant = eVariant === 'eco' ? 'eco' : 'normal';
    const res = await fetch(`${BASE_URL}/cart/remove`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            iMissionId: mission,
            iItemId,
            eVariant: variant,
        }),
    });
    if (!res.ok) throw new Error(`Cart remove ${res.status}: ${res.statusText}`);
    return res.json();
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
        nOrder: m.nOrder ?? index + 1,
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
export async function fetchMissions () {
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
export async function fetchMissionBrief (missionId) {
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
export async function startMission (missionId) {
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
export function mergeStartSessionIntoConfig (baseConfig = {}, startJson = {}) {
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
        items: items.length ? items : (baseConfig.items ?? []),
        category: data.sName ?? baseConfig.category,
        description: data.sDescription ?? baseConfig.description,
        coinsRemaining: session.nCoinsRemaining ?? null,
        initialCartItems: session.aCartItems ?? [],
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
        missionOrder: mission.nOrder ?? 0,
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
        };
    });
    while (entries.length < SLOT_COUNT) entries.push(null);
    return entries.slice(0, SLOT_COUNT);
}

/** Mark shopping-list collected counts from session/cart quantities. */
export function applyCartCollectedToEntries (entries, aCartItems) {
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
        const resolved = resolveItem(entry.sItemKey);
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
                isEcoVariant: entry.eVariant === 'eco',
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
export function buildViewCartRowsFromApi (aCartItems, requiredKeys = null) {
    const rows = [];
    for (const entry of aCartItems ?? []) {
        if (!entry?.sItemKey) continue;
        const qty = Math.max(0, entry.nQuantity ?? 0);
        if (qty <= 0) continue;
        const resolved = resolveItem(entry.sItemKey);
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
            isEcoVariant: entry.eVariant === 'eco',
            sItemKey: entry.sItemKey,
            iItemId: entry.iItemId ?? null,
        });
    }
    return rows;
}
