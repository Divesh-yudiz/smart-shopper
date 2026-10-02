import ribbon from '../../../assets/images/welcome-back/Ribbon.png';
import loadingBase from '../../../assets/images/welcome-back/Loading-Base.png';
import loadingBar from '../../../assets/images/welcome-back/Loading-Bar.png';
import cardPurple from '../../../assets/images/welcome-back/PP2.png';
import cardGold from '../../../assets/images/welcome-back/PB3.png';
import cardGreen from '../../../assets/images/welcome-back/PG1.png';
import checkIcon from '../../../assets/images/times-up/Right-Dign.png';

export const WELCOME_BACK_KEYS = Object.freeze({
    ribbon: 'wb_ribbon',
    loadingBase: 'wb_loading_base',
    loadingBar: 'wb_loading_bar',
    cardPurple: 'wb_card_purple',
    cardGold: 'wb_card_gold',
    cardGreen: 'wb_card_green',
    checkIcon: 'wb_check_icon',
});

export const welcomeBackAssetPaths = Object.freeze([
    { key: WELCOME_BACK_KEYS.ribbon, path: ribbon },
    { key: WELCOME_BACK_KEYS.loadingBase, path: loadingBase },
    { key: WELCOME_BACK_KEYS.loadingBar, path: loadingBar },
    { key: WELCOME_BACK_KEYS.cardPurple, path: cardPurple },
    { key: WELCOME_BACK_KEYS.cardGold, path: cardGold },
    { key: WELCOME_BACK_KEYS.cardGreen, path: cardGreen },
    { key: WELCOME_BACK_KEYS.checkIcon, path: checkIcon },
]);
