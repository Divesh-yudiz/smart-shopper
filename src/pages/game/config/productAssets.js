/**
 * Product image imports — folder: src/assets/images/products/<category>/
 * Texture keys: product_<category>_<productKey>
 */

// ─── beverages ───────────────────────────────────────────────────────────────
import beverages_alowveraJuice from '../../../assets/images/products/beverages/alowvera-juice.png';
import beverages_grapeJuice from '../../../assets/images/products/beverages/grape-juice.png';
import beverages_milk from '../../../assets/images/products/beverages/milk.png';
import beverages_orangeJuice from '../../../assets/images/products/beverages/orange-juice.png';

// ─── cakes ───────────────────────────────────────────────────────────────────
import cakes_breads from '../../../assets/images/products/cakes/breads.png';
import cakes_chocolateCake from '../../../assets/images/products/cakes/chocolate-cake.png';
import cakes_cookies from '../../../assets/images/products/cakes/cookies.png';
import cakes_vanillaCake from '../../../assets/images/products/cakes/vanilla-cake.png';

// ─── candy ───────────────────────────────────────────────────────────────────
import candy_candy from '../../../assets/images/products/candy/candy.png';
import candy_giftCandy from '../../../assets/images/products/candy/gift-candy.png';
import candy_jelly from '../../../assets/images/products/candy/jelly.png';
import candy_lollipop from '../../../assets/images/products/candy/lollipop.png';

// ─── chips ─────────────────────────────────────────────────────────────────────
import chips_chilliWafers from '../../../assets/images/products/chips/chilli-wafers.png';
import chips_lemonWafers from '../../../assets/images/products/chips/lemon-wafers.png';
import chips_masalaWafers from '../../../assets/images/products/chips/masala-wafers.png';
import chips_onionWafers from '../../../assets/images/products/chips/onion-wafers.png';

// ─── expensive-items ─────────────────────────────────────────────────────────
import expensiveItems_gift from '../../../assets/images/products/expensive-items/gift.png';
import expensiveItems_headphones from '../../../assets/images/products/expensive-items/headphones.png';
import expensiveItems_laptop from '../../../assets/images/products/expensive-items/laptop.png';
import expensiveItems_mobile from '../../../assets/images/products/expensive-items/mobile.png';

// ─── fruits ──────────────────────────────────────────────────────────────────
import fruits_capsicum from '../../../assets/images/products/fruits/capsicum.png';
import fruits_carrots from '../../../assets/images/products/fruits/carrots.png';
import fruits_onion from '../../../assets/images/products/fruits/onion.png';
import fruits_potato from '../../../assets/images/products/fruits/potato.png';
import fruits_qualiflower from '../../../assets/images/products/fruits/qualiflower.png';
import fruits_tomatos from '../../../assets/images/products/fruits/tomatos.png';

// ─── ration ──────────────────────────────────────────────────────────────────
import ration_cola from '../../../assets/images/products/ration/cola.png';
import ration_donuts from '../../../assets/images/products/ration/donuts.png';
import ration_icecreame from '../../../assets/images/products/ration/icecreame.png';
import ration_rice from '../../../assets/images/products/ration/rice.png';

// ─── toiletaries ─────────────────────────────────────────────────────────────
import toiletaries_cleaner from '../../../assets/images/products/toiletaries/cleaner.png';
import toiletaries_dishwash from '../../../assets/images/products/toiletaries/dishwash.png';
import toiletaries_handwash from '../../../assets/images/products/toiletaries/handwash.png';
import toiletaries_paper from '../../../assets/images/products/toiletaries/paper.png';

// ─── toys ────────────────────────────────────────────────────────────────────
import toys_ball from '../../../assets/images/products/toys/ball.png';
import toys_rings from '../../../assets/images/products/toys/rings.png';
import toys_teddybear from '../../../assets/images/products/toys/teddybear.png';
import toys_toyCar from '../../../assets/images/products/toys/toy-car.png';

/** Maps market rack id → asset folder name under products/ (order matches game-bg bays) */
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
 * All product images grouped by category folder.
 * Each entry: { textureKey, path, label }
 */
