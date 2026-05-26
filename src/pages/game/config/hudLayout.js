import config from '../utils/config.js';

const TOP_Y = 48;
const ROW_H = 90;
const ROW_CENTER_Y = TOP_Y + 30;

const PAUSE_SIZE = 42;
const PAUSE_X = 52;
const BUDGET_W = 228;
const BUDGET_GAP = 10;
const BUDGET_SHIFT_X = 16;
const BUDGET_X = PAUSE_X + PAUSE_SIZE / 2 + BUDGET_GAP + BUDGET_W / 2 + BUDGET_SHIFT_X;

const SHOPPING_LIST_W = 415;
const CART_PANEL_W = 680;
const TIMER_DISPLAY_W = 140;

const RIGHT_MARGIN = 36;
const TIMER_X = config.width - RIGHT_MARGIN - TIMER_DISPLAY_W / 2;

/** Top HUD row — aligned to reference screenshot (1920×1080). */
export const HUD_LAYOUT = Object.freeze({
    topY: TOP_Y,
    rowH: ROW_H,
    rowCenterY: ROW_CENTER_Y,
    pauseX: PAUSE_X,
    budgetX: BUDGET_X,
    shoppingListX: config.centerX,
    timerX: TIMER_X,
    shoppingListWidth: SHOPPING_LIST_W,
    cartPanelWidth: CART_PANEL_W,
    timerDisplayW: TIMER_DISPLAY_W,
    budgetAmount: 150,
    timerStartSeconds: 165,
});
