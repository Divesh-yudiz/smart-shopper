import Phaser from 'phaser';
import { addCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS } from '../../config/missionDescriptionAssets.js';
import { CHOOSE_PRODUCT_KEYS as CP } from '../../config/chooseProductAssets.js';
import { SALE_POPUP_KEYS as SP } from '../../config/salePopupAssets.js';
import { NOT_ENOUGH_COIN_KEYS as NEC } from '../../config/notEnoughCoinAssets.js';

const TYPE = Object.freeze({
    ribbon: 46,
    name: 42,
    save: 24,
    price: 46,
    desc: 24,
    statTitle: 26,
    statValue: 48,
    statLabel: 22,
    hintTitle: 28,
    hintBody: 22,
    button: 30,
});

const C_WHITE = '#ffffff';
const C_NAVY = '#1A2A6B';
const C_MUTED = '#5C6578';
const C_NUM = '#1A2744';
const C_RED = '#E23B4A';
const C_BLUE = '#2F6FE0';
const C_PURPLE = '#7A3FE0';
const C_GREEN = '#1F8A3A';

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
});

const DEFAULT_OFFER = Object.freeze({
    title: 'Not Enough Coins',
    name: 'Locally Baked Bread',
    saveCoins: 3,
    price: 10,
    ecoCost: 3,
    description: 'Freshly baked bread from local bakers. Great taste with a lower carbon footprint!',
    productCost: 10,
    coinsHave: 7,
    shortBy: 3,
    ecoAvailable: 14,
    timerRemaining: 3,
    hintTitle: 'You can fix this',
    hintBody: 'Review your cart and remove an extra item or swap a product for a cheaper choice.',
});

/**
 * Not Enough Coins — red ribbon, product card, shortfall stats, view-cart action.
 */