export const PRODUCT_CATALOG = Object.freeze({
    beverages: Object.freeze({
        alowveraJuice: Object.freeze({
            textureKey: 'product_beverages_alowveraJuice',
            path: beverages_alowveraJuice,
            label: 'Alowvera Juice',
        }),
        grapeJuice: Object.freeze({
            textureKey: 'product_beverages_grapeJuice',
            path: beverages_grapeJuice,
            label: 'Grape Juice',
        }),
        milk: Object.freeze({
            textureKey: 'product_beverages_milk',
            path: beverages_milk,
            label: 'Milk',
        }),
        orangeJuice: Object.freeze({
            textureKey: 'product_beverages_orangeJuice',
            path: beverages_orangeJuice,
            label: 'Orange Juice',
        }),
    }),
    cakes: Object.freeze({
        breads: Object.freeze({
            textureKey: 'product_cakes_breads',
            path: cakes_breads,
            label: 'Breads',
        }),
        chocolateCake: Object.freeze({
            textureKey: 'product_cakes_chocolateCake',
            path: cakes_chocolateCake,
            label: 'Chocolate Cake',
        }),
        cookies: Object.freeze({
            textureKey: 'product_cakes_cookies',
            path: cakes_cookies,
            label: 'Cookies',
        }),
        vanillaCake: Object.freeze({
            textureKey: 'product_cakes_vanillaCake',
            path: cakes_vanillaCake,
            label: 'Vanilla Cake',
        }),
    }),
    candy: Object.freeze({
        candy: Object.freeze({
            textureKey: 'product_candy_candy',
            path: candy_candy,
            label: 'Candy',
        }),
        giftCandy: Object.freeze({
            textureKey: 'product_candy_giftCandy',
            path: candy_giftCandy,
            label: 'Gift Candy',
        }),
        jelly: Object.freeze({
            textureKey: 'product_candy_jelly',
            path: candy_jelly,
            label: 'Jelly',
        }),
        lollipop: Object.freeze({
            textureKey: 'product_candy_lollipop',
            path: candy_lollipop,
            label: 'Lollipop',
        }),
    }),
    chips: Object.freeze({
        chilliWafers: Object.freeze({
            textureKey: 'product_chips_chilliWafers',
            path: chips_chilliWafers,
            label: 'Chilli Wafers',
        }),
        lemonWafers: Object.freeze({
            textureKey: 'product_chips_lemonWafers',
            path: chips_lemonWafers,
            label: 'Lemon Wafers',
        }),
        masalaWafers: Object.freeze({
            textureKey: 'product_chips_masalaWafers',
            path: chips_masalaWafers,
            label: 'Masala Wafers',
        }),
        onionWafers: Object.freeze({
            textureKey: 'product_chips_onionWafers',
            path: chips_onionWafers,
            label: 'Onion Wafers',
        }),
    }),
    'expensive-items': Object.freeze({
        gift: Object.freeze({
            textureKey: 'product_expensive-items_gift',
            path: expensiveItems_gift,
            label: 'Gift',
        }),
        headphones: Object.freeze({
            textureKey: 'product_expensive-items_headphones',
            path: expensiveItems_headphones,
            label: 'Headphones',
        }),
        laptop: Object.freeze({
            textureKey: 'product_expensive-items_laptop',
            path: expensiveItems_laptop,
            label: 'Laptop',
        }),
        mobile: Object.freeze({
            textureKey: 'product_expensive-items_mobile',
            path: expensiveItems_mobile,
            label: 'Mobile',
        }),
    }),
    fruits: Object.freeze({
        capsicum: Object.freeze({
            textureKey: 'product_fruits_capsicum',
            path: fruits_capsicum,
            label: 'Capsicum',
        }),
        carrots: Object.freeze({
            textureKey: 'product_fruits_carrots',
            path: fruits_carrots,
            label: 'Carrots',
        }),
        onion: Object.freeze({
            textureKey: 'product_fruits_onion',
            path: fruits_onion,
            label: 'Onion',
        }),
        potato: Object.freeze({
            textureKey: 'product_fruits_potato',
            path: fruits_potato,
            label: 'Potato',
        }),
        qualiflower: Object.freeze({
            textureKey: 'product_fruits_qualiflower',
            path: fruits_qualiflower,
            label: 'Qualiflower',
        }),
        tomatos: Object.freeze({
            textureKey: 'product_fruits_tomatos',
            path: fruits_tomatos,
            label: 'Tomatos',
        }),
    }),
    ration: Object.freeze({
        cola: Object.freeze({
            textureKey: 'product_ration_cola',
            path: ration_cola,
            label: 'Cola',
        }),
        donuts: Object.freeze({
            textureKey: 'product_ration_donuts',
            path: ration_donuts,
            label: 'Donuts',
        }),
        icecreame: Object.freeze({
            textureKey: 'product_ration_icecreame',
            path: ration_icecreame,
            label: 'Icecreame',
        }),
        rice: Object.freeze({
            textureKey: 'product_ration_rice',
            path: ration_rice,
            label: 'Rice',
        }),
    }),
    toiletaries: Object.freeze({
        cleaner: Object.freeze({
            textureKey: 'product_toiletaries_cleaner',
            path: toiletaries_cleaner,
            label: 'Cleaner',
        }),
        dishwash: Object.freeze({
            textureKey: 'product_toiletaries_dishwash',
            path: toiletaries_dishwash,
            label: 'Dishwash',
        }),
        handwash: Object.freeze({
            textureKey: 'product_toiletaries_handwash',
            path: toiletaries_handwash,
            label: 'Handwash',
        }),
        paper: Object.freeze({
            textureKey: 'product_toiletaries_paper',
            path: toiletaries_paper,
            label: 'Paper',
        }),
    }),
    toys: Object.freeze({
        ball: Object.freeze({
            textureKey: 'product_toys_ball',
            path: toys_ball,
            label: 'Ball',
        }),
        rings: Object.freeze({
            textureKey: 'product_toys_rings',
            path: toys_rings,
            label: 'Rings',
        }),
        teddybear: Object.freeze({
            textureKey: 'product_toys_teddybear',
            path: toys_teddybear,
            label: 'Teddybear',
        }),
        toyCar: Object.freeze({
            textureKey: 'product_toys_toyCar',
            path: toys_toyCar,
            label: 'Toy Car',
        }),
    }),
});

