import config from '../utils/config.js';

const TOP_Y = 48;
const ROW_H = 90;
const ROW_CENTER_Y = TOP_Y + 30;

const HUD_LEFT = 24;
const METER_CARD_W = 300;
const METER_GAP = 14;
const COINS_X = HUD_LEFT + METER_CARD_W / 2;
const ECO_X = COINS_X + METER_CARD_W + METER_GAP;
const BUDGET_X = (COINS_X + ECO_X) / 2;

const SHOPPING_LIST_W = 400;
const CART_PANEL_W = 680;
const CART_PANEL_NATIVE_W = 860;
const CART_PANEL_NATIVE_H = 178;
const TIMER_DISPLAY_W = 240;
const SHOPPING_LIST_BTN_SIZE = 96;

const RIGHT_MARGIN = 28;
const TIMER_X = config.width - RIGHT_MARGIN - TIMER_DISPLAY_W / 2;
const SHOPPING_LIST_X = config.width - RIGHT_MARGIN - SHOPPING_LIST_W / 2;
/** Vertically centered, nudged up so the panel clears the bottom cart bar. */
const SHOPPING_LIST_Y = config.centerY - 36;

const CART_Y = config.height - 10;
const CART_H = CART_PANEL_NATIVE_H * (CART_PANEL_W / CART_PANEL_NATIVE_W);
/** Right of MY CART bar, vertically centered with the cart body. */
const SHOPPING_LIST_BTN_X = config.centerX + CART_PANEL_W / 2 + 18 + SHOPPING_LIST_BTN_SIZE / 2;
const SHOPPING_LIST_BTN_Y = CART_Y - CART_H / 2;

const MISSION_TITLE_W = 520;
const MISSION_TITLE_X = config.centerX;
const MISSION_TITLE_Y = 10;

/** Top HUD row — aligned to reference screenshot (1920×1080). */
export const HUD_LAYOUT = Object.freeze({
    topY: TOP_Y,
    rowH: ROW_H,
    rowCenterY: ROW_CENTER_Y,
    hudLeft: HUD_LEFT,
    meterCardW: METER_CARD_W,
    meterGap: METER_GAP,
    coinsX: COINS_X,
    ecoX: ECO_X,
    budgetX: BUDGET_X,
    shoppingListX: SHOPPING_LIST_X,
    shoppingListY: SHOPPING_LIST_Y,
    timerX: TIMER_X,
    shoppingListWidth: SHOPPING_LIST_W,
    cartPanelWidth: CART_PANEL_W,
    cartY: CART_Y,
    shoppingListBtnX: SHOPPING_LIST_BTN_X,
    shoppingListBtnY: SHOPPING_LIST_BTN_Y,
    shoppingListBtnSize: SHOPPING_LIST_BTN_SIZE,
    missionTitleX: MISSION_TITLE_X,
    missionTitleY: MISSION_TITLE_Y,
    missionTitleWidth: MISSION_TITLE_W,
    timerDisplayW: TIMER_DISPLAY_W,
    budgetAmount: 150,
    timerStartSeconds: 165,
});
