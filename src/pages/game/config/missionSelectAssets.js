import pop from '../../../assets/images/choose-your-mission-assets/Pop.png';
import ribbon from '../../../assets/images/choose-your-mission-assets/Ribbon-P.png';
import greenCard from '../../../assets/images/choose-your-mission-assets/Green-p.png';
import blueCard from '../../../assets/images/choose-your-mission-assets/Blue-P.png';
import purpleCard from '../../../assets/images/choose-your-mission-assets/Purple-P.png';
import missionTag from '../../../assets/images/choose-your-mission-assets/Mission-Tag.png';
import notPlayedGreen from '../../../assets/images/choose-your-mission-assets/Not-Played-Tag-Green.png';
import notPlayedBlue from '../../../assets/images/choose-your-mission-assets/Not-Played-Tag-Blue.png';
import notPlayedPurple from '../../../assets/images/choose-your-mission-assets/Not-Played-Tag-Purple.png';
import basketArt from '../../../assets/images/choose-your-mission-assets/Grocery-Basekt.png';
import lunchArt from '../../../assets/images/choose-your-mission-assets/Grocery-Basekt-2.png';
import packArt from '../../../assets/images/choose-your-mission-assets/Grocery-Basekt-3.png';
import basketIcon from '../../../assets/images/choose-your-mission-assets/Basket-Icon.png';
import starFilled from '../../../assets/images/choose-your-mission-assets/Star-Icon.png';
import starEmpty from '../../../assets/images/choose-your-mission-assets/Star--Base.png';

export const MISSION_SELECT_KEYS = Object.freeze({
    pop: 'ms_pop',
    ribbon: 'ms_ribbon',
    greenCard: 'ms_card_green',
    blueCard: 'ms_card_blue',
    purpleCard: 'ms_card_purple',
    missionTag: 'ms_mission_tag',
    notPlayedGreen: 'ms_tag_np_green',
    notPlayedBlue: 'ms_tag_np_blue',
    notPlayedPurple: 'ms_tag_np_purple',
    basketArt: 'ms_art_basket',
    lunchArt: 'ms_art_lunch',
    packArt: 'ms_art_pack',
    basketIcon: 'ms_basket_icon',
    starFilled: 'ms_star_filled',
    starEmpty: 'ms_star_empty',
});

export const missionSelectAssetPaths = Object.freeze([
    { key: MISSION_SELECT_KEYS.pop, path: pop },
    { key: MISSION_SELECT_KEYS.ribbon, path: ribbon },
    { key: MISSION_SELECT_KEYS.greenCard, path: greenCard },
    { key: MISSION_SELECT_KEYS.blueCard, path: blueCard },
    { key: MISSION_SELECT_KEYS.purpleCard, path: purpleCard },
    { key: MISSION_SELECT_KEYS.missionTag, path: missionTag },
    { key: MISSION_SELECT_KEYS.notPlayedGreen, path: notPlayedGreen },
    { key: MISSION_SELECT_KEYS.notPlayedBlue, path: notPlayedBlue },
    { key: MISSION_SELECT_KEYS.notPlayedPurple, path: notPlayedPurple },
    { key: MISSION_SELECT_KEYS.basketArt, path: basketArt },
    { key: MISSION_SELECT_KEYS.lunchArt, path: lunchArt },
    { key: MISSION_SELECT_KEYS.packArt, path: packArt },
    { key: MISSION_SELECT_KEYS.basketIcon, path: basketIcon },
    { key: MISSION_SELECT_KEYS.starFilled, path: starFilled },
    { key: MISSION_SELECT_KEYS.starEmpty, path: starEmpty },
]);
