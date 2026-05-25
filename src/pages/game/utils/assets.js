import logo from '../../../assets/images/logo.png';
import home_bg from '../../../assets/images/home_bg.png';
import game_bg from '../../../assets/images/game-bg.png';
import { bannerAssetPaths, bannerAssets } from '../config/bannerAssets.js';
import { productAssetPaths, productAssets } from '../config/productAssets.js';

//* Add the path to the assets object.
const assetPaths = Object.freeze({
    images: [
        { key: 'logo', path: logo },
        { key: 'home_bg', path: home_bg },
        { key: 'game_bg', path: game_bg },
        ...bannerAssetPaths,
        ...productAssetPaths,
    ],
    sounds: [

    ]
});

//!------ DO NOT FORGET TO ADD THE KEY TO THE ASSETS OBJECT ------//

//* Add the key to the assets object
const assets = Object.freeze({
    logo: 'logo',
    home_bg: 'home_bg',
    game_bg: 'game_bg',
    ...bannerAssets,
    ...productAssets,
});

export { assets, assetPaths, bannerAssets, bannerAssetPaths, productAssets, productAssetPaths };