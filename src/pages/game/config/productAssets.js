/**
 * Product catalog metadata for rack layout / labels.
 * Shelf art comes from the mission items API (oNormal.sImage / oEco.sImage) —
 * see gameApi.apiNormalTextureKey / apiEcoTextureKey — not local PNGs.
 */

/** Maps market rack id → catalog category key (order matches game-bg bays) */
export const RACK_ASSET_CATEGORIES = Object.freeze({
    candy: 'candy',
    fruits: 'fruits',
    beverages: 'beverages',
    toys: 'toys',
    chips: 'chips',
    cakes: 'cakes',
    toiletaries: 'toiletaries',
    electronics: 'expensive-items',
    ration: 'ration',
});

/**
 * Product labels grouped by category. Keys match rack product keys.
 * Each entry: { label }
 */
export const PRODUCT_CATALOG = Object.freeze({
    beverages: Object.freeze({
        alowveraJuice: Object.freeze({ label: 'AlowVera Juice' }),
        grapeJuice: Object.freeze({ label: 'Grape Juice' }),
        milk: Object.freeze({ label: 'Milk' }),
        orangeJuice: Object.freeze({ label: 'Orange Juice' }),
    }),
    cakes: Object.freeze({
        breads: Object.freeze({ label: 'Breads' }),
        chocolateCake: Object.freeze({ label: 'Chocolate Cake' }),
        cookies: Object.freeze({ label: 'Cookies' }),
        vanillaCake: Object.freeze({ label: 'Vanilla Cake' }),
    }),
    candy: Object.freeze({
        candy: Object.freeze({ label: 'Candy' }),
        giftCandy: Object.freeze({ label: 'Gift Candy' }),
        jelly: Object.freeze({ label: 'Jelly' }),
        lollipop: Object.freeze({ label: 'Lollipop' }),
    }),
    chips: Object.freeze({
        chilliWafers: Object.freeze({ label: 'Chilli Wafers' }),
        lemonWafers: Object.freeze({ label: 'Lemon Wafers' }),
        masalaWafers: Object.freeze({ label: 'Masala Wafers' }),
        onionWafers: Object.freeze({ label: 'Onion Wafers' }),
    }),
    'expensive-items': Object.freeze({
        gift: Object.freeze({ label: 'Gift' }),
        headphones: Object.freeze({ label: 'Headphones' }),
        laptop: Object.freeze({ label: 'Laptop' }),
        mobile: Object.freeze({ label: 'Mobile' }),
    }),
    fruits: Object.freeze({
        capsicum: Object.freeze({ label: 'Capsicum' }),
        carrots: Object.freeze({ label: 'Carrots' }),
        onion: Object.freeze({ label: 'Onion' }),
        potato: Object.freeze({ label: 'Potato' }),
        qualiflower: Object.freeze({ label: 'Qualiflower' }),
        tomatos: Object.freeze({ label: 'Tomatos' }),
    }),
    ration: Object.freeze({
        cola: Object.freeze({ label: 'Cola' }),
        donuts: Object.freeze({ label: 'Donuts' }),
        icecream: Object.freeze({ label: 'Icecream' }),
        rice: Object.freeze({ label: 'Rice' }),
    }),
    toiletaries: Object.freeze({
        cleaner: Object.freeze({ label: 'Cleaner' }),
        dishwash: Object.freeze({ label: 'Dishwash' }),
        handwash: Object.freeze({ label: 'Handwash' }),
        paper: Object.freeze({ label: 'Paper' }),
    }),
    toys: Object.freeze({
        ball: Object.freeze({ label: 'Ball' }),
        rings: Object.freeze({ label: 'Rings' }),
        teddybear: Object.freeze({ label: 'Teddybear' }),
        toyCar: Object.freeze({ label: 'Toy Car' }),
    }),
});

/** @deprecated Local product PNGs removed — textures load from the items API. */
export const productAssetPaths = Object.freeze([]);

/** @deprecated Local product PNGs removed — textures load from the items API. */
export const productAssets = Object.freeze({});

/** @param {string} category — folder name (e.g. 'fruits', 'chips') */
export function getProductCatalogCategory (category) {
    return PRODUCT_CATALOG[category] ?? null;
}

/** @param {string} category @param {string} productKey */
export function getProductAsset (category, productKey) {
    return PRODUCT_CATALOG[category]?.[productKey] ?? null;
}

/** Default shelf price (AED) per product key — overridden by API oNormal.nCoins */
const PRODUCT_PRICES_AED = Object.freeze({
    lollipop: 16,
    candy: 14,
    jelly: 12,
    giftCandy: 18,
    tomatos: 8,
    qualiflower: 10,
    carrots: 7,
    potato: 6,
    capsicum: 9,
    onion: 5,
    milk: 6,
    orangeJuice: 8,
    grapeJuice: 9,
    alowveraJuice: 7,
    teddybear: 22,
    toyCar: 18,
    rings: 14,
    ball: 12,
    chilliWafers: 5,
    lemonWafers: 5,
    masalaWafers: 5,
    onionWafers: 5,
    breads: 6,
    chocolateCake: 24,
    cookies: 10,
    vanillaCake: 20,
    cleaner: 12,
    dishwash: 9,
    handwash: 8,
    paper: 6,
    gift: 45,
    headphones: 80,
    laptop: 120,
    mobile: 95,
    cola: 4,
    donuts: 8,
    icecream: 10,
    rice: 15,
});

/**
 * Builds market-config style products object for a rack.
 * textureKey is null until patchRacksWithApiPrices applies API art.
 * @param {string} assetCategory — catalog category key
 * @param {number} [startId=0]
 */
export function buildProductsFromCatalog (assetCategory, startId = 0) {
    const catalog = getProductCatalogCategory(assetCategory);
    if (!catalog) return {};
    return Object.fromEntries(
        Object.entries(catalog).map(([key, asset], index) => [
            key,
            {
                id: startId + index,
                key,
                label: asset.label,
                textureKey: null,
                price: PRODUCT_PRICES_AED[key] ?? 6 + (index % 5) * 2,
                color: 0x4A90D9,
            },
        ])
    );
}

/** @param {string} rackId — market rack id (e.g. 'fruits') */
export function buildRackProductsFromAssets (rackId, startId = 0) {
    const assetCategory = RACK_ASSET_CATEGORIES[rackId];
    return assetCategory ? buildProductsFromCatalog(assetCategory, startId) : {};
}
