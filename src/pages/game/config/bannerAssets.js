/**
 * Category banners per bay — colored plate (B/G/O/P/V) + centered icon.
 * Order matches MARKET_RACK_ORDER left → right on game-bg.png.
 */

import plateB from '../../../assets/images/banners/B.png';
import plateG from '../../../assets/images/banners/G.png';
import plateO from '../../../assets/images/banners/O.png';
import plateP from '../../../assets/images/banners/P.png';
import plateV from '../../../assets/images/banners/V.png';

import iconApple from '../../../assets/images/banners/Apple-Icon.png';
import iconBox from '../../../assets/images/banners/Box-Icon.png';
import iconCake from '../../../assets/images/banners/Cake-Icon.png';
import iconCandy from '../../../assets/images/banners/Candy-Icon.png';
import iconCart from '../../../assets/images/banners/Cart-Icon.png';
import iconElect from '../../../assets/images/banners/Elect-icob.png';
import iconJuice from '../../../assets/images/banners/Juice-Icon.png';
import iconCleaning from '../../../assets/images/banners/S-Ocpn.png';
import iconTeddy from '../../../assets/images/banners/Teddy.png';

const PLATES = Object.freeze({
    B: Object.freeze({ textureKey: 'banner_plate_b', path: plateB }),
    G: Object.freeze({ textureKey: 'banner_plate_g', path: plateG }),
    O: Object.freeze({ textureKey: 'banner_plate_o', path: plateO }),
    P: Object.freeze({ textureKey: 'banner_plate_p', path: plateP }),
    V: Object.freeze({ textureKey: 'banner_plate_v', path: plateV }),
});

/** @typedef {'B'|'G'|'O'|'P'|'V'} BannerPlateId */

/**
 * @type {Record<string, { plate: BannerPlateId, iconKey: string, iconPath: string, iconScale?: number }>}
 */
export const RACK_BANNER_ASSETS = Object.freeze({
    candy: Object.freeze({
        plate: 'P',
        iconKey: 'banner_icon_candy',
        iconPath: iconCandy,
        iconScale: 0.65,
    }),
    fruits: Object.freeze({
        plate: 'B',
        iconKey: 'banner_icon_apple',
        iconPath: iconApple,
        iconScale: 0.65,
    }),
    beverages: Object.freeze({
        plate: 'O',
        iconKey: 'banner_icon_juice',
        iconPath: iconJuice,
        iconScale: 0.65,
    }),
    toys: Object.freeze({
        plate: 'V',
        iconKey: 'banner_icon_teddy',
        iconPath: iconTeddy,
        iconScale: 0.65,
    }),
    chips: Object.freeze({
        plate: 'G',
        iconKey: 'banner_icon_cart',
        iconPath: iconCart,
        iconScale: 0.65,
    }),
    cakes: Object.freeze({
        plate: 'P',
        iconKey: 'banner_icon_cake',
        iconPath: iconCake,
        iconScale: 0.65,
    }),
    toiletaries: Object.freeze({
        plate: 'B',
        iconKey: 'banner_icon_cleaning',
        iconPath: iconCleaning,
        iconScale: 0.65,
    }),
    electronics: Object.freeze({
        plate: 'V',
        iconKey: 'banner_icon_elect',
        iconPath: iconElect,
        iconScale: 0.65,
    }),
    ration: Object.freeze({
        plate: 'O',
        iconKey: 'banner_icon_box',
        iconPath: iconBox,
        iconScale: 0.40,
    }),
});

export const bannerAssetPaths = Object.freeze([
    ...Object.values(PLATES).map(({ textureKey, path }) => ({ key: textureKey, path })),
    ...Object.values(RACK_BANNER_ASSETS).map(({ iconKey, iconPath }) => ({ key: iconKey, path: iconPath })),
]);

export const bannerAssets = Object.freeze(
    Object.fromEntries(bannerAssetPaths.map(({ key }) => [key, key]))
);

/** @param {string} rackId */
export function getRackBannerAsset (rackId) {
    const entry = RACK_BANNER_ASSETS[rackId];
    if (!entry) return null;
    const plate = PLATES[entry.plate];
    return { ...entry, plateKey: plate.textureKey, platePath: plate.path };
}
