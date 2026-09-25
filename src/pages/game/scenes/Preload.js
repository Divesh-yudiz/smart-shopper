import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import { assetPaths } from '../utils/assets.js';
import config from '../utils/config.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';
import { fetchGameConfig, setGameId } from '../../../utils/gameApi.js';

const SAVE_KEY = 'ss_gameState';

class Preload extends Phaser.Scene {
    constructor () {
        super('Preload');
    }

    init (data) {
        // gameConfig built from the mission picked in Home's mission-select popup
        this._pickedConfig = data?.gameConfig ?? null;
    }

    preload () {
        const bg = this.add.image(config.centerX, config.centerY, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(config.width, config.height);

        this.txt_progress = addCauseText(this, config.centerX, config.height - 120, '0%', {
            fontSize: '40px',
            color: '#ffffff',
            align: 'center',
            fontStyle: 'bold',
        });
        this.txt_progress.setOrigin(0.5, 0.5);
        this.txt_progress.setStroke('#4a2d7a', 6);

        assetPaths.images.forEach(({ key, path }) => {
            this.load.image(key, path);
        });
        assetPaths.sounds.forEach(({ key, path }) => {
            this.load.audio(key, path);
        });

        this.load.on(Phaser.Loader.Events.PROGRESS, (progress) => {
            setCauseText(this.txt_progress, `${(progress * 100).toFixed(0)}%`);
        });

        this.load.on(Phaser.Loader.Events.COMPLETE, () => {
            this._onAssetsReady();
        });
    }

    _loadSavedState () {
        try {
            const raw = sessionStorage.getItem(SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    async _onAssetsReady () {
        const resuming = sessionStorage.getItem('ss_inGame') === '1';
        const saved = resuming ? this._loadSavedState() : null;
        let gameConfig = this._pickedConfig ?? saved?.gameConfig ?? null;

        if (!gameConfig) {
            // Fallback only — Home's mission-select popup normally supplies gameConfig directly.
            setCauseText(this.txt_progress, 'Loading...');
            try {
                gameConfig = await fetchGameConfig();
            } catch (err) {
                console.error('[Preload] Failed to fetch game config, using defaults:', err);
            }
        } else {
            setGameId(gameConfig.gameId);
        }

        this.scene.start('Level', { isMusic: true, isSound: true, gameConfig });
    }
}

export default Preload;