export default class NotEnoughCoinsPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(590);
        this.setVisible(false);
    }

    open({
        title = DEFAULT_OFFER.title,
        name = DEFAULT_OFFER.name,
        saveCoins = DEFAULT_OFFER.saveCoins,
        price = DEFAULT_OFFER.price,
        ecoCost = DEFAULT_OFFER.ecoCost,
        description = DEFAULT_OFFER.description,
        productCost = DEFAULT_OFFER.productCost,
        coinsHave = DEFAULT_OFFER.coinsHave,
        shortBy = DEFAULT_OFFER.shortBy,
        ecoAvailable = DEFAULT_OFFER.ecoAvailable,
        timerRemaining = DEFAULT_OFFER.timerRemaining,
        hintTitle = DEFAULT_OFFER.hintTitle,
        hintBody = DEFAULT_OFFER.hintBody,
        textureKey = NEC.bread,
        onViewCart = () => { },
        onClose = () => { },
    } = {}) {
        this._onViewCart = onViewCart;
        this._onClose = onClose;

        this.removeAll(true);
        this.setScale(1);

        const m = this._m();
        const bg = this.scene.add.image(m.cx, m.cy, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(m.W, m.H);
        this.add(bg);

        const ov = this.scene.add.rectangle(m.cx, m.cy, m.W, m.H, 0x000000, 0.18);
        ov.setInteractive();
        this.add(ov);

        this._drawChrome(m);
        this._drawPanel(m, {
            title,
            name,
            saveCoins: Math.max(0, Math.round(saveCoins)),
            price: Math.max(0, Math.round(price)),
            ecoCost: Math.max(0, Math.round(ecoCost)),
            description,
            productCost: Math.max(0, Math.round(productCost)),
            coinsHave: Math.max(0, Math.round(coinsHave)),
            shortBy: Math.max(0, Math.round(shortBy)),
            ecoAvailable: Math.max(0, Math.round(ecoAvailable)),
            timerRemaining: Math.max(0, Math.round(timerRemaining)),
            hintTitle,
            hintBody,
            textureKey,
        });

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

    _round(x, y, w, h, color, radius, stroke = null, strokeW = 2) {
        const g = this.scene.add.graphics();
        const r = radius ?? Math.min(w, h) * 0.18;
        g.fillStyle(color, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
        if (stroke != null) {
            g.lineStyle(strokeW, stroke, 1);
            g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
        }
        this.add(g);
        return g;
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

    _drawPanel(m, data) {
        const panelW = m.W * 0.74;
        const panelH = m.H * 0.76;
        const panelY = m.H * 0.52;
        const panel = this._slice(m.cx, panelY, MS.pop, panelW, panelH, 110);
        this.add(panel);

        const panelTop = panelY - panelH / 2;
        const panelLeft = m.cx - panelW / 2;
        const panelBottom = panelY + panelH / 2;

        const ribbon = this.scene.add.image(m.cx, panelTop + m.H * 0.006, NEC.ribbon);
        this._fitW(ribbon, panelW * 0.52);
        this.add(ribbon);
        const ribbonStyle = {
            fontSize: `${m.fs(TYPE.ribbon)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
            align: 'center',
        };
        const ribbonText = this._text(
            ribbon.x,
            ribbon.y - ribbon.displayHeight * 0.08,
            this._wrap(data.title, ribbon.displayWidth * 0.7, ribbonStyle),
            ribbonStyle,
        ).setOrigin(0.5, 0.5);
        this.add(ribbonText);

        const padX = panelW * 0.038;
        const innerLeft = panelLeft + padX;
        const innerRight = panelLeft + panelW - padX;
        const innerW = innerRight - innerLeft;
        const contentTop = ribbon.y + ribbon.displayHeight * 0.46;
        const footerH = m.H * 0.128;
        const footerW = panelW * 0.94;
        const statH = m.H * 0.168;
        const gap = m.H * 0.016;
        const bottomPad = m.H * 0.028;
        const footerY = panelBottom - bottomPad - footerH / 2;
        const statY = footerY - footerH / 2 - gap - statH / 2;
        const heroBottom = statY - statH / 2 - gap;

        const artW = innerW * 0.32;
        const artH = heroBottom - contentTop;
        const artX = innerLeft + artW / 2;
        const artY = contentTop + artH / 2;
        this._round(artX, artY, artW, artH, 0xD4B4F6, artW * 0.08);
        const artKey = this.scene.textures.exists(data.textureKey) ? data.textureKey : NEC.bread;
        const art = this.scene.add.image(artX, artY, artKey);
        this._fitContain(art, artW * 0.86, artH * 0.9);
        this.add(art);
        this._sparkles(m, artX, artY, artW, artH);

        const colLeft = artX + artW / 2 + panelW * 0.028;
        const colW = innerRight - colLeft;
        const colCx = colLeft + colW / 2;
        this._drawHeroCopy(m, colCx, contentTop, heroBottom, colW, data);
        this._drawStats(m, innerLeft + innerW / 2, statY, innerW, statH, data);
        this._drawFooter(m, m.cx, footerY, footerW, footerH, data);

        const leafS = m.W * 0.034;
        const leftLeaf = this.scene.add.image(panelLeft, panelBottom, MISSION_DESC_KEYS.leafIcon);
        leftLeaf.setOrigin(0, 1);
        this._fitContain(leftLeaf, leafS, leafS);
        leftLeaf.setPosition(panelLeft, panelBottom);
        leftLeaf.setFlipX(true);
        this.add(leftLeaf);

        const rightLeaf = this.scene.add.image(panelLeft + panelW, panelBottom, MISSION_DESC_KEYS.leafIcon);
        rightLeaf.setOrigin(1, 1);
        this._fitContain(rightLeaf, leafS, leafS);
        rightLeaf.setPosition(panelLeft + panelW, panelBottom);
        this.add(rightLeaf);
    }

    _drawHeroCopy(m, cx, top, bottom, colW, data) {
        const nameStyle = {
            fontSize: `${m.fs(TYPE.name)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
            align: 'center',
        };
        const nameText = this._text(cx, 0, this._wrap(data.name, colW * 0.96, nameStyle), nameStyle).setOrigin(0.5, 0.5);
        this.add(nameText);

        const pillH = m.H * 0.046;
        const pillW = Math.min(colW * 0.48, m.W * 0.18);
        const rowH = m.H * 0.1;
        const descStyle = {
            fontSize: `${m.fs(TYPE.desc)}px`,
            color: C_MUTED,
            align: 'center',
            lineSpacing: m.fs(4),
        };
        const descText = this._text(cx, 0, this._wrap(data.description, colW * 0.72, descStyle), descStyle).setOrigin(0.5, 0);
        this.add(descText);

        const blocks = [
            { h: nameText.height, place: (y) => { nameText.y = y + nameText.height / 2; } },
            {
                h: pillH,
                place: (y) => {
                    const mid = y + pillH / 2;
                    this._round(cx, mid, pillW, pillH, 0x7A35E0, pillH * 0.45);
                    this.add(this._text(cx, mid, `Save ${data.saveCoins} Coins`, {
                        fontSize: `${m.fs(TYPE.save)}px`,
                        fontStyle: WEIGHT.heavy,
                        color: C_WHITE,
                    }).setOrigin(0.5, 0.5));
                },
            },
            { h: rowH, place: (y) => this._drawPriceRow(m, cx, y + rowH / 2, colW * 0.68, rowH, data) },
            { h: descText.height, place: (y) => { descText.y = y; } },
        ];
        const used = blocks.reduce((sum, block) => sum + block.h, 0);
        const gap = Math.max(m.H * 0.012, (bottom - top - used) / Math.max(1, blocks.length - 1));
        let y = top;
        blocks.forEach((block) => {
            block.place(y);
            y += block.h + gap;
        });
    }

    _drawPriceRow(m, cx, y, w, h, data) {
        this._round(cx, y, w, h, 0xFFFEFB, h * 0.32, 0xE6D8C4, 2);
        const iconS = Math.min(m.W * 0.034, h * 0.52);
        const gap = m.W * 0.01;
        const leftCx = cx - w * 0.24;
        const rightCx = cx + w * 0.24;

        this._iconValue(leftCx, y, MISSION_DESC_KEYS.coinIcon, `${data.price}`, iconS, gap, {
            fontSize: `${m.fs(TYPE.price)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NUM,
        });
        this.add(this.scene.add.rectangle(cx, y, Math.max(2, m.s * 2), h * 0.5, 0xE4D8C8));
        this._iconValue(rightCx, y, CP.leaf, `${data.ecoCost}`, iconS * 0.92, gap, {
            fontSize: `${m.fs(TYPE.price)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NUM,
        });
    }

    _iconValue(cx, y, key, value, iconS, gap, style) {
        const icon = this.scene.add.image(0, y, key);
        this._fitContain(icon, iconS, iconS);
        const label = this._text(0, y, value, style).setOrigin(0, 0.5);
        const total = icon.displayWidth + gap + label.width;
        icon.x = cx - total / 2 + icon.displayWidth / 2;
        label.x = icon.x + icon.displayWidth / 2 + gap;
        this.add(icon);
        this.add(label);
    }

    _drawStats(m, cx, y, w, h, data) {
        const cards = [
            { title: 'Product Costs', titleColor: C_RED, fill: 0xFFF9F4, stroke: 0xF0A04A, icon: MISSION_DESC_KEYS.coinIcon, value: data.productCost, label: 'Coins' },
            { title: 'You have', titleColor: C_BLUE, fill: 0xF3F8FF, stroke: 0x4A90E8, icon: MISSION_DESC_KEYS.coinIcon, value: data.coinsHave, label: 'Coins' },
            { title: 'Short By', titleColor: C_PURPLE, fill: 0xF7F1FF, stroke: 0xA56BE0, icon: MISSION_DESC_KEYS.coinIcon, value: data.shortBy, label: 'Coins' },
            { title: 'Eco Impact', titleColor: C_GREEN, fill: 0xF3FBF4, stroke: 0x5CBF62, icon: CP.leaf, value: data.ecoAvailable, label: 'Available' },
            { title: 'Timer', titleColor: C_BLUE, fill: 0xF4F9FF, stroke: 0x4A90E8, clock: true, value: data.timerRemaining, label: 'Remaining' },
        ];
        const gap = m.W * 0.008;
        const cardW = (w - gap * (cards.length - 1)) / cards.length;
        cards.forEach((card, i) => {
            const x = cx - w / 2 + cardW / 2 + i * (cardW + gap);
            this._statCard(m, x, y, cardW, h, card);
        });
    }

    _statCard(m, x, y, w, h, card) {
        const strokeW = Math.max(3, Math.round(4 * m.s));
        this._round(x, y, w, h, card.fill, h * 0.18, card.stroke, strokeW);
        this.add(this._text(x, y - h * 0.34, card.title, {
            fontSize: `${m.fs(TYPE.statTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: card.titleColor,
        }).setOrigin(0.5, 0.5));

        const iconS = Math.min(w * 0.28, h * 0.32);
        const gap = m.W * 0.006;
        const valueStyle = {
            fontSize: `${m.fs(TYPE.statValue)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NUM,
        };
        if (card.clock) this._clockValue(x, y, `${card.value}`, iconS, gap, valueStyle);
        else this._iconValue(x, y, card.icon, `${card.value}`, iconS, gap, valueStyle);
        this.add(this._text(x, y + h * 0.30, card.label, {
            fontSize: `${m.fs(TYPE.statLabel)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NUM,
        }).setOrigin(0.5, 0.5));
    }

    _clockValue(cx, y, value, iconS, gap, style) {
        const label = this._text(0, y, value, style).setOrigin(0, 0.5);
        const total = iconS + gap + label.width;
        const iconX = cx - total / 2 + iconS / 2;
        this._clockIcon(iconX, y, iconS);
        label.x = iconX + iconS / 2 + gap;
        this.add(label);
    }

    _clockIcon(x, y, size) {
        const g = this.scene.add.graphics();
        const r = size * 0.46;
        const ring = Math.max(2.5, size * 0.1);
        g.fillStyle(0xFFFEFB, 1);
        g.fillCircle(x, y, r);
        g.lineStyle(ring, 0x1A2744, 1);
        g.strokeCircle(x, y, r);
        g.lineStyle(Math.max(2, size * 0.08), 0x1A2744, 1);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - r * 0.22, y - r * 0.28);
        g.moveTo(x, y);
        g.lineTo(x + r * 0.08, y - r * 0.55);
        g.strokePath();
        g.fillStyle(0x1A2744, 1);
        g.fillCircle(x, y, Math.max(2, size * 0.07));
        this.add(g);
    }

    _drawFooter(m, cx, y, w, h, data) {
        this._round(cx, y, w, h, 0xFFF8F0, h * 0.28, 0xE8DCC8, 2);

        const hintS = h * 0.62;
        const hint = this.scene.add.image(cx - w / 2 + h * 0.42, y, NEC.hint);
        hint.setDisplaySize(hintS, hintS);
        this.add(hint);

        const btnSrc = this.scene.textures.get(SP.blueButton)?.getSourceImage?.();
        const btnW = Math.min(w * 0.28, m.W * 0.18);
        const btnH = btnW * ((btnSrc?.height ?? 148) / (btnSrc?.width ?? 512));
        const btnX = cx + w / 2 - btnW / 2 - h * 0.16;
        const btn = this.scene.add.image(btnX, y, SP.blueButton);
        this._fitW(btn, btnW);
        this.add(btn);

        const cartS = btnH * 0.42;
        const cart = this.scene.add.image(btnX, y, NEC.cart);
        this._fitContain(cart, cartS, cartS);
        const btnLabel = this._text(btnX, y, 'View Cart', {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        this.add(cart);
        this.add(btnLabel);
        const btnGap = cart.displayWidth * 0.28;
        const btnTotal = cart.displayWidth + btnGap + btnLabel.width;
        cart.x = btnX - btnTotal / 2 + cart.displayWidth / 2;
        btnLabel.x = cart.x + cart.displayWidth / 2 + btnGap + btnLabel.width / 2;

        const hit = this.scene.add.rectangle(btnX, y, btnW, btn.displayHeight, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => this._fitW(btn, btnW * 1.04));
        hit.on('pointerout', () => this._fitW(btn, btnW));
        hit.on('pointerup', () => this._viewCart());
        this.add(hit);

        const textLeft = hint.x + hintS / 2 + m.W * 0.012;
        const textRight = btnX - btnW / 2 - m.W * 0.028;
        const textW = Math.max(40, textRight - textLeft);
        const titleStyle = {
            fontSize: `${m.fs(TYPE.hintTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        };
        const bodyStyle = {
            fontSize: `${m.fs(TYPE.hintBody)}px`,
            color: C_MUTED,
            lineSpacing: m.fs(2),
        };
        const title = this._text(textLeft, y, data.hintTitle, titleStyle).setOrigin(0, 1);
        const body = this._text(textLeft, y, this._wrap(data.hintBody, textW * 0.72, bodyStyle), bodyStyle).setOrigin(0, 0);
        const blockH = title.height + body.height + m.H * 0.004;
        title.y = y - blockH / 2 + title.height;
        body.y = title.y + m.H * 0.004;
        this.add(title);
        this.add(body);
    }

    _sparkles(m, cx, cy, w, h) {
        const spots = [
            [-0.30, -0.28], [0.32, -0.22], [-0.34, 0.06], [0.34, 0.16], [0.02, -0.36],
        ];
        spots.forEach(([px, py], i) => {
            const inner = (4 + (i % 3) * 2) * m.s;
            const star = this.scene.add.star(cx + px * w, cy + py * h, 4, inner, inner * 2.1, 0xFFE56A);
            star.setAlpha(0.95);
            this.add(star);
        });
    }

    _viewCart() {
        this._close(() => this._onViewCart?.());
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
