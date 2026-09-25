import Phaser from 'phaser';
import { addCauseText, setCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { CHECKOUT_TEXTURE_KEYS } from '../../config/checkoutAssets.js';
import { CHOOSE_PRODUCT_KEYS as CP } from '../../config/chooseProductAssets.js';
import { MISSION_DESC_KEYS } from '../../config/missionDescriptionAssets.js';

const TYPE = Object.freeze({
    ribbon: 36,
    subtitle: 18,
    requirement: 20,
    option: 20,
    name: 32,
    stat: 36,
    forOne: 22,
    desc: 20,
    tag: 22,
    qty: 34,
    footer: 22,
    save: 16,
    button: 22,
});

const C_WHITE = '#ffffff';
const C_NAVY = '#0E1B5C';
const C_BODY = '#1A1408';
const C_MUTED = '#3A4250';
const C_COIN = '#8B5A12';
const C_ECO = '#1B6B28';
const C_TAG = '#0E1B5C';

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
});

function variantTitle(displayName, isEco) {
    const name = String(displayName ?? 'Product').trim().toUpperCase();
    return isEco ? `LOCALLY SOURCED ${name}` : `IMPORTED ${name}`;
}

function variantTagline(isEco) {
    return isEco ? 'Higher Price • Lower Eco Impact' : 'Lower Price • Higher Eco Impact';
}

function qtyUnit(name, qty) {
    const hay = String(name ?? '').toLowerCase();
    if (/(banana|carrot|potato|onion|tomato|piece|apple|orange)/.test(hay)) {
        return qty === 1 ? 'Piece' : 'Pieces';
    }
    return qty === 1 ? 'Pack' : 'Packs';
}

/**
 * Choose-your-product brief — Artboard 4 layout.
 */
