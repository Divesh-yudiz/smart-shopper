import popupMainBg from '../../../assets/images/popup/popup-main-bg.png';
import correctTitle from '../../../assets/images/popup/Correct-Title.png';
import wrongTitle from '../../../assets/images/popup/Wrong-Tittle.png';
import productBg from '../../../assets/images/popup/product-bg.png';
import awesomeButton from '../../../assets/images/popup/Awesome-Button.png';
import tryAgainButton from '../../../assets/images/popup/Try-Again-Button.png';
import closeButton from '../../../assets/images/popup/Wrong.png';
import rightBadge from '../../../assets/images/popup/Right.png';
import pigBank from '../../../assets/images/popup/Pig-Bank.png';

export const POPUP_TEXTURE_KEYS = Object.freeze({
    mainBg: 'popup_main_bg',
    correctTitle: 'popup_correct_title',
    wrongTitle: 'popup_wrong_title',
    productBg: 'popup_product_bg',
    awesomeButton: 'popup_awesome_btn',
    tryAgainButton: 'popup_try_again_btn',
    closeButton: 'popup_close_btn',
    rightBadge: 'popup_right_badge',
    pigBank: 'popup_pig_bank',
});

export const popupAssetPaths = Object.freeze([
    { key: POPUP_TEXTURE_KEYS.mainBg, path: popupMainBg },
    { key: POPUP_TEXTURE_KEYS.correctTitle, path: correctTitle },
    { key: POPUP_TEXTURE_KEYS.wrongTitle, path: wrongTitle },
    { key: POPUP_TEXTURE_KEYS.productBg, path: productBg },
    { key: POPUP_TEXTURE_KEYS.awesomeButton, path: awesomeButton },
    { key: POPUP_TEXTURE_KEYS.tryAgainButton, path: tryAgainButton },
    { key: POPUP_TEXTURE_KEYS.closeButton, path: closeButton },
    { key: POPUP_TEXTURE_KEYS.rightBadge, path: rightBadge },
    { key: POPUP_TEXTURE_KEYS.pigBank, path: pigBank },
]);
