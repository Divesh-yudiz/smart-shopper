/**
 * HUD / UI sprites from assets/images/Components/
 */

import cartPanelBg from '../../../assets/images/Components/Iteam-in-Cart-Base.png';
import cartCountBadge from '../../../assets/images/Components/My-Cart-Iteams-Count-Base.png';
import cartProductSlot from '../../../assets/images/Components/Product-Base.png';
import cartPriceTag from '../../../assets/images/Components/Object-BAse.png';
import cartTotalBtn from '../../../assets/images/Components/Total-Amount-Base.png';
import cartLockIcon from '../../../assets/images/Components/Lock-Icon.png';
import budgetGreenBase from '../../../assets/images/Components/Budget-Green-Base.png';
import coinIcon from '../../../assets/images/Components/Coin.png';
import countBase from '../../../assets/images/Components/Count-Base.png';
import listIcon from '../../../assets/images/Components/List-Icon.png';
import objectBase from '../../../assets/images/Components/Object-BAse.png';
import shoppingListBase from '../../../assets/images/Components/Shoping-List-Ui-Base.png';
import requiredItemBg from '../../../assets/images/gameplay/required-item-bg.png';
import timerCoinBase from '../../../assets/images/Components/Timer-and-Coin-Base.png';
import timerBg from '../../../assets/images/gameplay/timer-bg.png';
import timerBaseIcon from '../../../assets/images/gameplay/timer-base-icon.png';
import ecoGoldIcon from '../../../assets/images/gameplay/E-Gold.png';
import ecoGreenIcon from '../../../assets/images/gameplay/E-Green.png';
import missionTitleBg from '../../../assets/images/gameplay/gameplay-title-base.png';
import shelfPriceBase from '../../../assets/images/Components/Price-Base.png';
import ecoIcon from '../../../assets/images/home/eco-icon.png';

export const UI_TEXTURE_KEYS = Object.freeze({
    cartPanelBg: 'ui_cart_panel_bg',
    cartCountBadge: 'ui_cart_count_badge',
    cartProductSlot: 'ui_cart_product_slot',
    cartPriceTag: 'ui_cart_price_tag',
    cartTotalBtn: 'ui_cart_total_btn',
    cartLockIcon: 'ui_cart_lock_icon',
    budgetGreenBase: 'ui_budget_green_base',
    coinIcon: 'ui_coin_icon',
    countBase: 'ui_count_base',
    listIcon: 'ui_list_icon',
    shoppingListBase: 'ui_shopping_list_base',
    requiredItemBg: 'ui_required_item_bg',
    timerCoinBase: 'ui_timer_coin_base',
    timerBg: 'ui_timer_bg',
    timerBaseIcon: 'ui_timer_base_icon',
    ecoGoldIcon: 'ui_eco_gold_icon',
    ecoGreenIcon: 'ui_eco_green_icon',
    missionTitleBg: 'ui_mission_title_bg',
    shelfPriceBase: 'ui_shelf_price_base',
    ecoIcon: 'ui_eco_icon',
    ecoMeterBg: 'ecoMeterBg',
    ecoMeterFill: 'ecoMeterFill',
});

export const componentAssetPaths = Object.freeze([
    { key: UI_TEXTURE_KEYS.cartPanelBg, path: cartPanelBg },
    { key: UI_TEXTURE_KEYS.cartCountBadge, path: cartCountBadge },
    { key: UI_TEXTURE_KEYS.cartProductSlot, path: cartProductSlot },
    { key: UI_TEXTURE_KEYS.cartPriceTag, path: cartPriceTag },
    { key: UI_TEXTURE_KEYS.cartTotalBtn, path: cartTotalBtn },
    { key: UI_TEXTURE_KEYS.cartLockIcon, path: cartLockIcon },
    { key: UI_TEXTURE_KEYS.budgetGreenBase, path: budgetGreenBase },
    { key: UI_TEXTURE_KEYS.coinIcon, path: coinIcon },
    { key: UI_TEXTURE_KEYS.countBase, path: countBase },
    { key: UI_TEXTURE_KEYS.listIcon, path: listIcon },
    { key: UI_TEXTURE_KEYS.shoppingListBase, path: shoppingListBase },
    { key: UI_TEXTURE_KEYS.requiredItemBg, path: requiredItemBg },
    { key: UI_TEXTURE_KEYS.timerCoinBase, path: timerCoinBase },
    { key: UI_TEXTURE_KEYS.timerBg, path: timerBg },
    { key: UI_TEXTURE_KEYS.timerBaseIcon, path: timerBaseIcon },
    { key: UI_TEXTURE_KEYS.ecoGoldIcon, path: ecoGoldIcon },
    { key: UI_TEXTURE_KEYS.ecoGreenIcon, path: ecoGreenIcon },
    { key: UI_TEXTURE_KEYS.missionTitleBg, path: missionTitleBg },
    { key: UI_TEXTURE_KEYS.shelfPriceBase, path: shelfPriceBase },
    { key: UI_TEXTURE_KEYS.ecoIcon, path: ecoIcon },
    { key: UI_TEXTURE_KEYS.ecoMeterBg, path: objectBase },
    { key: UI_TEXTURE_KEYS.ecoMeterFill, path: budgetGreenBase },
]);

export const componentAssets = Object.freeze(
    Object.fromEntries(Object.values(UI_TEXTURE_KEYS).map((key) => [key, key]))
);
