import redPop from '../../../assets/images/times-up/Red-Pop.png';
import mike from '../../../assets/images/times-up/Mike-Icon.png';
import basket from '../../../assets/images/times-up/Re-Basket.png';
import check from '../../../assets/images/times-up/Right-Dign.png';
import redCircle from '../../../assets/images/times-up/Red-Circle.png';
import loadingRed from '../../../assets/images/times-up/Loding-red.png';
import loadingBase from '../../../assets/images/times-up/Loding-Base.png';
import homeBtn from '../../../assets/images/checkout/Home-Button.png';
import restartBtn from '../../../assets/images/checkout/Restart-Button.png';

export const TIMES_UP_KEYS = Object.freeze({
    redPop: 'tu_red_pop',
    mike: 'tu_mike',
    basket: 'tu_basket',
    check: 'tu_check',
    redCircle: 'tu_red_circle',
    loadingRed: 'tu_loading_red',
    loadingBase: 'tu_loading_base',
    homeBtn: 'tu_home_btn',
    restartBtn: 'tu_restart_btn',
});

export const timesUpAssetPaths = Object.freeze([
    { key: TIMES_UP_KEYS.redPop, path: redPop },
    { key: TIMES_UP_KEYS.mike, path: mike },
    { key: TIMES_UP_KEYS.basket, path: basket },
    { key: TIMES_UP_KEYS.check, path: check },
    { key: TIMES_UP_KEYS.redCircle, path: redCircle },
    { key: TIMES_UP_KEYS.loadingRed, path: loadingRed },
    { key: TIMES_UP_KEYS.loadingBase, path: loadingBase },
    { key: TIMES_UP_KEYS.homeBtn, path: homeBtn },
    { key: TIMES_UP_KEYS.restartBtn, path: restartBtn },
]);
