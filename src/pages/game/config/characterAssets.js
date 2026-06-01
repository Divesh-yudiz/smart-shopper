/**
 * Batch-imports all walk-cycle frames from assets/images/character/
 * via Vite's import.meta.glob so the bundler processes each PNG.
 */
const _mods = import.meta.glob(
    '../../../assets/images/character/*.png',
    { eager: true }
);

export const CHARACTER_FRAME_COUNT = 33;

/** [{key:'char_walk_1', path:'...'}, …, {key:'char_walk_33', path:'…'}] */
export const characterAssetPaths = Object.entries(_mods)
    .map(([filePath, mod]) => {
        const match = filePath.match(/(\d+)\.png$/);
        return match ? { key: `char_walk_${match[1]}`, path: mod.default } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
        const n = k => parseInt(k.split('_').pop(), 10);
        return n(a.key) - n(b.key);
    });
