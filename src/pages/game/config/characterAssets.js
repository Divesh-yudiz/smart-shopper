/**
 * Batch-imports all walk-cycle frames from assets/images/character/
 * via Vite's import.meta.glob so the bundler processes each PNG.
 */
const _mods = import.meta.glob(
    '../../../assets/images/character/*.png',
    { eager: true }
);

/** [{key:'char_walk_1', path:'...'}, …] sorted by frame number */
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

export const CHARACTER_FRAME_COUNT = characterAssetPaths.length;

/** Standing / idle pose (14.png) — not part of the walk cycle. */
export const IDLE_STAND_FRAME = 14;
export const IDLE_TEXTURE_KEY = `char_walk_${IDLE_STAND_FRAME}`;

const WALK_ANIM_KEY = 'char_walk';

/** Register walk-cycle animation (all frames except the standing pose). */
export function ensureCharacterWalkAnim (scene, frameRate = 24) {
    if (!scene?.anims) return WALK_ANIM_KEY;

    const walkFrames = characterAssetPaths
        .filter(({ key }) => key !== IDLE_TEXTURE_KEY)
        .map(({ key }) => ({ key }));

    if (walkFrames.length === 0) return WALK_ANIM_KEY;

    // Recreate when hot-reloading so frame 14 never stays in the cycle.
    if (scene.anims.exists(WALK_ANIM_KEY)) {
        scene.anims.remove(WALK_ANIM_KEY);
    }

    scene.anims.create({
        key: WALK_ANIM_KEY,
        frames: walkFrames,
        frameRate,
        repeat: -1,
        skipMissedFrames: true,
    });
    return WALK_ANIM_KEY;
}

export { WALK_ANIM_KEY };
