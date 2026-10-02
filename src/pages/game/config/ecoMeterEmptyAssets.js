import ecoLeaf from '../../../assets/images/eco-meter-empty/Eco-Leaf.png';
import redLeaf from '../../../assets/images/eco-meter-empty/Re-Leaf.png';
import errorIcon from '../../../assets/images/eco-meter-empty/Error-icon.png';

export const ECO_METER_EMPTY_KEYS = Object.freeze({
    ecoLeaf: 'eme_eco_leaf',
    redLeaf: 'eme_red_leaf',
    errorIcon: 'eme_error_icon',
});

export const ecoMeterEmptyAssetPaths = Object.freeze([
    { key: ECO_METER_EMPTY_KEYS.ecoLeaf, path: ecoLeaf },
    { key: ECO_METER_EMPTY_KEYS.redLeaf, path: redLeaf },
    { key: ECO_METER_EMPTY_KEYS.errorIcon, path: errorIcon },
]);
