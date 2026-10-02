import ribbon from '../../../assets/images/sale-popup/oRANGE-rIBBON.png';
import bottle from '../../../assets/images/sale-popup/Thums-Up-Icon.png';
import stepButton from '../../../assets/images/sale-popup/Plus-Minus-Button.png';
import blueButton from '../../../assets/images/sale-popup/Blue-Button.png';
import greenButton from '../../../assets/images/sale-popup/Green-Button.png';
import coinBag from '../../../assets/images/sale-popup/Coin-Bag.png';

export const SALE_POPUP_KEYS = Object.freeze({
    ribbon: 'sale_ribbon',
    bottle: 'sale_bottle',
    stepButton: 'sale_step_btn',
    blueButton: 'sale_blue_btn',
    greenButton: 'sale_green_btn',
    coinBag: 'sale_coin_bag',
});

export const salePopupAssetPaths = Object.freeze([
    { key: SALE_POPUP_KEYS.ribbon, path: ribbon },
    { key: SALE_POPUP_KEYS.bottle, path: bottle },
    { key: SALE_POPUP_KEYS.stepButton, path: stepButton },
    { key: SALE_POPUP_KEYS.blueButton, path: blueButton },
    { key: SALE_POPUP_KEYS.greenButton, path: greenButton },
    { key: SALE_POPUP_KEYS.coinBag, path: coinBag },
]);
