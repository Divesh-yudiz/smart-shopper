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
import ecoLoadingBar from '../../../assets/images/gameplay/lOADING-bAR.png';
import ecoBar1 from '../../../assets/images/gameplay/eco-meter-bar/low-1.png';
import ecoBar2 from '../../../assets/images/gameplay/eco-meter-bar/low-2.png';
import ecoBar3 from '../../../assets/images/gameplay/eco-meter-bar/med-3.png';
import ecoBar4 from '../../../assets/images/gameplay/eco-meter-bar/med-4.png';
import ecoBar5 from '../../../assets/images/gameplay/eco-meter-bar/full-5.png';
import ecoBar6 from '../../../assets/images/gameplay/eco-meter-bar/full-6.png';
import cartBase from '../../../assets/images/gameplay/Base.png';
import cartFillBox from '../../../assets/images/gameplay/Fill-Box.png';
import cartIcon from '../../../assets/images/gameplay/Cart.png';
import cartBarBase from '../../../assets/images/gameplay/BaR-bASE.png';
import shelfPriceBase from '../../../assets/images/Components/Price-Base.png';
import ecoIcon from '../../../assets/images/home/eco-icon.png';
import saleTag from '../../../assets/images/gameplay/Sale.png';
import leftArrow from '../../../assets/images/gameplay/left-arrow.png';
import rightArrow from '../../../assets/images/gameplay/right-arrow.png';

export const UI_TEXTURE_KEYS = Object.freeze({
    cartPanelBg: 'ui_cart_panel_bg',
    cartCountBadge: 'ui_cart_count_badge',
    cartProductSlot: 'ui_cart_product_slot',
    cartPriceTag: 'ui_cart_price_tag',
    cartTotalBtn: 'ui_cart_total_btn',
    cartLockIcon: 'ui_cart_lock_icon',
    cartBase: 'ui_cart_base',
    cartFillBox: 'ui_cart_fill_box',
    cartIcon: 'ui_cart_icon',
    cartBarBase: 'ui_cart_bar_base',
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
    ecoLoadingBar: 'ui_eco_loading_bar',
    ecoBar1: 'ui_eco_bar_1',
    ecoBar2: 'ui_eco_bar_2',
    ecoBar3: 'ui_eco_bar_3',
    ecoBar4: 'ui_eco_bar_4',
    ecoBar5: 'ui_eco_bar_5',
    ecoBar6: 'ui_eco_bar_6',
    shelfPriceBase: 'ui_shelf_price_base',
    saleTag: 'ui_sale_tag',
    ecoIcon: 'ui_eco_icon',
    ecoMeterBg: 'ecoMeterBg',
    ecoMeterFill: 'ecoMeterFill',
    leftArrow: 'ui_left_arrow',
    rightArrow: 'ui_right_arrow',
});

export const componentAssetPaths = Object.freeze([
    { key: UI_TEXTURE_KEYS.cartPanelBg, path: cartPanelBg },
    { key: UI_TEXTURE_KEYS.cartCountBadge, path: cartCountBadge },
    { key: UI_TEXTURE_KEYS.cartProductSlot, path: cartProductSlot },
    { key: UI_TEXTURE_KEYS.cartPriceTag, path: cartPriceTag },
    { key: UI_TEXTURE_KEYS.cartTotalBtn, path: cartTotalBtn },
    { key: UI_TEXTURE_KEYS.cartLockIcon, path: cartLockIcon },
    { key: UI_TEXTURE_KEYS.cartBase, path: cartBase },
    { key: UI_TEXTURE_KEYS.cartFillBox, path: cartFillBox },
    { key: UI_TEXTURE_KEYS.cartIcon, path: cartIcon },
    { key: UI_TEXTURE_KEYS.cartBarBase, path: cartBarBase },
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
    { key: UI_TEXTURE_KEYS.ecoLoadingBar, path: ecoLoadingBar },
    { key: UI_TEXTURE_KEYS.ecoBar1, path: ecoBar1 },
    { key: UI_TEXTURE_KEYS.ecoBar2, path: ecoBar2 },
    { key: UI_TEXTURE_KEYS.ecoBar3, path: ecoBar3 },
    { key: UI_TEXTURE_KEYS.ecoBar4, path: ecoBar4 },
    { key: UI_TEXTURE_KEYS.ecoBar5, path: ecoBar5 },
    { key: UI_TEXTURE_KEYS.ecoBar6, path: ecoBar6 },
    { key: UI_TEXTURE_KEYS.shelfPriceBase, path: shelfPriceBase },
    { key: UI_TEXTURE_KEYS.saleTag, path: saleTag },
    { key: UI_TEXTURE_KEYS.ecoIcon, path: ecoIcon },
    { key: UI_TEXTURE_KEYS.ecoMeterBg, path: objectBase },
    { key: UI_TEXTURE_KEYS.ecoMeterFill, path: budgetGreenBase },
    { key: UI_TEXTURE_KEYS.leftArrow, path: leftArrow },
    { key: UI_TEXTURE_KEYS.rightArrow, path: rightArrow },
]);

export const componentAssets = Object.freeze(
    Object.fromEntries(Object.values(UI_TEXTURE_KEYS).map((key) => [key, key]))
);
