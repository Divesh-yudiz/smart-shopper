import basket from '../../../assets/images/view-cart/BAsket-icon.png';
import milk from '../../../assets/images/view-cart/Milk-Icon.png';
import cookie from '../../../assets/images/view-cart/Coookie-Icon.png';

export const VIEW_CART_KEYS = Object.freeze({
    basket: 'vc_basket',
    milk: 'vc_milk',
    cookie: 'vc_cookie',
});

export const viewCartAssetPaths = Object.freeze([
    { key: VIEW_CART_KEYS.basket, path: basket },
    { key: VIEW_CART_KEYS.milk, path: milk },
    { key: VIEW_CART_KEYS.cookie, path: cookie },
]);
