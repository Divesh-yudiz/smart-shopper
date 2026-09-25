import Phaser from 'phaser';
import { addCauseText, setCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS } from '../../config/missionDescriptionAssets.js';
import { CHOOSE_PRODUCT_KEYS as CP } from '../../config/chooseProductAssets.js';
import { SALE_POPUP_KEYS as SP } from '../../config/salePopupAssets.js';

const TYPE = Object.freeze({
    ribbon: 46,
    name: 38,
    save: 24,
    price: 44,
    strike: 34,
    hint: 20,
    eco: 44,
    desc: 24,
    qty: 40,
    footer: 30,
    button: 28,
});

const C_WHITE = '#ffffff';
const C_NAVY = '#1A2A6B';
const C_MUTED = '#3A4258';
const C_COIN = '#8B5A12';
const C_ECO = '#1B6B28';
const C_SAVE = '#5B2BB0';
const C_STRIKE = '#C45A6A';

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
});

const DEFAULT_OFFER = Object.freeze({
    title: 'Flash Sale',
    name: 'Frizzy Drink - Family Bottle',
    salePrice: 5,
    originalPrice: 8,
    ecoImpact: 8,
    description: 'This drink uses extra packaging and is not part of your current shopping list.',
});

/**
 * Flash Sale offer — sale-popup Artboard layout.
 */
