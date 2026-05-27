import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import config from '../utils/config.js';

const PANEL_NATIVE_W = 1072;
const PANEL_NATIVE_H = 606;
const PANEL_DISPLAY_W = 1000;

const NAVY = '#1a2d4a';
const BODY_COLOR = '#2c3e55';
const BULLET_COLOR = 0xe85d24;

const INFO_LINES = [
    {
        title: 'HOW TO PLAY',
        items: [
            'Browse the store aisles and tap products to add them to your cart.',
            'Complete every item on your shopping list before the timer ends.',
            'Keep your total spending within the budget shown at the top.',
        ],
    },
    {
        title: 'CONTROLS',
        items: [
            '← → Arrow keys — scroll through the market shelves',
            'Tap a product — add it to your cart',
            'Space or Start — begin the game from this screen',
        ],
    },
];

/**
 * Home-screen INFO modal — Info-Ui panel, Info-Tag header with "INFO" label.
 */
export default class HomeInfoPopup extends Phaser.GameObjects.Container {
    constructor (scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(500);
        this.setVisible(false);
        this._build();
    }

    _build () {
        this._dim = this.scene.add.rectangle(
            config.centerX,
            config.centerY,
            config.width,
            config.height,
            0x000000,
            0.6
        );
        this._dim.setInteractive();
        this._dim.on('pointerup', () => this.close());
        this.add(this._dim);

        const panelScale = PANEL_DISPLAY_W / PANEL_NATIVE_W;
        const panelH = PANEL_NATIVE_H * panelScale;
        const panelY = config.centerY + 20;

        this._panel = this.scene.add.image(config.centerX, panelY, HOME_TEXTURE_KEYS.infoUi);
        this._panel.setOrigin(0.5, 0.5);
        this._panel.setDisplaySize(PANEL_DISPLAY_W, panelH);
        this.add(this._panel);

        const panelTop = panelY - panelH / 2;
        const tagW = 340;
        const tagH = 78 * (tagW / 399);
        const tagY = panelTop + tagH * 0.42;

        this._tag = this.scene.add.image(config.centerX, tagY, HOME_TEXTURE_KEYS.infoTag);
        this._tag.setOrigin(0.5, 0.5);
        this._tag.setDisplaySize(tagW, tagH);
        this.add(this._tag);

        this._tagLabel = this.scene.add.text(config.centerX, tagY - 2, 'INFO', {
            fontFamily: config.fonts.text,
            fontSize: '34px',
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
        });
        this._tagLabel.setOrigin(0.5, 0.5);
        this.add(this._tagLabel);

        this._panel.setInteractive();

        this._buildPanelContent(panelTop, tagH);
    }

    _buildPanelContent (panelTop, tagH) {
        const contentTop = panelTop + tagH * 0.72 + 28;
        const contentW = PANEL_DISPLAY_W * 0.82;
        const leftX = config.centerX - contentW / 2 + 36;
        let y = contentTop;

        INFO_LINES.forEach((section) => {
            const heading = this.scene.add.text(config.centerX, y, section.title, {
                fontFamily: config.fonts.text,
                fontSize: '26px',
                fontStyle: 'bold',
                color: NAVY,
                align: 'center',
            });
            heading.setOrigin(0.5, 0);
            this.add(heading);
            y += heading.height + 16;

            section.items.forEach((line) => {
                const bullet = this.scene.add.graphics();
                bullet.fillStyle(BULLET_COLOR, 1);
                bullet.fillCircle(leftX - 18, y + 12, 6);
                this.add(bullet);

                const text = this.scene.add.text(leftX, y, line, {
                    fontFamily: config.fonts.text,
                    fontSize: '22px',
                    color: BODY_COLOR,
                    align: 'left',
                    wordWrap: { width: contentW - 48 },
                    lineSpacing: 4,
                });
                text.setOrigin(0, 0);
                this.add(text);
                y += text.height + 14;
            });

            y += 8;
        });
    }

    open () {
        this.setVisible(true);
        this.setScale(0.88);
        this.setAlpha(0);
        this.scene.tweens.add({
            targets: this,
            scale: 1,
            alpha: 1,
            duration: 260,
            ease: 'Back.easeOut',
        });
    }

    close () {
        this.scene.tweens.add({
            targets: this,
            scale: 0.92,
            alpha: 0,
            duration: 180,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.setVisible(false);
                this.setScale(1);
                this.setAlpha(1);
            },
        });
    }

    get isOpen () {
        return this.visible;
    }
}
