import gameBgBlur from '../../../assets/images/home/Game-BG-Blur.png';
import startButton from '../../../assets/images/home/Satrt-Button.png';
import infoButton from '../../../assets/images/home/Info-Button.png';
import infoUi from '../../../assets/images/home/Info-Ui.png';
import infoTag from '../../../assets/images/home/Info-Tag.png';
import logo from '../../../assets/images/logo.png';

export const HOME_TEXTURE_KEYS = Object.freeze({
    bgBlur: 'home_bg_blur',
    logo: 'home_logo',
    startButton: 'home_start_btn',
    infoButton: 'home_info_btn',
    infoUi: 'home_info_ui',
    infoTag: 'home_info_tag',
});

export const homeBootAssetPaths = Object.freeze([
    { key: HOME_TEXTURE_KEYS.bgBlur, path: gameBgBlur },
    { key: HOME_TEXTURE_KEYS.logo, path: logo },
    { key: HOME_TEXTURE_KEYS.startButton, path: startButton },
    { key: HOME_TEXTURE_KEYS.infoButton, path: infoButton },
    { key: HOME_TEXTURE_KEYS.infoUi, path: infoUi },
    { key: HOME_TEXTURE_KEYS.infoTag, path: infoTag },
]);
