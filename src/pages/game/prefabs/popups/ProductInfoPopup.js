import Phaser from 'phaser';
import config from '../../utils/config.js';
import { POPUP_TEXTURE_KEYS } from '../../config/popupAssets.js';

const PANEL_W = 700;
const PANEL_H = 600;
const PRODUCT_FRAME = 200;
const GAP_TITLE_TO_IMAGE = 38;
const GAP_IMAGE_TO_PRICE = 48;
const GAP_INFO_TO_QUANTITY = 36;
const GAP_QUANTITY_TO_BUTTONS = 30;
const C_NAVY = '#1e3a5f';
const C_MUTED = '#6a7f99';
const C_GREEN = '#27ae60';
const C_WHITE = '#ffffff';

export default class ProductInfoPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, config.centerX, config.centerY);
        scene.add.existing(this);
        this.setDepth(560);
        this.setVisible(false);
    }

    open({
        product,
        displayName = 'Product',
        price = 0,
        infoLine = '',
        infoColor = C_MUTED,
        maxQuantity = 1,
        onConfirm = () => { },
        onClose = () => { },
    } = {}) {
        this._onConfirm = onConfirm;
        this._onClose = onClose;
        this._maxQty = Math.max(0, maxQuantity);
        this._qty = this._maxQty > 0 ? 1 : 0;

        this.removeAll(true);

        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.55);
        ov.setInteractive();
        this.add(ov);

        const panel = this.scene.add.image(0, 0, POPUP_TEXTURE_KEYS.mainBg);
        panel.setDisplaySize(PANEL_W, PANEL_H);
        this.add(panel);

        const panelTop = -PANEL_H / 2;

        const titleY = panelTop + 50;
        this.add(this.scene.add.text(0, titleY, displayName, {
            fontFamily: config.fonts.text,
            fontSize: '32px',
            fontStyle: 'bold',
            color: C_NAVY,
            align: 'center',
            wordWrap: { width: PANEL_W - 80 },
        }).setOrigin(0.5, 0.5));

        const closeSize = 44;
        const closeBtn = this.scene.add.image(
            PANEL_W / 2 - closeSize / 2 + 2,
            panelTop + closeSize / 2 - 4,
            POPUP_TEXTURE_KEYS.closeButton,
        );
        closeBtn.setDisplaySize(closeSize, closeSize);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerup', () => this._close());
        this.add(closeBtn);

        const imageY = titleY + GAP_TITLE_TO_IMAGE + PRODUCT_FRAME / 2;
        if (product?.textureKey && this.scene.textures.exists(product.textureKey)) {
            const frame = this.scene.add.image(0, imageY, POPUP_TEXTURE_KEYS.productBg);
            frame.setDisplaySize(PRODUCT_FRAME, PRODUCT_FRAME);
            this.add(frame);

            const img = this.scene.add.image(0, imageY, product.textureKey);
            const max = PRODUCT_FRAME * 0.84;
            const tex = img.texture.getSourceImage();
            const tw = tex?.width ?? max;
            const th = tex?.height ?? max;
            const s = Math.min(max / tw, max / th);
            img.setDisplaySize(tw * s, th * s);
            this.add(img);
        }

        const priceY = imageY + PRODUCT_FRAME / 2 + GAP_IMAGE_TO_PRICE;
        this.add(this.scene.add.text(0, priceY, `AED ${Math.round(price)}`, {
            fontFamily: config.fonts.text,
            fontSize: '30px',
            fontStyle: 'bold',
            color: C_GREEN,
            align: 'center',
        }).setOrigin(0.5, 0.5));

        this._infoText = this.scene.add.text(0, priceY + 34, infoLine, {
            fontFamily: config.fonts.text,
            fontSize: '18px',
            color: infoColor,
            align: 'center',
            wordWrap: { width: PANEL_W - 100 },
        }).setOrigin(0.5, 0.5);
        this.add(this._infoText);

        const qtyLabelY = priceY + 38 + GAP_INFO_TO_QUANTITY;
        const stepperY = qtyLabelY + 40;

        this.add(this.scene.add.text(0, qtyLabelY, 'QUANTITY', {
            fontFamily: config.fonts.text,
            fontSize: '13px',
            fontStyle: 'bold',
            color: C_MUTED,
            align: 'center',
        }).setOrigin(0.5, 0.5));

        const stepBtnSize = 42;
        const qtyBoxW = 64;
        const stepGap = 14;
        const minusX = -(qtyBoxW / 2 + stepGap + stepBtnSize / 2);
        const plusX = qtyBoxW / 2 + stepGap + stepBtnSize / 2;

        const qtyBg = this.scene.add.graphics();
        qtyBg.fillStyle(0xe8eef5, 1);
        qtyBg.fillRoundedRect(-qtyBoxW / 2, stepperY - 22, qtyBoxW, 44, 10);
        qtyBg.lineStyle(2, 0xb0c0d4, 1);
        qtyBg.strokeRoundedRect(-qtyBoxW / 2, stepperY - 22, qtyBoxW, 44, 10);
        this.add(qtyBg);

        this._minusBtn = this._makeStepButton(minusX, stepperY, '−', () => this._changeQty(-1));
        this._plusBtn = this._makeStepButton(plusX, stepperY, '+', () => this._changeQty(1));
        this.add(this._minusBtn);
        this.add(this._plusBtn);

        this._qtyText = this.scene.add.text(0, stepperY, `${this._qty}`, {
            fontFamily: config.fonts.text,
            fontSize: '30px',
            fontStyle: 'bold',
            color: C_NAVY,
            align: 'center',
        }).setOrigin(0.5, 0.5);
        this.add(this._qtyText);

        const btnH = 50;
        const btnY = stepperY + 22 + GAP_QUANTITY_TO_BUTTONS + btnH / 2;
        const btnGap = 20;
        const btnW = 200;

        const cancelWrap = this._makeActionButton(-btnW / 2 - btnGap / 2, btnY, {
            label: 'CANCEL',
            width: btnW,
            height: btnH,
            fill: 0x8a96a8,
            hoverFill: 0x9aa8ba,
            onClick: () => this._close(),
        });
        const addWrap = this._makeActionButton(btnW / 2 + btnGap / 2, btnY, {
            label: 'ADD TO CART',
            width: btnW,
            height: btnH,
            fill: 0x27ae60,
            hoverFill: 0x2ecc71,
            onClick: () => this._confirm(),
        });
        this.add(cancelWrap);
        this.add(addWrap);
        this._addWrap = addWrap;

        this._refreshQtyState();

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

    _makeStepButton(x, y, label, onClick) {
        const size = 42;
        const wrap = this.scene.add.container(x, y);
        const g = this.scene.add.graphics();
        const draw = (hover) => {
            g.clear();
            g.fillStyle(hover ? 0x3d5a7a : 0x1e3a5f, 1);
            g.fillCircle(0, 0, size / 2);
            g.lineStyle(2, 0x8aadc8, 1);
            g.strokeCircle(0, 0, size / 2);
        };
        draw(false);
        wrap.add(g);

        wrap.add(this.scene.add.text(0, -1, label, {
            fontFamily: config.fonts.text,
            fontSize: '26px',
            fontStyle: 'bold',
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const hit = this.scene.add.circle(0, 0, size / 2, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => draw(true));
        hit.on('pointerout', () => draw(false));
        hit.on('pointerup', onClick);
        wrap.add(hit);

        wrap._setEnabled = (enabled) => {
            hit.disableInteractive();
            if (enabled) hit.setInteractive({ useHandCursor: true });
            wrap.setAlpha(enabled ? 1 : 0.4);
        };
        return wrap;
    }

    _makeActionButton(x, y, { label, width, height, fill, hoverFill, onClick }) {
        const wrap = this.scene.add.container(x, y);
        const g = this.scene.add.graphics();
        const r = height / 2;

        const draw = (hover) => {
            g.clear();
            g.fillStyle(0x000000, 0.15);
            g.fillRoundedRect(-width / 2 + 2, -height / 2 + 3, width, height, r);
            g.fillStyle(hover ? hoverFill : fill, 1);
            g.fillRoundedRect(-width / 2, -height / 2, width, height, r);
            g.fillStyle(0xffffff, 0.12);
            g.fillRoundedRect(-width / 2 + 3, -height / 2 + 2, width - 6, height * 0.45, {
                tl: r, tr: r, bl: 0, br: 0,
            });
        };
        draw(false);
        wrap.add(g);

        wrap.add(this.scene.add.text(0, 0, label, {
            fontFamily: config.fonts.text,
            fontSize: label.length > 10 ? '17px' : '20px',
            fontStyle: 'bold',
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const hit = this.scene.add.rectangle(0, 0, width, height, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => draw(true));
        hit.on('pointerout', () => draw(false));
        hit.on('pointerup', onClick);
        wrap.add(hit);

        wrap._setEnabled = (enabled) => {
            hit.disableInteractive();
            if (enabled) hit.setInteractive({ useHandCursor: true });
            wrap.setAlpha(enabled ? 1 : 0.45);
        };
        return wrap;
    }

    _changeQty(delta) {
        this._qty = Phaser.Math.Clamp(this._qty + delta, this._maxQty > 0 ? 1 : 0, Math.max(1, this._maxQty));
        this._refreshQtyState();
    }

    _refreshQtyState() {
        this._qtyText.setText(`${this._qty}`);
        this._minusBtn._setEnabled(this._qty > 1);
        this._plusBtn._setEnabled(this._qty < this._maxQty);
        this._addWrap._setEnabled(this._maxQty > 0 && this._qty > 0);
    }

    _confirm() {
        if (this._qty <= 0 || this._maxQty <= 0) return;
        const qty = this._qty;
        this._close(() => this._onConfirm?.(qty));
    }

    _close(afterClose = null) {
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
                afterClose?.();
            },
        });
    }
}
