import Phaser from 'phaser';
import config from '../../utils/config.js';
import { POPUP_TEXTURE_KEYS } from '../../config/popupAssets.js';

const PANEL_W = 720;
const PRODUCT_FRAME = 200;
const TITLE_W = 520;
const BTN_W = 235;
const BTN_HOVER_SCALE = 1.035;
const CONTENT_LIFT = -55;
const BADGE_SIZE = 48;
const C_NAVY = '#1e3a5f';
const C_GREEN = '#27ae60';
const C_RED = '#c0392b';
const C_ORANGE = '#e67e22';

/**
 * Feedback popup for product picks — correct item, wrong item, or over budget.
 */
export default class PickupFeedbackPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, config.centerX, config.centerY);
        scene.add.existing(this);
        this.setDepth(560);
        this.setVisible(false);
    }

    openCorrect({ product, onClose = () => { } } = {}) {
        this._open({
            variant: 'correct',
            product,
            onClose,
            titleKey: POPUP_TEXTURE_KEYS.correctTitle,
            line1: 'Great job! you picked the',
            line2: 'CORRECT ITEM',
            line2Color: C_GREEN,
            badgeKey: POPUP_TEXTURE_KEYS.rightBadge,
            buttonKey: POPUP_TEXTURE_KEYS.awesomeButton,
        });
    }

    openWrong({ product, onClose = () => { } } = {}) {
        this._open({
            variant: 'wrong',
            product,
            onClose,
            titleKey: POPUP_TEXTURE_KEYS.wrongTitle,
            line1: "Oops! That's not",
            line2: 'THE CORRECT ITEM',
            line2Color: C_ORANGE,
            badgeKey: POPUP_TEXTURE_KEYS.closeButton,
            buttonKey: POPUP_TEXTURE_KEYS.tryAgainButton,
        });
    }

    openBudget({ onClose = () => { } } = {}) {
        this._open({
            variant: 'budget',
            onClose,
            titleKey: null,
            line1: "You don't have enough",
            line2: 'BUDGET LEFT',
            line2Color: C_RED,
            badgeKey: null,
            buttonKey: POPUP_TEXTURE_KEYS.tryAgainButton,
        });
    }

    _open({
        variant,
        product = null,
        onClose,
        titleKey,
        line1,
        line2,
        line2Color,
        badgeKey,
        buttonKey,
    }) {
        this._onClose = onClose;
        this.removeAll(true);

        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.55);
        ov.setInteractive();
        this.add(ov);

        const panel = this.scene.add.image(0, 0, POPUP_TEXTURE_KEYS.mainBg);
        panel.setDisplaySize(PANEL_W, PANEL_W * 0.78);
        this.add(panel);

        const panelTop = -panel.displayHeight / 2;

        if (titleKey) {
            const title = this.scene.add.image(0, panelTop - 8, titleKey);
            title.setDisplaySize(TITLE_W, TITLE_W * 0.19);
            this.add(title);
        } else if (variant === 'budget') {
            this.add(this.scene.add.text(0, panelTop + 36, 'Over Budget!', {
                fontFamily: config.fonts.text,
                fontSize: '42px',
                fontStyle: 'bold',
                color: C_RED,
                align: 'center',
            }).setOrigin(0.5, 0.5));
        }

        const closeSize = 52;
        const closeX = PANEL_W / 2 - closeSize / 2 + 6;
        const closeY = panelTop + closeSize / 2 - 10;
        const closeBtn = this.scene.add.image(closeX, closeY, POPUP_TEXTURE_KEYS.closeButton);
        closeBtn.setDisplaySize(closeSize, closeSize);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerup', () => this._close());
        this.add(closeBtn);

        let contentY = CONTENT_LIFT;

        if (variant === 'budget') {
            const pig = this.scene.add.image(0, contentY - 20, POPUP_TEXTURE_KEYS.pigBank);
            pig.setDisplaySize(220, 220);
            this.add(pig);
            contentY += 90;
        } else if (product?.textureKey && this.scene.textures.exists(product.textureKey)) {
            const frame = this.scene.add.image(0, contentY, POPUP_TEXTURE_KEYS.productBg);
            frame.setDisplaySize(PRODUCT_FRAME, PRODUCT_FRAME);
            this.add(frame);

            const img = this.scene.add.image(0, contentY, product.textureKey);
            const max = PRODUCT_FRAME * 0.72;
            const tex = img.texture.getSourceImage();
            const tw = tex?.width ?? max;
            const th = tex?.height ?? max;
            const s = Math.min(max / tw, max / th);
            img.setDisplaySize(tw * s, th * s);
            this.add(img);

            if (badgeKey) {
                const badgeX = PRODUCT_FRAME / 2 - 10;
                const badgeY = contentY - PRODUCT_FRAME / 2 - 10;
                const badge = this.scene.add.image(badgeX, badgeY, badgeKey);
                badge.setDisplaySize(BADGE_SIZE, BADGE_SIZE);
                this.add(badge);
            }

            contentY += PRODUCT_FRAME / 2 + 36;
        }

        this.add(this.scene.add.text(0, contentY, line1, {
            fontFamily: config.fonts.text,
            fontSize: '30px',
            color: C_NAVY,
            align: 'center',
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.text(0, contentY + 44, line2, {
            fontFamily: config.fonts.text,
            fontSize: '38px',
            fontStyle: 'bold',
            color: line2Color,
            align: 'center',
        }).setOrigin(0.5, 0.5));

        const btnY = panel.displayHeight / 2 - 78;
        const btnWrap = this.scene.add.container(0, btnY);
        const btn = this.scene.add.image(0, 0, buttonKey);
        btn.setDisplaySize(BTN_W, BTN_W * (btn.height / btn.width));
        btnWrap.add(btn);

        const btnH = btn.displayHeight;
        const hit = this.scene.add.rectangle(0, btnY, BTN_W, btnH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            this.scene.tweens.killTweensOf(btnWrap);
            this.scene.tweens.add({
                targets: btnWrap,
                scaleX: BTN_HOVER_SCALE,
                scaleY: BTN_HOVER_SCALE,
                duration: 80,
                ease: 'Quad.easeOut',
            });
        });
        hit.on('pointerout', () => {
            this.scene.tweens.killTweensOf(btnWrap);
            this.scene.tweens.add({
                targets: btnWrap,
                scaleX: 1,
                scaleY: 1,
                duration: 80,
                ease: 'Quad.easeOut',
            });
        });
        hit.on('pointerup', () => this._close());
        this.add(btnWrap);
        this.add(hit);

        this.setVisible(true);
        this.setAlpha(0);
        this.setScale(0.9);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 320,
            ease: 'Back.easeOut',
        });
    }

    _close() {
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0.94,
            scaleY: 0.94,
            duration: 180,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.setScale(1);
                this.setVisible(false);
                this._onClose?.();
            },
        });
    }
}
