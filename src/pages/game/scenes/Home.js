import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import HomeInfoPopup from '../prefabs/HomeInfoPopup.js';
import config from '../utils/config.js';

const SAVE_KEY = 'ss_gameState';

const LOGO_DISPLAY_W = 720;
const START_BTN_DISPLAY_W = 300;
const INFO_BTN_SIZE = 72;

const PROMPT_STYLE = {
    fontFamily: config.fonts.text,
    fontSize: '36px',
    color: '#ffffff',
    fontStyle: 'bold',
    align: 'right',
};

/**
 * Title screen — blurred market BG, logo, "PRESS SPACE TO" + Start, optional Info.
 */
export default class Home extends Phaser.Scene {
    constructor () {
        super({ key: 'Home' });
    }

    create () {
        this._starting = false;
        sessionStorage.removeItem('ss_inGame');
        sessionStorage.removeItem(SAVE_KEY);

        const bg = this.add.image(config.centerX, config.centerY, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(config.width, config.height);

        const logo = this.add.image(config.centerX, config.centerY - 40, HOME_TEXTURE_KEYS.logo);
        logo.setOrigin(0.5, 0.5);
        const logoScale = LOGO_DISPLAY_W / logo.width;
        logo.setDisplaySize(LOGO_DISPLAY_W, logo.height * logoScale);

        this._buildBottomPrompt();
        this._buildInfoButton();
        this._setupInput();

        // Focus canvas so clicks/keys register; Space also uses window listeners below.
        const canvas = this.game.canvas;
        if (canvas) {
            canvas.setAttribute('tabindex', '1');
            canvas.focus();
        }
    }

    _buildBottomPrompt () {
        const rowY = config.height - 95;
        const gap = 18;

        this._promptText = this.add.text(0, rowY, 'PRESS SPACE TO', PROMPT_STYLE);
        this._promptText.setOrigin(1, 0.5);

        const startBtn = this.add.image(0, rowY, HOME_TEXTURE_KEYS.startButton);
        startBtn.setOrigin(0, 0.5);
        const btnScale = START_BTN_DISPLAY_W / startBtn.width;
        startBtn.setDisplaySize(START_BTN_DISPLAY_W, startBtn.height * btnScale);

        const rowW = this._promptText.width + gap + startBtn.displayWidth;
        const rowLeft = config.centerX - rowW / 2;
        this._promptText.setPosition(rowLeft + this._promptText.width, rowY);
        startBtn.setPosition(rowLeft + this._promptText.width + gap, rowY);

        startBtn.setInteractive({ useHandCursor: true });
        startBtn.on('pointerup', () => this._beginGame());

        this.tweens.add({
            targets: [this._promptText, startBtn],
            alpha: { from: 0.75, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this._startBtn = startBtn;
    }

    _buildInfoButton () {
        const btn = this.add.image(config.width - 56, 56, HOME_TEXTURE_KEYS.infoButton);
        btn.setOrigin(1, 0);
        btn.setDisplaySize(INFO_BTN_SIZE, INFO_BTN_SIZE);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerup', () => this._toggleInfo());

        this._infoPopup = new HomeInfoPopup(this);
    }

    _toggleInfo () {
        if (this._infoPopup.isOpen) {
            this._infoPopup.close();
            return;
        }
        this._infoPopup.open();
    }

    _closeInfo () {
        if (this._infoPopup?.isOpen) {
            this._infoPopup.close();
        }
    }

    _setupInput () {
        this._onSpaceDown = (e) => {
            if (e.code !== 'Space' && e.key !== ' ') return;
            e.preventDefault();

            if (this._infoPopup?.isOpen) {
                this._closeInfo();
                return;
            }
            this._beginGame();
        };

        window.addEventListener('keydown', this._onSpaceDown);
        this.events.once('shutdown', this._teardownInput, this);
        this.events.once('destroy', this._teardownInput, this);
    }

    _teardownInput () {
        if (this._onSpaceDown) {
            window.removeEventListener('keydown', this._onSpaceDown);
            this._onSpaceDown = null;
        }
    }

    _beginGame () {
        if (this._starting || this._infoPopup?.isOpen) return;
        this._starting = true;
        this._teardownInput();
        sessionStorage.removeItem('ss_inGame');
        sessionStorage.removeItem(SAVE_KEY);
        this.scene.start('Preload');
    }
}
