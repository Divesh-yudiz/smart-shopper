import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import { assetPaths } from '../utils/assets.js';
import config from '../utils/config.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';
import {
    fetchGameConfig,
    fetchMissionItems,
    setGameId,
    setMissionId,
    setItemVariants,
    apiNormalTextureKey,
    apiEcoTextureKey,
} from '../../../utils/gameApi.js';

const SAVE_KEY = 'ss_gameState';
const PRODUCT_IMAGE_ATTEMPTS = 3;

class Preload extends Phaser.Scene {
    constructor () {
        super('Preload');
    }

    init (data) {
        // gameConfig built from the mission picked in Home's mission-select popup
        this._pickedConfig = data?.gameConfig ?? null;
        this._bootingGameplay = false;
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

        // once — a later product-image load must not re-enter _onAssetsReady
        this.load.once(Phaser.Loader.Events.COMPLETE, () => {
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

    _setStatus (msg) {
        if (this.txt_progress) setCauseText(this.txt_progress, msg);
    }

    async _onAssetsReady () {
        if (this._bootingGameplay) return;
        this._bootingGameplay = true;

        const resuming = sessionStorage.getItem('ss_inGame') === '1';
        const saved = resuming ? this._loadSavedState() : null;
        let gameConfig = this._pickedConfig ?? saved?.gameConfig ?? null;

        if (!gameConfig) {
            this._setStatus('Loading...');
            try {
                gameConfig = await fetchGameConfig();
            } catch (err) {
                console.error('[Preload] Failed to fetch game config:', err);
                this._setStatus('Failed to load game');
                this._bootingGameplay = false;
                return;
            }
        } else {
            setGameId(gameConfig.gameId);
            if (gameConfig.missionId) setMissionId(gameConfig.missionId);
        }

        const missionId = gameConfig?.missionId ?? null;
        if (!missionId) {
            this._setStatus('Missing mission');
            this._bootingGameplay = false;
            return;
        }

        this._setStatus('Loading items...');
        let items = [];
        try {
            items = await fetchMissionItems(missionId);
        } catch (err) {
            console.error('[Preload] Failed to fetch mission items:', err);
            this._setStatus('Failed to load items — retrying...');
            this._bootingGameplay = false;
            this.time.delayedCall(1200, () => this._onAssetsReady());
            return;
        }

        if (!items.length) {
            this._setStatus('No products for this mission');
            this._bootingGameplay = false;
            return;
        }

        gameConfig = { ...gameConfig, items };
        setItemVariants(items);

        this._setStatus('Downloading products...');
        const ready = await this._downloadAllProductImages(items);
        if (!ready) {
            console.error('[Preload] Product images incomplete after retries');
            this._setStatus('Failed to download products — retrying...');
            this._bootingGameplay = false;
            this.time.delayedCall(1200, () => this._onAssetsReady());
            return;
        }

        this._setStatus('Ready!');
        this.scene.start('Level', { isMusic: true, isSound: true, gameConfig });
    }

    /**
     * Collect every normal + eco product texture URL from the items API.
     * @returns {Array<{key:string, url:string}>}
     */
    _collectProductTextureJobs (items) {
        const byKey = new Map();
        for (const item of items ?? []) {
            const sItemKey = item?.sItemKey;
            if (!sItemKey) continue;

            const normalUrl = item.oNormal?.sImage || item.sImage || null;
            const normalKey = apiNormalTextureKey(sItemKey);
            if (normalUrl && normalKey) {
                byKey.set(normalKey, { key: normalKey, url: normalUrl });
            }

            const ecoUrl = item.oEco?.sImage || null;
            const ecoKey = apiEcoTextureKey(sItemKey);
            if (ecoUrl && ecoKey) {
                byKey.set(ecoKey, { key: ecoKey, url: ecoUrl });
            }
        }
        return [...byKey.values()];
    }

    _missingTextures (jobs) {
        return jobs.filter(({ key }) => !this.textures.exists(key));
    }

    /**
     * Download all product images and do not resolve until every texture exists
     * (or attempts are exhausted).
     * @returns {Promise<boolean>}
     */
    async _downloadAllProductImages (items) {
        const jobs = this._collectProductTextureJobs(items);
        if (!jobs.length) {
            console.warn('[Preload] Items have no product image URLs');
            return false;
        }

        this.load.setCORS('anonymous');

        for (let attempt = 1; attempt <= PRODUCT_IMAGE_ATTEMPTS; attempt += 1) {
            const missing = this._missingTextures(jobs);
            if (!missing.length) return true;

            const done = jobs.length - missing.length;
            this._setStatus(`Downloading products ${done}/${jobs.length}...`);

            await this._loadTextureBatch(missing, (progress) => {
                const loadedApprox = done + Math.round(progress * missing.length);
                this._setStatus(`Downloading products ${loadedApprox}/${jobs.length}...`);
            });

            const stillMissing = this._missingTextures(jobs);
            if (!stillMissing.length) return true;

            console.warn(
                `[Preload] Attempt ${attempt}/${PRODUCT_IMAGE_ATTEMPTS}: `
                + `${stillMissing.length} product texture(s) still missing`,
                stillMissing.map((j) => j.key),
            );
        }

        return this._missingTextures(jobs).length === 0;
    }

    /**
     * Queue + start a Phaser loader batch; resolves on COMPLETE even if some files fail
     * (caller must verify textures.exists).
     */
    _loadTextureBatch (jobs, onProgress) {
        const unique = [];
        const seen = new Set();
        for (const job of jobs ?? []) {
            if (!job?.key || !job?.url || seen.has(job.key)) continue;
            if (this.textures.exists(job.key)) continue;
            seen.add(job.key);
            unique.push(job);
        }

        if (!unique.length) return Promise.resolve();

        return new Promise((resolve) => {
            const cleanup = () => {
                this.load.off(Phaser.Loader.Events.COMPLETE, onComplete);
                this.load.off(Phaser.Loader.Events.PROGRESS, onProg);
                this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError);
            };

            const onComplete = () => {
                cleanup();
                resolve();
            };
            const onProg = (progress) => {
                onProgress?.(progress);
            };
            const onFileError = (file) => {
                console.warn('[Preload] Product image failed:', file?.key, file?.url || file?.src);
            };

            for (const { key, url } of unique) {
                // Remove a failed/incomplete texture stub so Phaser will fetch again
                if (this.textures.exists(key)) {
                    this.textures.remove(key);
                }
                this.load.image(key, url);
            }

            this.load.on(Phaser.Loader.Events.PROGRESS, onProg);
            this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError);
            this.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
            this.load.start();
        });
    }
}

export default Preload;
