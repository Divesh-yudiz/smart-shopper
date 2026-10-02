import ribbon from '../../../assets/images/Not-enough-coin/Red-Ribbon.png';
import bread from '../../../assets/images/Not-enough-coin/Bread-Icon.png';
import hint from '../../../assets/images/Not-enough-coin/Hint-Button.png';
import cart from '../../../assets/images/Not-enough-coin/Cart-Icon.png';

export const NOT_ENOUGH_COIN_KEYS = Object.freeze({
    ribbon: 'nec_ribbon',
    bread: 'nec_bread',
    hint: 'nec_hint',
    cart: 'nec_cart',
});

export const notEnoughCoinAssetPaths = Object.freeze([
    { key: NOT_ENOUGH_COIN_KEYS.ribbon, path: ribbon },
    { key: NOT_ENOUGH_COIN_KEYS.bread, path: bread },
    { key: NOT_ENOUGH_COIN_KEYS.hint, path: hint },
    { key: NOT_ENOUGH_COIN_KEYS.cart, path: cart },
]);