export default class ProductInfoPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(560);
        this.setVisible(false);
    }

    open({
        displayName = 'Product',
        variants = [],
        coinsRemaining = 0,
        ecoRemaining = 0,
        requirementQty = 1,
        onConfirm = () => { },
        onClose = () => { },
    } = {}) {
        this._onConfirm = onConfirm;
        this._onClose = onClose;
        this._displayName = displayName;
        this._variants = Object.fromEntries(variants.map((v) => [v.key, v]));
        this._cardViews = {};
        this._qtyByKey = {};
        this._budgetMaxByKey = {};
        this._listRemaining = variants.find((v) => v.listRemaining != null)?.listRemaining ?? null;

        this.removeAll(true);
        this.setScale(1);

        const m = this._m();
        const shown = variants.slice(0, 2);

        const bg = this.scene.add.image(m.cx, m.cy, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(m.W, m.H);
        this.add(bg);

        const ov = this.scene.add.rectangle(m.cx, m.cy, m.W, m.H, 0x000000, 0.12);
        ov.setInteractive();
        this.add(ov);

        this._drawChrome(m);
        this._drawPanel(m, {
            displayName,
            variants: shown,
            coinsRemaining,
            ecoRemaining,
            requirementQty,
        });

        Object.keys(this._cardViews).forEach((key) => this._refreshCardQty(key));
        this._refreshAddButton();

        this.setVisible(true);
        this.setAlpha(0);
        this.scene.tweens.add({
            targets: this, alpha: 1, duration: 220, ease: 'Quad.easeOut',
        });
    }

    _m() {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const s = Math.min(W / 1920, H / 1080);
        return {
            W, H, s,
            cx: W * 0.5,
            cy: H * 0.5,
            x: (pct) => W * pct,
            y: (pct) => H * pct,
            fs: (px) => Math.round(px * s),
        };
    }

    _text(x, y, message, style) {
        return addCauseText(this.scene, x, y, message, { fontStyle: WEIGHT.bold, ...style });
    }

    _wrap(str, maxWidth, style) {
        return wrapCause(this.scene, str, maxWidth, style);
    }

    _fitW(img, displayW) {
        img.setDisplaySize(displayW, displayW * (img.height / img.width));
        return img;
    }

    _fitContain(img, maxW, maxH) {
        const s = Math.min(maxW / img.width, maxH / img.height);
        img.setDisplaySize(img.width * s, img.height * s);
        return img;
    }

    /** Scale a rounded-rect sprite without stretching its corners or border. */
    _slice(x, y, key, w, h, preferredCap = 64) {
        const src = this.scene.textures.get(key)?.getSourceImage?.();
        const tw = src?.width ?? 256;
        const th = src?.height ?? 256;
        const maxCap = Math.min(Math.floor(tw / 2) - 1, Math.floor(th / 2) - 1);
        const cap = Math.max(8, Math.min(
            preferredCap,
            maxCap,
            Math.floor(w / 2) - 2,
            Math.floor(h / 2) - 2,
        ));
        return this.scene.add.nineslice(x, y, key, undefined, w, h, cap, cap, cap, cap);
    }

    _drawChrome(m) {
        const backH = m.H * 0.078;
        const back = this.scene.add.image(m.x(0.078), m.y(0.058), HOME_TEXTURE_KEYS.backButton);
        this._fitW(back, backH * (back.width / back.height));
        back.setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setScale(back.scaleX * 1.04, back.scaleY * 1.04));
        back.on('pointerout', () => this._fitW(back, backH * (back.width / back.height)));
        back.on('pointerup', () => this._close());
        this.add(back);

        const infoS = m.H * 0.074;
        const info = this.scene.add.image(m.x(0.948), m.y(0.058), HOME_TEXTURE_KEYS.infoButton);
        info.setDisplaySize(infoS, infoS);
        info.setInteractive({ useHandCursor: true });
        info.on('pointerover', () => info.setDisplaySize(infoS * 1.06, infoS * 1.06));
        info.on('pointerout', () => info.setDisplaySize(infoS, infoS));
        info.on('pointerup', () => this.scene._toggleInfo?.());
        this.add(info);
    }

    _drawPanel(m, { displayName, variants, coinsRemaining, ecoRemaining, requirementQty }) {
        const panelW = m.W * 0.88;
        const panelBottom = m.H * 0.94;
        const panelTopAnchor = m.H * 0.11;
        const panelH = panelBottom - panelTopAnchor;
        const panelY = panelTopAnchor + panelH / 2;

        const panel = this._slice(m.cx, panelY, MS.pop, panelW, panelH, 110);
        this.add(panel);

        const panelTop = panelY - panelH / 2;
        const panelLeft = m.cx - panelW / 2;
        const padX = panelW * 0.036;
        const innerW = panelW - padX * 2;
        const innerLeft = panelLeft + padX;

        const ribbon = this.scene.add.image(m.cx, panelTop + m.H * 0.012, MS.ribbon);
        this._fitW(ribbon, m.W * 0.42);
        this.add(ribbon);

        const ribbonStyle = {
            fontSize: `${m.fs(TYPE.ribbon)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
            align: 'center',
        };
        this.add(this._text(
            m.cx,
            ribbon.y,
            this._wrap(`CHOOSE YOUR ${String(displayName).toUpperCase()}`, ribbon.displayWidth * 0.82, ribbonStyle),
            ribbonStyle,
        ).setOrigin(0.5, 0.5));

        let cy = panelTop + m.H * 0.098;
        const subStyle = {
            fontSize: `${m.fs(TYPE.subtitle)}px`,
            color: C_MUTED,
            align: 'center',
        };
        this.add(this._text(
            m.cx,
            cy,
            this._wrap('Compare both options before adding one to your cart.', innerW * 0.86, subStyle),
            subStyle,
        ).setOrigin(0.5, 0.5));
        cy += m.H * 0.036;

        const pillW = Math.min(innerW * 0.46, m.W * 0.36);
        const pillH = m.H * 0.048;
        const pill = this._slice(m.cx, cy, MS.notPlayedBlue, pillW, pillH, 18);
        this.add(pill);

        const reqQty = Math.max(1, requirementQty ?? 1);
        const reqLabel = `Requirement:- ${displayName} ${reqQty} ${qtyUnit(displayName, reqQty)}`;
        this.add(this._text(m.cx, cy, reqLabel, {
            fontSize: `${m.fs(TYPE.requirement)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5));
        cy += pillH / 2 + m.H * 0.004;

        const footerH = m.H * 0.112;
        const footerPadX = panelW * 0.018;
        const footerPadBottom = m.H * 0.025;
        const footerY = panelY + panelH / 2 - footerH - footerPadBottom;
        const cardsBottom = footerY + m.H * 0.032;
        const cardH = cardsBottom - cy;
        const cardGap = innerW * 0.028;
        const cardW = (innerW - cardGap) / 2;

        variants.forEach((variant, i) => {
            this._budgetMaxByKey[variant.key] = Math.max(0, variant.budgetMax ?? 0);
            this._qtyByKey[variant.key] = 0;
            const cx = innerLeft + i * (cardW + cardGap) + cardW / 2;
            this._drawOptionCard(m, cx, cy, cardW, cardH, variant, i);
        });

        this._drawFooter(m, panelLeft + footerPadX, footerY, panelW - footerPadX * 2, footerH, {
            variants,
            coinsRemaining,
            ecoRemaining,
        });
    }

    _drawOptionCard(m, cx, top, w, h, variant, index) {
        const wrap = this.scene.add.container(cx, top);
        this.add(wrap);

        const isEco = !!variant.isEcoVariant;
        const card = this._slice(0, h / 2, isEco ? CP.productBaseGreen : CP.productBaseBlue, w, h, 72);
        wrap.add(card);

        const badgeW = w * 0.40;
        const badgeH = m.H * 0.048;
        const badgeX = -w / 2 + badgeW / 2 + w * 0.04;
        const badgeY = m.H * 0.034;
        const badge = this._slice(badgeX, badgeY, isEco ? CP.optionGreen : CP.optionBlue, badgeW, badgeH, 28);
        wrap.add(badge);
        wrap.add(this._text(badgeX, badgeY, `Option ${index + 1}`, {
            fontSize: `${m.fs(TYPE.option)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const artKey = this._artKey(variant);
        const artY = h * 0.24;
        const art = this.scene.add.image(0, artY, artKey);
        this._fitContain(art, w * 0.38, h * 0.22);
        wrap.add(art);

        const nameStyle = {
            fontSize: `${m.fs(TYPE.name)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
            align: 'center',
        };
        const name = variantTitle(this._displayName, isEco);
        wrap.add(this._text(0, h * 0.44, this._wrap(name, w * 0.86, nameStyle), nameStyle).setOrigin(0.5, 0.5));

        const price = Math.round(variant.price ?? 0);
        const impact = Math.abs(variant.product?.ecoImpact ?? 0);
        const statY = h * 0.545;
        const rowInset = w * 0.05;
        const rowGap = w * 0.03;
        const statW = w * 0.30;
        const statH = Math.min(m.W * 0.026, m.H * 0.034) * 1.45 + m.H * 0.008;
        const leftX = -(statW + rowGap) / 2;
        const rightX = (statW + rowGap) / 2;
        this._pill(wrap, leftX, statY, statW, statH, 0xF7FBFF);
        this._pill(wrap, rightX, statY, statW, statH, 0xF7FBFF);
        this._drawStatPair(wrap, m, leftX, statY, MISSION_DESC_KEYS.coinIcon, `${price}`, 'for 1', C_COIN, 1.45);
        this._drawStatPair(wrap, m, rightX, statY, CP.leaf, `${impact}`, '', C_ECO);

        const desc = (variant.product?.description ?? '').trim()
            || (isEco
                ? `This ${this._displayName} traveled a shorter distance to reach the store, reducing its transport impact.`
                : `This ${this._displayName} traveled a long distance to reach the store, which increases its transport impact.`);
        const descStyle = {
            fontSize: `${m.fs(TYPE.desc)}px`,
            color: C_MUTED,
            align: 'center',
            lineSpacing: m.fs(3),
        };
        wrap.add(this._text(0, h * 0.66, this._wrap(desc, w * 0.82, descStyle), descStyle).setOrigin(0.5, 0.5));

        const stepSize = m.H * 0.064;
        const stepY = h - stepSize / 2 - m.H * 0.05;
        const tagH = m.H * 0.048;
        const tagW = w - rowInset * 2;
        const tagY = stepY - stepSize / 2 - tagH / 2 - m.H * 0.002;
        this._pill(wrap, 0, tagY, tagW, tagH, isEco ? 0xC6E6C2 : 0xB9D6F6);
        const tagStyle = {
            fontSize: `${m.fs(TYPE.tag)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_TAG,
            align: 'center',
        };
        wrap.add(this._text(0, tagY, this._wrap(variantTagline(isEco), tagW * 0.92, tagStyle), tagStyle).setOrigin(0.5, 0.5));

        const stepper = this._drawStepper(m, 0, stepY, variant.key, isEco);
        wrap.add(stepper.wrap);

        this._cardViews[variant.key] = {
            wrap,
            minusBtn: stepper.minusBtn,
            plusBtn: stepper.plusBtn,
            qtyText: stepper.qtyText,
        };
    }

    _artKey(variant) {
        const productKey = variant.product?.textureKey;
        if (productKey && this.scene.textures.exists(productKey)) return productKey;
        return variant.isEcoVariant ? CP.riceLocal : CP.riceImported;
    }

    _pill(parent, x, y, w, h, color) {
        const g = this.scene.add.graphics();
        g.fillStyle(color, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
        parent.add(g);
        return g;
    }

    _drawStatPair(parent, m, x, y, iconKey, value, suffix, color, iconScale = 1) {
        const group = this.scene.add.container(x, y);
        parent.add(group);

        const iconS = Math.min(m.W * 0.026, m.H * 0.034) * iconScale;
        const icon = this.scene.add.image(0, 0, iconKey);
        this._fitContain(icon, iconS, iconS);
        group.add(icon);

        const val = this._text(0, 0, value, {
            fontSize: `${m.fs(TYPE.stat)}px`,
            fontStyle: WEIGHT.heavy,
            color,
        }).setOrigin(0, 0.5);
        group.add(val);

        let suffixT = null;
        if (suffix) {
            suffixT = this._text(0, 2, suffix, {
                fontSize: `${m.fs(TYPE.forOne)}px`,
                fontStyle: WEIGHT.bold,
                color,
            }).setOrigin(0, 0.5);
            group.add(suffixT);
        }

        const gap = m.W * 0.006;
        const total = icon.displayWidth + gap + val.width + (suffixT ? gap + suffixT.width : 0);
        let cursor = -total / 2;
        icon.x = cursor + icon.displayWidth / 2;
        cursor += icon.displayWidth + gap;
        val.x = cursor;
        if (suffixT) suffixT.x = cursor + val.width + gap;
    }

    _drawStepper(m, x, y, key, isEco) {
        const wrap = this.scene.add.container(x, y);
        const size = m.H * 0.064;
        const gap = m.W * 0.05;
        const barH = size * 0.72;
        const barW = gap * 2 + size * 0.35;
        const bar = this.scene.add.graphics();
        bar.fillStyle(0xffffff, 1);
        bar.fillRoundedRect(-barW / 2, -barH / 2, barW, barH, barH * 0.35);
        wrap.add(bar);

        const minusBtn = this._makeStepButton(-gap, 0, isEco ? CP.minusGreen : CP.minusBlue, () => this._changeQtyFor(key, -1), size);
        const plusBtn = this._makeStepButton(gap, 0, isEco ? CP.plusGreen : CP.plusBlue, () => this._changeQtyFor(key, 1), size);
        wrap.add(minusBtn);
        wrap.add(plusBtn);

        const qtyText = this._text(0, 0, '0', {
            fontSize: `${m.fs(TYPE.qty)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5);
        wrap.add(qtyText);

        return { wrap, minusBtn, plusBtn, qtyText };
    }

    _makeStepButton(x, y, textureKey, onClick, size) {
        const wrap = this.scene.add.container(x, y);
        const btn = this.scene.add.image(0, 0, textureKey);
        btn.setDisplaySize(size, size);
        wrap.add(btn);

        const hit = this.scene.add.circle(0, 0, size / 2, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => btn.setDisplaySize(size * 1.06, size * 1.06));
        hit.on('pointerout', () => btn.setDisplaySize(size, size));
        hit.on('pointerup', onClick);
        wrap.add(hit);

        wrap._setEnabled = (enabled) => {
            hit.disableInteractive();
            if (enabled) hit.setInteractive({ useHandCursor: true });
            wrap.setAlpha(enabled ? 1 : 0.4);
        };
        return wrap;
    }

    _drawFooter(m, x, y, w, h, { variants, coinsRemaining, ecoRemaining }) {
        const bar = this._slice(x + w / 2, y + h / 2, CP.footerBar, w, h, 56);
        this.add(bar);

        const leftX = x + w * 0.055;
        const midY = y + h * 0.42;
        const leafL = this.scene.add.image(leftX, midY, CP.leaf);
        this._fitContain(leafL, m.W * 0.028, m.H * 0.04);
        this.add(leafL);

        const resLabel = this._text(leftX + m.W * 0.024, midY, 'Your Resources:', {
            fontSize: `${m.fs(TYPE.footer)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0, 0.5);
        this.add(resLabel);

        let rx = resLabel.x + resLabel.width + m.W * 0.016;
        const coin = this.scene.add.image(rx, midY, MISSION_DESC_KEYS.coinIcon);
        this._fitContain(coin, m.W * 0.034, m.H * 0.048);
        this.add(coin);
        rx += coin.displayWidth * 0.5 + m.W * 0.008;
        const coinT = this._text(rx, midY, `${Math.round(coinsRemaining)}`, {
            fontSize: `${m.fs(TYPE.footer)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0, 0.5);
        this.add(coinT);
        rx += coinT.width + m.W * 0.014;

        const sep = this._text(rx, midY, '|', {
            fontSize: `${m.fs(TYPE.footer)}px`,
            color: C_WHITE,
        }).setOrigin(0, 0.5);
        this.add(sep);
        rx += sep.width + m.W * 0.014;

        const leafR = this.scene.add.image(rx, midY, CP.leaf);
        this._fitContain(leafR, m.W * 0.024, m.H * 0.034);
        this.add(leafR);
        rx += m.W * 0.018;
        this.add(this._text(rx, midY, `${Math.round(ecoRemaining)}`, {
            fontSize: `${m.fs(TYPE.footer)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0, 0.5));

        const std = variants.find((v) => !v.isEcoVariant);
        const eco = variants.find((v) => v.isEcoVariant);
        const coinSave = Math.max(0, Math.round((eco?.price ?? 0) - (std?.price ?? 0)));
        const ecoSave = Math.max(0, Math.abs(std?.product?.ecoImpact ?? 0) - Math.abs(eco?.product?.ecoImpact ?? 0));
        this.add(this._text(
            leftX + m.W * 0.024,
            y + h * 0.74,
            `Save ${coinSave} Coins with Imported  •  Save ${ecoSave} Eco with Regional`,
            {
                fontSize: `${m.fs(TYPE.save)}px`,
                fontStyle: WEIGHT.bold,
                color: C_WHITE,
            },
        ).setOrigin(0, 0.5));

        const btnW = w * 0.22;
        const btnH = h * 0.48;
        const btnX = x + w * 0.82;
        const btnY = y + h * 0.5;
        const btn = this.scene.add.image(btnX, btnY, HOME_TEXTURE_KEYS.greenButton);
        btn.setDisplaySize(btnW, btnH);
        this.add(btn);

        const label = this._text(btnX - btnW * 0.04, btnY, 'Add To Cart', {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        this.add(label);

        if (this.scene.textures.exists(CHECKOUT_TEXTURE_KEYS.cartIcon)) {
            const cart = this.scene.add.image(label.x + label.width / 2 + m.W * 0.014, btnY, CHECKOUT_TEXTURE_KEYS.cartIcon);
            this._fitContain(cart, btnW * 0.16, btnH * 0.5);
            this.add(cart);
        }

        const hit = this.scene.add.rectangle(btnX, btnY, btnW, btnH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => btn.setDisplaySize(btnW * 1.04, btnH * 1.04));
        hit.on('pointerout', () => btn.setDisplaySize(btnW, btnH));
        hit.on('pointerup', () => this._confirm());
        this.add(hit);

        this._addWrap = {
            _setEnabled: (enabled) => {
                hit.disableInteractive();
                if (enabled) hit.setInteractive({ useHandCursor: true });
                btn.setAlpha(enabled ? 1 : 0.45);
                label.setAlpha(enabled ? 1 : 0.45);
            },
        };
    }

    _effectiveMax(key) {
        const budgetMax = this._budgetMaxByKey[key] ?? 0;
        if (this._listRemaining == null) return budgetMax;
        const otherQty = Object.keys(this._qtyByKey)
            .filter((k) => k !== key)
            .reduce((sum, k) => sum + (this._qtyByKey[k] ?? 0), 0);
        return Math.max(0, Math.min(budgetMax, this._listRemaining - otherQty));
    }

    _changeQtyFor(key, delta) {
        const max = this._effectiveMax(key);
        const current = this._qtyByKey[key] ?? 0;
        if (delta > 0 && max <= 0) return;
        this._qtyByKey[key] = Phaser.Math.Clamp(current + delta, 0, max);
        Object.keys(this._cardViews).forEach((k) => this._refreshCardQty(k));
        this._refreshAddButton();
    }

    _refreshCardQty(key) {
        const view = this._cardViews[key];
        if (!view) return;
        const qty = this._qtyByKey[key] ?? 0;
        const max = this._effectiveMax(key);
        setCauseText(view.qtyText, `${qty}`);
        view.minusBtn._setEnabled(qty > 0);
        view.plusBtn._setEnabled(qty < max);
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
            duration: 160,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.setVisible(false);
                this.setAlpha(1);
                this._onClose?.();
                afterClose?.();
            },
        });
    }
}