export default class SalePopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(580);
        this.setVisible(false);
    }

    open({
        title = DEFAULT_OFFER.title,
        name = DEFAULT_OFFER.name,
        salePrice = DEFAULT_OFFER.salePrice,
        originalPrice = DEFAULT_OFFER.originalPrice,
        ecoImpact = DEFAULT_OFFER.ecoImpact,
        description = DEFAULT_OFFER.description,
        coinsRemaining = 62,
        ecoRemaining = 32,
        textureKey = SP.bottle,
        maxQty = 9,
        onBuy = () => { },
        onSkip = () => { },
        onClose = () => { },
    } = {}) {
        this._onBuy = onBuy;
        this._onSkip = onSkip;
        this._onClose = onClose;
        this._salePrice = Math.max(0, Math.round(salePrice));
        this._originalPrice = Math.max(this._salePrice, Math.round(originalPrice));
        this._ecoImpact = Math.round(ecoImpact);
        this._maxQty = Math.max(0, maxQty);
        this._qty = 0;
        this._name = name;

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
        this._drawPanel(m, { title, name, description, coinsRemaining, ecoRemaining, textureKey });
        this._refreshQty();

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

    _round(parent, x, y, w, h, color, radius, stroke = null, strokeW = 2) {
        const g = this.scene.add.graphics();
        const r = radius ?? Math.min(w, h) * 0.18;
        g.fillStyle(color, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
        if (stroke != null) {
            g.lineStyle(strokeW, stroke, 1);
            g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
        }
        parent.add(g);
        return g;
    }

    _dashedHr(cx, y, w) {
        const g = this.scene.add.graphics();
        const dash = 11;
        const gap = 7;
        const h = 2;
        g.fillStyle(0xD8C8B0, 1);
        let x = cx - w / 2;
        const end = cx + w / 2;
        while (x < end) {
            g.fillRoundedRect(x, y - h / 2, Math.min(dash, end - x), h, 1);
            x += dash + gap;
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
        back.on('pointerup', () => this._skip());
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

    _drawPanel(m, { title, name, description, coinsRemaining, ecoRemaining, textureKey }) {
        const panelW = m.W * 0.68;
        const panelH = m.H * 0.74;
        const panelY = m.H * 0.50;
        const panel = this._slice(m.cx, panelY, MS.pop, panelW, panelH, 110);
        this.add(panel);

        const panelTop = panelY - panelH / 2;
        const panelLeft = m.cx - panelW / 2;
        const panelBottom = panelY + panelH / 2;

        const ribbon = this.scene.add.image(m.cx, panelTop + m.H * 0.012, SP.ribbon);
        this._fitW(ribbon, panelW * 0.62);
        this.add(ribbon);
        const ribbonStyle = {
            fontSize: `${m.fs(TYPE.ribbon)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
            align: 'center',
        };
        this.add(this._text(
            m.cx,
            ribbon.y - m.H * 0.016,
            this._wrap(title, ribbon.displayWidth * 0.7, ribbonStyle),
            ribbonStyle,
        ).setOrigin(0.5, 0.5));

        const btnW = Math.min(m.W * 0.176, panelW * 0.28);
        const btnSrc = this.scene.textures.get(SP.blueButton)?.getSourceImage?.();
        const btnH = btnW * ((btnSrc?.height ?? 148) / (btnSrc?.width ?? 512));
        const barH = m.H * 0.078;
        const bottomPad = m.H * 0.030;
        const gapBarToBtn = m.H * 0.018;
        const dashGap = m.H * 0.014;
        const actionsY = panelBottom - bottomPad - btnH / 2;
        const barY = actionsY - btnH / 2 - gapBarToBtn - barH / 2;
        const dashY = barY - barH / 2 - dashGap;
        const contentBottom = dashY - m.H * 0.012;

        const padX = panelW * 0.04;
        const artW = panelW * 0.34;
        const contentTop = ribbon.y + ribbon.displayHeight * 0.52 + m.H * 0.008;
        const artTop = contentTop;
        const artH = Math.max(panelH * 0.42, contentBottom - artTop);
        const artX = panelLeft + padX + artW / 2;
        const artY = artTop + artH / 2;
        this._round(this, artX, artY, artW, artH, 0xE4D4FF, artW * 0.08);

        const artKey = this.scene.textures.exists(textureKey) ? textureKey : SP.bottle;
        const art = this.scene.add.image(artX, artY + artH * 0.02, artKey);
        this._fitContain(art, artW * 0.78, artH * 0.82);
        this.add(art);
        this._sparkles(m, artX, artY, artW, artH);

        const colLeft = artX + artW / 2 + panelW * 0.03;
        const colRight = panelLeft + panelW - padX;
        const colW = colRight - colLeft;
        const colCx = colLeft + colW / 2;
        const colTop = contentTop;
        const saved = Math.max(0, this._originalPrice - this._salePrice);
        const pillW = Math.min(colW * 0.56, m.W * 0.20);
        const pillH = m.H * 0.048;
        const statH = m.H * 0.112;
        const statW = colW * 0.92;
        const stepH = m.H * 0.060;

        const nameStyle = {
            fontSize: `${m.fs(TYPE.name)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
            align: 'center',
        };
        const nameText = this._text(colCx, 0, this._wrap(name, colW * 0.96, nameStyle), nameStyle).setOrigin(0.5, 0.5);
        this.add(nameText);

        const descStyle = {
            fontSize: `${m.fs(TYPE.desc)}px`,
            color: C_MUTED,
            align: 'center',
            lineSpacing: m.fs(4),
        };
        const descText = this._text(colCx, 0, this._wrap(description, colW * 0.92, descStyle), descStyle).setOrigin(0.5, 0);
        this.add(descText);

        const blocks = [
            { h: nameText.height, place: (top) => { nameText.y = top + nameText.height / 2; } },
            {
                h: pillH,
                place: (top) => {
                    const mid = top + pillH / 2;
                    this._round(this, colCx, mid, pillW, pillH, 0x7B3FE4, pillH * 0.45);
                    this.add(this._text(colCx, mid, `Save ${saved} Coins`, {
                        fontSize: `${m.fs(TYPE.save)}px`,
                        fontStyle: WEIGHT.heavy,
                        color: C_WHITE,
                    }).setOrigin(0.5, 0.5));
                },
            },
            { h: statH, place: (top) => this._drawPriceRow(m, colCx, top + statH / 2, statW, statH) },
            { h: descText.height, place: (top) => { descText.y = top; } },
            { h: stepH, place: (top) => this._drawStepper(m, colCx, top + stepH / 2) },
        ];
        const used = blocks.reduce((sum, block) => sum + block.h, 0);
        const gap = Math.max(m.H * 0.014, (contentBottom - colTop - used) / (blocks.length - 1));
        let stackY = colTop;
        blocks.forEach((block) => {
            block.place(stackY);
            stackY += block.h + gap;
        });

        const barW = panelW * 0.86;
        this._dashedHr(m.cx, dashY, barW);
        this._round(this, m.cx, barY, barW, barH, 0xFFF8F2, barH * 0.5, 0xE8D8C4, 2);
        this._drawResources(m, m.cx, barY, coinsRemaining, ecoRemaining);

        const leafS = m.W * 0.024;
        const leafInsetX = m.W * 0.024;
        const leafInsetY = m.H * 0.044;
        [-1, 1].forEach((side) => {
            const leaf = this.scene.add.image(
                m.cx + side * (panelW / 2 - leafInsetX),
                panelBottom - leafInsetY,
                CP.leaf,
            );
            this._fitContain(leaf, leafS, leafS);
            if (side < 0) leaf.setFlipX(true);
            this.add(leaf);
        });

        this._drawActions(m, actionsY, btnW);
    }

    _sparkles(m, cx, cy, w, h) {
        const spots = [
            [-0.28, -0.22], [0.30, -0.18], [-0.32, 0.08], [0.34, 0.12], [0.08, -0.32],
        ];
        spots.forEach(([px, py], i) => {
            const inner = (5 + (i % 3) * 2) * m.s;
            const star = this.scene.add.star(cx + px * w, cy + py * h, 4, inner, inner * 2.1, 0xFFE56A);
            star.setAlpha(0.95);
            this.add(star);
        });
    }

    _drawPriceRow(m, cx, y, w, h) {
        const saved = Math.max(0, this._originalPrice - this._salePrice);
        this._round(this, cx, y, w, h, 0xFFF8F2, h * 0.28, 0xE4D4BE, 2);

        const numY = y - h * 0.10;
        const hintY = y + h * 0.26;
        const iconS = Math.min(m.W * 0.032, m.H * 0.046);
        const gap = m.W * 0.012;
        const leftCx = cx - w * 0.22;
        const rightCx = cx + w * 0.22;

        const coin = this.scene.add.image(0, numY, MISSION_DESC_KEYS.coinIcon);
        this._fitContain(coin, iconS, iconS);
        const saleT = this._text(0, numY, `${this._salePrice}`, {
            fontSize: `${m.fs(TYPE.price)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_COIN,
        }).setOrigin(0, 0.5);
        const strike = this._text(0, numY, `${this._originalPrice}`, {
            fontSize: `${m.fs(TYPE.strike)}px`,
            fontStyle: WEIGHT.bold,
            color: C_STRIKE,
        }).setOrigin(0, 0.5);
        const leftW = coin.displayWidth + gap + saleT.width + gap + strike.width;
        let lx = leftCx - leftW / 2;
        coin.x = lx + coin.displayWidth / 2;
        lx = coin.x + coin.displayWidth / 2 + gap;
        saleT.x = lx;
        lx = saleT.x + saleT.width + gap;
        strike.x = lx;
        this.add(coin);
        this.add(saleT);
        this.add(strike);
        this.add(this.scene.add.rectangle(
            strike.x + strike.width / 2,
            numY,
            strike.width,
            Math.max(2, m.s * 3),
            0xC45A6A,
        ));
        this.add(this._text(leftCx, hintY, `save ${saved} coins`, {
            fontSize: `${m.fs(TYPE.hint)}px`,
            color: C_MUTED,
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.rectangle(cx, y, Math.max(2, m.s * 2), h * 0.56, 0xE4D8C8));

        const leaf = this.scene.add.image(0, numY, MISSION_DESC_KEYS.leafIcon);
        this._fitContain(leaf, iconS * 0.92, iconS * 0.92);
        const ecoT = this._text(0, numY, `${this._ecoImpact}`, {
            fontSize: `${m.fs(TYPE.eco)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_ECO,
        }).setOrigin(0, 0.5);
        const rightW = leaf.displayWidth + gap + ecoT.width;
        let rx = rightCx - rightW / 2;
        leaf.x = rx + leaf.displayWidth / 2;
        ecoT.x = leaf.x + leaf.displayWidth / 2 + gap;
        this.add(leaf);
        this.add(ecoT);
    }

    _drawStepper(m, x, y) {
        const size = m.H * 0.060;
        const trackH = size * 0.72;
        const trackW = size * 3.6;
        this._round(this, x, y, trackW, trackH, 0xFFF8F2, trackH * 0.5, 0xEFE3D4, 2);
        const minus = this._stepBtn(x - trackW / 2 + size * 0.48, y, size, '−', () => this._changeQty(-1));
        const plus = this._stepBtn(x + trackW / 2 - size * 0.48, y, size, '+', () => this._changeQty(1));
        this._qtyText = this._text(x, y, '0', {
            fontSize: `${m.fs(TYPE.qty)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5);
        this.add(this._qtyText);
        this._minusBtn = minus;
        this._plusBtn = plus;
    }

    _stepBtn(x, y, size, glyph, onClick) {
        const wrap = this.scene.add.container(x, y);
        const btn = this.scene.add.image(0, 0, SP.stepButton);
        btn.setDisplaySize(size, size);
        wrap.add(btn);
        wrap.add(this._text(0, -size * 0.02, glyph, {
            fontSize: `${Math.round(size * 0.62)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));
        const hit = this.scene.add.rectangle(0, 0, size, size, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => btn.setDisplaySize(size * 1.06, size * 1.06));
        hit.on('pointerout', () => btn.setDisplaySize(size, size));
        hit.on('pointerup', onClick);
        wrap.add(hit);
        wrap._setEnabled = (enabled) => {
            hit.disableInteractive();
            if (enabled) hit.setInteractive({ useHandCursor: true });
            wrap.setAlpha(enabled ? 1 : 0.45);
        };
        this.add(wrap);
        return wrap;
    }

    _drawResources(m, cx, y, coins, eco) {
        const iconS = m.H * 0.062;
        const gift = this.scene.add.image(0, y, SP.coinBag);
        this._fitContain(gift, m.W * 0.056, iconS);
        const label = this._text(0, y, 'Your Resources:', {
            fontSize: `${m.fs(TYPE.footer)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0.5);
        const coin = this.scene.add.image(0, y, MISSION_DESC_KEYS.coinIcon);
        this._fitContain(coin, m.W * 0.030, m.H * 0.042);
        const coinT = this._text(0, y, `${Math.round(coins)}`, {
            fontSize: `${m.fs(TYPE.footer)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0.5);
        const sep = this._text(0, y, '|', {
            fontSize: `${m.fs(TYPE.footer)}px`,
            color: '#C8BBA8',
        }).setOrigin(0, 0.5);
        const leaf = this.scene.add.image(0, y, MISSION_DESC_KEYS.leafIcon);
        this._fitContain(leaf, m.W * 0.026, m.H * 0.036);
        const ecoT = this._text(0, y, `${Math.round(eco)}`, {
            fontSize: `${m.fs(TYPE.footer)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0.5);

        const gapA = m.W * 0.012;
        const gapB = m.W * 0.022;
        const gapC = m.W * 0.008;
        const gapD = m.W * 0.016;
        const total = gift.displayWidth + gapA + label.width + gapB
            + coin.displayWidth + gapC + coinT.width + gapD
            + sep.width + gapD
            + leaf.displayWidth + gapC + ecoT.width;
        let x = cx - total / 2;
        gift.x = x + gift.displayWidth / 2;
        x = gift.x + gift.displayWidth / 2 + gapA;
        label.x = x;
        x = label.x + label.width + gapB;
        coin.x = x + coin.displayWidth / 2;
        x = coin.x + coin.displayWidth / 2 + gapC;
        coinT.x = x;
        x = coinT.x + coinT.width + gapD;
        sep.x = x;
        x = sep.x + sep.width + gapD;
        leaf.x = x + leaf.displayWidth / 2;
        x = leaf.x + leaf.displayWidth / 2 + gapC;
        ecoT.x = x;
        this.add(gift);
        this.add(label);
        this.add(coin);
        this.add(coinT);
        this.add(sep);
        this.add(leaf);
        this.add(ecoT);
    }

    _drawActions(m, y, btnW) {
        const gap = m.W * 0.018;

        const skipX = m.cx - btnW / 2 - gap / 2;
        const skip = this.scene.add.image(skipX, y, SP.blueButton);
        this._fitW(skip, btnW);
        const btnH = skip.displayHeight;
        this.add(skip);
        this.add(this._text(skipX, y, 'Skip Offer', {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));
        const skipHit = this.scene.add.rectangle(skipX, y, btnW, btnH, 0, 0);
        skipHit.setInteractive({ useHandCursor: true });
        skipHit.on('pointerover', () => this._fitW(skip, btnW * 1.04));
        skipHit.on('pointerout', () => this._fitW(skip, btnW));
        skipHit.on('pointerup', () => this._skip());
        this.add(skipHit);

        const buyX = m.cx + btnW / 2 + gap / 2;
        const buy = this.scene.add.image(buyX, y, SP.greenButton);
        this._fitW(buy, btnW);
        this.add(buy);
        const buyCoin = this.scene.add.image(buyX, y, MISSION_DESC_KEYS.coinIcon);
        this._fitContain(buyCoin, btnH * 0.42, btnH * 0.42);
        this.add(buyCoin);
        this._buyCoin = buyCoin;
        this._buyX = buyX;
        this._buyLabel = this._text(buyX, y, 'Buy for 5 Coins', {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        this.add(this._buyLabel);
        this._layoutBuyLabel();
        const buyHit = this.scene.add.rectangle(buyX, y, btnW, btnH, 0, 0);
        buyHit.setInteractive({ useHandCursor: true });
        buyHit.on('pointerover', () => this._fitW(buy, btnW * 1.04));
        buyHit.on('pointerout', () => this._fitW(buy, btnW));
        buyHit.on('pointerup', () => this._buy());
        this.add(buyHit);
        this._buyHit = buyHit;
        this._buyImg = buy;
    }

    _changeQty(delta) {
        this._qty = Phaser.Math.Clamp(this._qty + delta, 0, this._maxQty);
        this._refreshQty();
    }

    _refreshQty() {
        if (this._qtyText) setCauseText(this._qtyText, `${this._qty}`);
        this._minusBtn?._setEnabled(this._qty > 0);
        this._plusBtn?._setEnabled(this._qty < this._maxQty);
        const units = Math.max(1, this._qty);
        if (this._buyLabel) setCauseText(this._buyLabel, `Buy for ${this._salePrice * units} Coins`);
        this._layoutBuyLabel();
    }

    _layoutBuyLabel() {
        if (!this._buyLabel || !this._buyCoin) return;
        const gap = this._buyCoin.displayWidth * 0.35;
        const total = this._buyCoin.displayWidth + gap + this._buyLabel.width;
        const left = this._buyX - total / 2;
        this._buyCoin.x = left + this._buyCoin.displayWidth / 2;
        this._buyLabel.x = this._buyCoin.x + this._buyCoin.displayWidth / 2 + gap + this._buyLabel.width / 2;
    }

    _buy() {
        const qty = Math.max(1, this._qty);
        this._close(() => this._onBuy?.({
            qty,
            name: this._name,
            salePrice: this._salePrice,
            total: this._salePrice * qty,
            ecoImpact: this._ecoImpact,
        }));
    }

    _skip() {
        this._close(() => this._onSkip?.());
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