/** Flat list for Phaser preload: { key, path }[] */
export const productAssetPaths = Object.freeze(
    Object.values(PRODUCT_CATALOG).flatMap((category) =>
        Object.values(category).map(({ textureKey, path }) => ({ key: textureKey, path }))
    )
);

/** textureKey → textureKey (for assets object lookup) */
export const productAssets = Object.freeze(
    Object.fromEntries(productAssetPaths.map(({ key }) => [key, key]))
);

/** @param {string} category — folder name (e.g. 'fruits', 'chips') */
export function getProductCatalogCategory(category) {
    return PRODUCT_CATALOG[category] ?? null;
}

/** @param {string} category @param {string} productKey */
export function getProductAsset(category, productKey) {
    return PRODUCT_CATALOG[category]?.[productKey] ?? null;
}

/**
 * Builds market-config style products object for a rack.
 * @param {string} assetCategory — folder under products/
 * @param {number} [startId=0]
 */
export function buildProductsFromCatalog(assetCategory, startId = 0) {
    const catalog = getProductCatalogCategory(assetCategory);
    if (!catalog) return {};
    return Object.fromEntries(
        Object.entries(catalog).map(([key, asset], index) => [
            key,
            {
                id: startId + index,
                label: asset.label,
                textureKey: asset.textureKey,
                price: 1.0,
                color: 0x4A90D9,
            },
        ])
    );
}

/** @param {string} rackId — market rack id (e.g. 'fruits') */
export function buildRackProductsFromAssets(rackId, startId = 0) {
    const assetCategory = RACK_ASSET_CATEGORIES[rackId];
    return assetCategory ? buildProductsFromCatalog(assetCategory, startId) : {};
}
