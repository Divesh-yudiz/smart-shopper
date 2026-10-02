import progressBase from '../../../assets/images/checkout/Progress-Base.png';
import productBase from '../../../assets/images/checkout/Product-Base.png';
import doneButton from '../../../assets/images/checkout/Done-Button.png';
import missedButton from '../../../assets/images/checkout/Missed-Button.png';
import trophy from '../../../assets/images/checkout/Trophy.png';
import cartIcon from '../../../assets/images/checkout/Cart-Icon.png';
import aedIcon from '../../../assets/images/checkout/AED-Icon.png';
import giftIcon from '../../../assets/images/checkout/Gift-Icon.png';
import dottedLine from '../../../assets/images/checkout/Doted-Line.png';
import starFilled from '../../../assets/images/checkout/Star.png';
import starEmpty from '../../../assets/images/checkout/Star-BAse.png';
import closeButton from '../../../assets/images/checkout/Wrong.png';

export const CHECKOUT_TEXTURE_KEYS = Object.freeze({
    progressBase: 'checkout_progress_base',
    productBase: 'checkout_product_base',
    doneButton: 'checkout_done_btn',
    missedButton: 'checkout_missed_btn',
    trophy: 'checkout_trophy',
    cartIcon: 'checkout_cart_icon',
    aedIcon: 'checkout_aed_icon',
    giftIcon: 'checkout_gift_icon',
    dottedLine: 'checkout_dotted_line',
    starFilled: 'checkout_star_filled',
    starEmpty: 'checkout_star_empty',
    closeButton: 'checkout_close_btn',
});

export const checkoutAssetPaths = Object.freeze([
    { key: CHECKOUT_TEXTURE_KEYS.progressBase, path: progressBase },
    { key: CHECKOUT_TEXTURE_KEYS.productBase, path: productBase },
    { key: CHECKOUT_TEXTURE_KEYS.doneButton, path: doneButton },
    { key: CHECKOUT_TEXTURE_KEYS.missedButton, path: missedButton },
    { key: CHECKOUT_TEXTURE_KEYS.trophy, path: trophy },
    { key: CHECKOUT_TEXTURE_KEYS.cartIcon, path: cartIcon },
    { key: CHECKOUT_TEXTURE_KEYS.aedIcon, path: aedIcon },
    { key: CHECKOUT_TEXTURE_KEYS.giftIcon, path: giftIcon },
    { key: CHECKOUT_TEXTURE_KEYS.dottedLine, path: dottedLine },
    { key: CHECKOUT_TEXTURE_KEYS.starFilled, path: starFilled },
    { key: CHECKOUT_TEXTURE_KEYS.starEmpty, path: starEmpty },
    { key: CHECKOUT_TEXTURE_KEYS.closeButton, path: closeButton },
]);
