import Phaser from 'phaser';
import config from '../../utils/config.js';
import { POPUP_TEXTURE_KEYS } from '../../config/popupAssets.js';
import { UI_TEXTURE_KEYS } from '../../config/componentAssets.js';

const PANEL_W = 960;
const PANEL_PAD_X = 44;
const PANEL_PAD_TOP = 40;
const PANEL_PAD_BOTTOM = 36;
const CARD_GAP = 36;
const CARD_W = (PANEL_W - PANEL_PAD_X * 2 - CARD_GAP) / 2;
const CARD_PAD_X = 24;
const CARD_PAD_Y = 22;
const CARD_FRAME = 112;
const CARD_RADIUS = 18;
const BTN_W = 220;
const BTN_H = 54;
const BTN_GAP = 18;
const STEP_BTN = 44;
const QTY_BOX_W = 68;
const QTY_BOX_H = 44;

const C_NAVY = '#1e3a5f';
const C_MUTED = '#5a718c';
const C_GREEN = '#27ae60';
const C_WHITE = '#ffffff';
const C_BORDER = 0xb0c0d4;
const C_STANDARD = 0x4a6b8a;
const C_ECO = 0x27ae60;

export default class ProductInfoPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, config.centerX, config.centerY);
        scene.add.existing(this);
        this.setDepth(560);
        this.setVisible(false);
    }

    open({
        displayName = 'Product',
        variants = [],
        onConfirm = () => { },
        onClose = () => { },
    } = {}) {
        this._onConfirm = onConfirm;
        this._onClose = onClose;
        this._variants = Object.fromEntries(variants.map((v) => [v.key, v]));
        this._cardViews = {};
        this._qtyByKey = {};
        this._budgetMaxByKey = {};
        // Both variants of a product target the same shopping-list entry — the combined
        // quantity taken across the two cards must never exceed what's still needed.
        this._listRemaining = variants.find((v) => v.listRemaining != null)?.listRemaining ?? null;

        this.removeAll(true);

        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.55);
        ov.setInteractive();
        this.add(ov);

        const panel = this.scene.add.image(0, 0, POPUP_TEXTURE_KEYS.mainBg);
        this.add(panel);

        const content = this.scene.add.container(0, 0);
        this.add(content);

        let y = 0;

        const title = this.scene.add.text(0, y, displayName, {
            fontFamily: config.fonts.text,
            fontSize: '34px',
            fontStyle: 'bold',
            color: C_NAVY,
            align: 'center',
            wordWrap: { width: PANEL_W - 120 },
        }).setOrigin(0.5, 0);
        content.add(title);
        y += title.height + 22;

        const shown = variants.slice(0, 2);
        const cardOffsetX = (CARD_W + CARD_GAP) / 2;
        let cardH = 0;
        shown.forEach((variant, i) => {
            this._budgetMaxByKey[variant.key] = Math.max(0, variant.budgetMax ?? 0);
            this._qtyByKey[variant.key] = 0;
            const cx = i === 0 ? -cardOffsetX : cardOffsetX;
            const h = this._buildVariantCard(content, cx, y, variant);
            cardH = Math.max(cardH, h);
        });
        Object.values(this._cardViews).forEach((view) => {
            const extra = cardH - view.cardH;
            if (extra > 0) view.stepperWrap.y += extra;
            view.cardH = cardH;
        });

        y += cardH + 32;

        const cancelWrap = this._makeActionButton(-BTN_W / 2 - BTN_GAP / 2, y + BTN_H / 2, {
            label: 'CANCEL',
            width: BTN_W,
            height: BTN_H,
            fill: 0x8a96a8,
            hoverFill: 0x9aa8ba,
            onClick: () => this._close(),
        });
        const addWrap = this._makeActionButton(BTN_W / 2 + BTN_GAP / 2, y + BTN_H / 2, {
            label: 'ADD TO CART',
            width: BTN_W,
            height: BTN_H,
            fill: 0x27ae60,
            hoverFill: 0x2ecc71,
            onClick: () => this._confirm(),
        });
        content.add(cancelWrap);
        content.add(addWrap);
        this._addWrap = addWrap;
        y += BTN_H;

        const panelH = PANEL_PAD_TOP + y + PANEL_PAD_BOTTOM;
        panel.setDisplaySize(PANEL_W, panelH);
        content.y = -panelH / 2 + PANEL_PAD_TOP;

        const closeSize = 44;
        const closeBtn = this.scene.add.image(
            PANEL_W / 2 - closeSize / 2 + 2,
            -panelH / 2 + closeSize / 2 - 4,
            POPUP_TEXTURE_KEYS.closeButton,
        );
        closeBtn.setDisplaySize(closeSize, closeSize);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerup', () => this._close());
        this.add(closeBtn);

        Object.keys(this._cardViews).forEach((key) => this._refreshCardQty(key));
        this._refreshAddButton();

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

    _buildVariantCard(parent, cx, topY, variant) {
        const wrap = this.scene.add.container(cx, topY);
        parent.add(wrap);

        const border = this.scene.add.graphics();
        wrap.add(border);

        const innerW = CARD_W - CARD_PAD_X * 2;
        let y = CARD_PAD_Y;

        const badgeH = 32;
        const badgeLabel = variant.isEcoVariant ? 'ECO-FRIENDLY' : 'BUDGET PICK';
        const badgeW = variant.isEcoVariant ? 210 : 186;
        const badgeBg = this.scene.add.graphics();
        badgeBg.fillStyle(variant.isEcoVariant ? C_ECO : C_STANDARD, 1);
        badgeBg.fillRoundedRect(-badgeW / 2, y, badgeW, badgeH, badgeH / 2);
        wrap.add(badgeBg);

        let badgeTextX = 0;
        if (variant.isEcoVariant && this.scene.textures.exists(UI_TEXTURE_KEYS.ecoIcon)) {
            const leaf = this.scene.add.image(-badgeW / 2 + 22, y + badgeH / 2, UI_TEXTURE_KEYS.ecoIcon);
            leaf.setDisplaySize(20, 20);
            wrap.add(leaf);
            badgeTextX = 10;
        }
        wrap.add(this.scene.add.text(badgeTextX, y + badgeH / 2, badgeLabel, {
            fontFamily: config.fonts.text,
            fontSize: '16px',
            fontStyle: 'bold',
            color: C_WHITE,
            align: 'center',
        }).setOrigin(0.5, 0.5));
        y += badgeH + 16;

        const frameY = y + CARD_FRAME / 2;
        if (variant.product?.textureKey && this.scene.textures.exists(variant.product.textureKey)) {
            const frame = this.scene.add.image(0, frameY, POPUP_TEXTURE_KEYS.productBg);
            frame.setDisplaySize(CARD_FRAME, CARD_FRAME);
            wrap.add(frame);

            const img = this.scene.add.image(0, frameY, variant.product.textureKey);
            const max = CARD_FRAME * 0.82;
            const tex = img.texture.getSourceImage();
            const tw = tex?.width ?? max;
            const th = tex?.height ?? max;
            const s = Math.min(max / tw, max / th);
            img.setDisplaySize(tw * s, th * s);
            wrap.add(img);
        }
        y = frameY + CARD_FRAME / 2 + 16;

        wrap.add(this.scene.add.text(0, y, `AED ${Math.round(variant.price)}`, {
            fontFamily: config.fonts.text,
            fontSize: '30px',
            fontStyle: 'bold',
            color: C_GREEN,
            align: 'center',
        }).setOrigin(0.5, 0));
        y += 38;

        const impact = variant.product?.ecoImpact ?? 0;
        const impactSign = impact > 0 ? '+' : '';
        wrap.add(this.scene.add.text(0, y, `${impactSign}${impact} ECO METER`, {
            fontFamily: config.fonts.text,
            fontSize: '18px',
            fontStyle: 'bold',
            color: impact >= 0 ? C_GREEN : '#c0392b',
            align: 'center',
        }).setOrigin(0.5, 0));
        y += 30;

        const description = (variant.product?.description ?? '').trim();
        if (description) {
            const desc = this.scene.add.text(0, y, description, {
                fontFamily: config.fonts.text,
                fontSize: '17px',
                color: C_NAVY,
                align: 'center',
                wordWrap: { width: innerW },
                lineSpacing: 3,
            }).setOrigin(0.5, 0);
            wrap.add(desc);
            y += desc.height + 14;
        }

        const infoLine = (variant.infoLine ?? '').trim();
        if (infoLine) {
            const info = this.scene.add.text(0, y, infoLine, {
                fontFamily: config.fonts.text,
                fontSize: '16px',
                fontStyle: 'bold',
                color: variant.infoColor ?? C_MUTED,
                align: 'center',
                wordWrap: { width: innerW },
                lineSpacing: 2,
            }).setOrigin(0.5, 0);
            wrap.add(info);
            y += info.height + 18;
        } else {
            y += 14;
        }

        const stepperWrap = this.scene.add.container(0, y);
        wrap.add(stepperWrap);

        stepperWrap.add(this.scene.add.text(0, 0, 'QUANTITY', {
            fontFamily: config.fonts.text,
            fontSize: '15px',
            fontStyle: 'bold',
            color: C_MUTED,
            align: 'center',
        }).setOrigin(0.5, 0));

        const boxY = 26;
        const stepperY = boxY + QTY_BOX_H / 2;
        const stepGap = 12;
        const minusX = -(QTY_BOX_W / 2 + stepGap + STEP_BTN / 2);
        const plusX = QTY_BOX_W / 2 + stepGap + STEP_BTN / 2;

        const qtyBg = this.scene.add.graphics();
        qtyBg.fillStyle(0xffffff, 1);
        qtyBg.fillRoundedRect(-QTY_BOX_W / 2, boxY, QTY_BOX_W, QTY_BOX_H, 10);
        qtyBg.lineStyle(2, 0xb0c0d4, 1);
        qtyBg.strokeRoundedRect(-QTY_BOX_W / 2, boxY, QTY_BOX_W, QTY_BOX_H, 10);
        stepperWrap.add(qtyBg);

        const minusBtn = this._makeStepButton(minusX, stepperY, '−', () => this._changeQtyFor(variant.key, -1), STEP_BTN);
        const plusBtn = this._makeStepButton(plusX, stepperY, '+', () => this._changeQtyFor(variant.key, 1), STEP_BTN);
        stepperWrap.add(minusBtn);
        stepperWrap.add(plusBtn);

        const qtyText = this.scene.add.text(0, stepperY, '0', {
            fontFamily: config.fonts.text,
            fontSize: '26px',
            fontStyle: 'bold',
            color: C_NAVY,
            align: 'center',
        }).setOrigin(0.5, 0.5);
        stepperWrap.add(qtyText);

        const cardH = y + boxY + QTY_BOX_H + CARD_PAD_Y;
        this._cardViews[variant.key] = { wrap, border, minusBtn, plusBtn, qtyText, stepperWrap, cardH };
        this._drawCardBorder(variant.key, false);
        return cardH;
    }

    _drawCardBorder(key, active) {
        const view = this._cardViews[key];
        if (!view) return;
        const variant = this._variants[key];
        const g = view.border;
        const h = view.cardH;
        g.clear();
        if (active) {
            g.fillStyle(variant.isEcoVariant ? 0xe4f7ea : 0xe9eef5, 1);
            g.fillRoundedRect(-CARD_W / 2, 0, CARD_W, h, CARD_RADIUS);
            g.lineStyle(3, variant.isEcoVariant ? C_ECO : C_STANDARD, 1);
            g.strokeRoundedRect(-CARD_W / 2, 0, CARD_W, h, CARD_RADIUS);
        } else {
            g.fillStyle(0xf7f4ec, 0.55);
            g.fillRoundedRect(-CARD_W / 2, 0, CARD_W, h, CARD_RADIUS);
            g.lineStyle(2, C_BORDER, 1);
            g.strokeRoundedRect(-CARD_W / 2, 0, CARD_W, h, CARD_RADIUS);
        }
        const budgetMax = this._budgetMaxByKey[key] ?? 0;
        const purchasable = budgetMax > 0 && (this._listRemaining == null || this._listRemaining > 0);
        view.wrap.setAlpha(purchasable ? 1 : 0.6);
    }

    /** Quantity this card can still take on top of what the sibling variant already holds. */
    _effectiveMax(key) {
        const budgetMax = this._budgetMaxByKey[key] ?? 0;
        if (this._listRemaining == null) return budgetMax;
        const otherQty = Object.keys(this._qtyByKey)
            .filter((k) => k !== key)
            .reduce((sum, k) => sum + (this._qtyByKey[k] ?? 0), 0);
        return Math.max(0, Math.min(budgetMax, this._listRemaining - otherQty));
    }

    _makeStepButton(x, y, label, onClick, size = 42) {
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
            fontSize: `${Math.round(size * 0.58)}px`,
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
            fontSize: '20px',
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

    _changeQtyFor(key, delta) {
        const max = this._effectiveMax(key);
        const current = this._qtyByKey[key] ?? 0;
        if (delta > 0 && max <= 0) return;
        this._qtyByKey[key] = Phaser.Math.Clamp(current + delta, 0, max);
        // Changing one card's quantity shifts how much the sibling card has left to give.
        Object.keys(this._cardViews).forEach((k) => this._refreshCardQty(k));
        this._refreshAddButton();
    }

    _refreshCardQty(key) {
        const view = this._cardViews[key];
        if (!view) return;
        const qty = this._qtyByKey[key] ?? 0;
        const max = this._effectiveMax(key);
        view.qtyText.setText(`${qty}`);
        view.minusBtn._setEnabled(qty > 0);
        view.plusBtn._setEnabled(qty < max);
        this._drawCardBorder(key, qty > 0);
    }

    _refreshAddButton() {
        const total = Object.values(this._qtyByKey).reduce((sum, q) => sum + q, 0);
        this._addWrap?._setEnabled(total > 0);
    }

    _confirm() {
        const selections = Object.entries(this._qtyByKey)
            .filter(([, qty]) => qty > 0)
            .map(([key, qty]) => ({ key, qty, product: this._variants[key]?.product }));
        if (!selections.length) return;
        this._close(() => this._onConfirm?.(selections));
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
