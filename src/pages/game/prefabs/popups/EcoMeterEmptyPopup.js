import Phaser from 'phaser';
import { addCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS } from '../../config/missionDescriptionAssets.js';
import { SALE_POPUP_KEYS as SP } from '../../config/salePopupAssets.js';
import { NOT_ENOUGH_COIN_KEYS as NEC } from '../../config/notEnoughCoinAssets.js';
import { ECO_METER_EMPTY_KEYS as EME } from '../../config/ecoMeterEmptyAssets.js';
import { CHOOSE_PRODUCT_KEYS as CP } from '../../config/chooseProductAssets.js';

const TYPE = Object.freeze({
    ribbon: 42,
    subtitle: 22,
    statTitle: 22,
    statValue: 48,
    alertTitle: 26,
    alertBody: 20,
    section: 20,
    resTitle: 28,
    resValue: 54,
    resLabel: 22,
    button: 24,
});

const C_WHITE = '#ffffff';
const C_NAVY = '#1A2744';
const C_MUTED = '#6A6258';
const C_GREEN = '#1F8A3A';
const C_BLUE = '#2F6FE0';
const C_RED = '#E23B4A';
const C_BROWN = '#6B4A28';
const C_PURPLE = '#6B3CC9';

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
});

const DEFAULTS = Object.freeze({
    title: 'Eco Meter Empty',
    subtitle: 'Your current shopping choices have used all Eco Points.',
    ecoLimit: 32,
    usedEco: 32,
    ecoLeft: 0,
    alertTitle: 'YOUR CART NEEDS A CHANGE!',
    alertBody: 'Choose products with a lower Eco impact before checkout.',
    coinsRemaining: 18,
    ecoRemaining: 0,
    timerRemaining: 86,
});

function formatClock (value) {
    if (typeof value === 'string') return value;
    const total = Math.max(0, Math.round(Number(value) || 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Eco Meter Empty — purple ribbon, eco stats, cart warning, remaining resources.
 */
export default class EcoMeterEmptyPopup extends Phaser.GameObjects.Container {
    constructor (scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(600);
        this.setVisible(false);
    }

    open ({
        title = DEFAULTS.title,
        subtitle = DEFAULTS.subtitle,
        ecoLimit = DEFAULTS.ecoLimit,
        usedEco = DEFAULTS.usedEco,
        ecoLeft = DEFAULTS.ecoLeft,
        alertTitle = DEFAULTS.alertTitle,
        alertBody = DEFAULTS.alertBody,
        coinsRemaining = DEFAULTS.coinsRemaining,
        ecoRemaining = DEFAULTS.ecoRemaining,
        timerRemaining = DEFAULTS.timerRemaining,
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
            subtitle,
            ecoLimit: Math.max(0, Math.round(ecoLimit)),
            usedEco: Math.max(0, Math.round(usedEco)),
            ecoLeft: Math.max(0, Math.round(ecoLeft)),
            alertTitle,
            alertBody,
            coinsRemaining: Math.max(0, Math.round(coinsRemaining)),
            ecoRemaining: Math.max(0, Math.round(ecoRemaining)),
            timerLabel: formatClock(timerRemaining),
        });

        this.setVisible(true);
        this.setAlpha(0);
        this.scene.tweens.add({
            targets: this, alpha: 1, duration: 220, ease: 'Quad.easeOut',
        });
    }

    _m () {
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

    _text (x, y, message, style) {
        return addCauseText(this.scene, x, y, message, { fontStyle: WEIGHT.bold, ...style });
    }

    _wrap (str, maxWidth, style) {
        return wrapCause(this.scene, str, maxWidth, style);
    }

    _fitW (img, displayW) {
        img.setDisplaySize(displayW, displayW * (img.height / img.width));
        return img;
    }

    _fitContain (img, maxW, maxH) {
        const s = Math.min(maxW / img.width, maxH / img.height);
        img.setDisplaySize(img.width * s, img.height * s);
        return img;
    }

    _slice (x, y, key, w, h, preferredCap = 64) {
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

    _round (x, y, w, h, color, radius, stroke = null, strokeW = 2) {
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

    _iconLabel (cx, y, key, label, iconS, gap, style, tint = null) {
        const icon = this.scene.add.image(0, y, key);
        this._fitContain(icon, iconS, iconS);
        if (tint != null) icon.setTint(tint);
        const text = this._text(0, y, label, style).setOrigin(0, 0.5);
        const total = icon.displayWidth + gap + text.width;
        icon.x = cx - total / 2 + icon.displayWidth / 2;
        text.x = icon.x + icon.displayWidth / 2 + gap;
        this.add(icon);
        this.add(text);
    }

    _drawChrome (m) {
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

    _drawPanel (m, data) {
        const panelW = m.W * 0.62;
        const gap = m.H * 0.012;
        const bottomPad = m.H * 0.026;
        const statH = m.H * 0.14;
        const alertH = m.H * 0.112;
        const sectionH = m.H * 0.042;
        const resH = m.H * 0.205;
        const btnH = m.H * 0.05;
        const subStyle = {
            fontSize: `${m.fs(TYPE.subtitle)}px`,
            color: C_NAVY,
            align: 'center',
        };
        const padX = panelW * 0.045;
        const innerW = panelW - padX * 2;
        const subProbe = this._text(0, 0, this._wrap(data.subtitle, innerW * 0.92, subStyle), subStyle).setVisible(false);
        const subH = subProbe.height;
        subProbe.destroy();

        const ribbonSrc = this.scene.textures.get(MS.ribbon)?.getSourceImage?.();
        const ribbonW = panelW * 0.58;
        const ribbonH = ribbonW * ((ribbonSrc?.height ?? 180) / (ribbonSrc?.width ?? 900));
        const ribbonOverlap = ribbonH * 0.42;
        const belowRibbon = ribbonOverlap + ribbonH * 0.5 + m.H * 0.01;
        const innerH = belowRibbon + subH + gap + statH + gap + alertH + gap + sectionH + gap + resH + gap + btnH + bottomPad;
        const panelH = innerH;
        const panelY = m.H * 0.52;
        const panel = this._slice(m.cx, panelY, MS.pop, panelW, panelH, 110);
        this.add(panel);

        const panelTop = panelY - panelH / 2;
        const panelLeft = m.cx - panelW / 2;
        this._cornerLeaves(m, panelLeft, panelTop, panelW, panelH);

        const ribbon = this.scene.add.image(m.cx, panelTop + ribbonOverlap, MS.ribbon);
        this._fitW(ribbon, ribbonW);
        this.add(ribbon);
        const ribbonStyle = {
            fontSize: `${m.fs(TYPE.ribbon)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
            align: 'center',
        };
        this.add(this._text(
            ribbon.x,
            ribbon.y - ribbon.displayHeight * 0.04,
            this._wrap(data.title, ribbon.displayWidth * 0.72, ribbonStyle),
            ribbonStyle,
        ).setOrigin(0.5, 0.5));

        const innerLeft = panelLeft + padX;
        const contentTop = ribbon.y + ribbon.displayHeight * 0.5 + m.H * 0.01;

        const subtitle = this._text(
            m.cx,
            contentTop,
            this._wrap(data.subtitle, innerW * 0.92, subStyle),
            subStyle,
        ).setOrigin(0.5, 0);
        this.add(subtitle);

        const statY = subtitle.y + subtitle.height + gap + statH / 2;
        const alertY = statY + statH / 2 + gap + alertH / 2;
        const sectionY = alertY + alertH / 2 + gap + sectionH / 2;
        const resY = sectionY + sectionH / 2 + gap + resH / 2;
        const btnY = resY + resH / 2 + gap + btnH / 2;

        this._drawStatRow(m, m.cx, statY, innerW, statH, data);
        this._drawAlert(m, innerLeft + innerW / 2, alertY, innerW, alertH, data);
        this._drawSection(m, m.cx, sectionY, innerW * 0.92);
        this._drawResources(m, m.cx, resY, innerW, resH, data);
        this._drawViewCart(m, m.cx, btnY, Math.min(innerW * 0.30, m.W * 0.16), btnH);
    }

    _cornerLeaves (m, left, top, w, h) {
        const size = m.W * 0.038;
        const spots = [
            { x: left + w * 0.07, y: top + h * 0.16, flipX: true, alpha: 0.5, rot: -0.4 },
            { x: left + w * 0.93, y: top + h * 0.16, flipX: false, alpha: 0.5, rot: 0.35 },
            { x: left + w * 0.055, y: top + h * 0.9, flipX: true, alpha: 0.65, rot: -0.2 },
            { x: left + w * 0.945, y: top + h * 0.9, flipX: false, alpha: 0.65, rot: 0.15 },
        ];
        spots.forEach((spot) => {
            const leaf = this.scene.add.image(spot.x, spot.y, EME.ecoLeaf);
            this._fitContain(leaf, size, size);
            leaf.setFlipX(spot.flipX);
            leaf.setAlpha(spot.alpha);
            leaf.setRotation(spot.rot);
            this.add(leaf);
        });
    }

    _drawStatRow (m, cx, y, w, h, data) {
        const cards = [
            { title: 'ECO LIMIT', titleColor: C_GREEN, fill: 0xE7F8EC, icon: CP.leaf, tint: 0x1B7A32, value: data.ecoLimit, valueColor: C_NAVY },
            { title: 'USED ECO', titleColor: C_BLUE, fill: 0xE7F2FF, icon: EME.ecoLeaf, value: data.usedEco, valueColor: C_NAVY },
            { title: 'ECO LEFT', titleColor: C_RED, fill: 0xFFE8EA, icon: EME.redLeaf, value: data.ecoLeft, valueColor: C_RED },
        ];
        const gap = m.W * 0.012;
        const cardW = (w - gap * (cards.length - 1)) / cards.length;
        cards.forEach((card, i) => {
            const x = cx - w / 2 + cardW / 2 + i * (cardW + gap);
            this._statCard(m, x, y, cardW, h, card);
        });
    }

    _statCard (m, x, y, w, h, card) {
        this._round(x, y, w, h, card.fill, h * 0.16);
        const iconS = Math.min(w * 0.22, h * 0.32);
        this._iconLabel(x, y - h * 0.22, card.icon, card.title, iconS, m.W * 0.006, {
            fontSize: `${m.fs(TYPE.statTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: card.titleColor,
        }, card.tint);
        this.add(this._text(x, y + h * 0.16, `${card.value}`, {
            fontSize: `${m.fs(TYPE.statValue)}px`,
            fontStyle: WEIGHT.heavy,
            color: card.valueColor,
        }).setOrigin(0.5, 0.5));
    }

    _drawAlert (m, cx, y, w, h, data) {
        this._round(cx, y, w, h, 0xFFFEFB, h * 0.22, 0xF0E2D0, 2);

        const iconS = h * 1.02;
        const icon = this.scene.add.image(cx - w / 2 + iconS / 2 + m.W * 0.002, y, EME.errorIcon);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);

        const sproutS = h * 0.62;
        const sprout = this.scene.add.image(cx + w / 2 - h * 0.5, y, MISSION_DESC_KEYS.leafIcon);
        this._fitContain(sprout, sproutS, sproutS);
        this.add(sprout);

        const textLeft = icon.x + icon.displayWidth / 2 + m.W * 0.012;
        const textRight = sprout.x - sprout.displayWidth / 2 - m.W * 0.012;
        const textW = Math.max(40, textRight - textLeft);
        const titleStyle = {
            fontSize: `${m.fs(TYPE.alertTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_RED,
        };
        const bodyStyle = {
            fontSize: `${m.fs(TYPE.alertBody)}px`,
            color: C_MUTED,
            lineSpacing: m.fs(2),
        };
        const title = this._text(textLeft, y, data.alertTitle, titleStyle).setOrigin(0, 1);
        const body = this._text(textLeft, y, this._wrap(data.alertBody, textW, bodyStyle), bodyStyle).setOrigin(0, 0);
        const blockH = title.height + body.height + m.H * 0.004;
        title.y = y - blockH / 2 + title.height;
        body.y = title.y + m.H * 0.004;
        this.add(title);
        this.add(body);
    }

    _drawSection (m, cx, y, w) {
        const label = 'YOUR RESOURCES';
        const style = {
            fontSize: `${m.fs(TYPE.section)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_PURPLE,
        };
        const probe = this._text(0, 0, label, style).setVisible(false);
        const pillW = probe.width + m.W * 0.04;
        const pillH = m.H * 0.04;
        probe.destroy();

        this._dashedHr(cx - w / 2, cx - pillW / 2 - m.W * 0.008, y, m);
        this._dashedHr(cx + pillW / 2 + m.W * 0.008, cx + w / 2, y, m);
        this._round(cx, y, pillW, pillH, 0xE8D8FB, pillH * 0.5);
        this.add(this._text(cx, y, label, style).setOrigin(0.5, 0.5));
    }

    _dashedHr (x1, x2, y, m) {
        const g = this.scene.add.graphics();
        const dash = 12 * m.s;
        const gap = 8 * m.s;
        const h = Math.max(2, 2 * m.s);
        g.fillStyle(0xD9CBEA, 1);
        let x = x1;
        while (x < x2) {
            g.fillRoundedRect(x, y - h / 2, Math.min(dash, x2 - x), h, 1);
            x += dash + gap;
        }
        this.add(g);
    }

    _drawResources (m, cx, y, w, h, data) {
        const cards = [
            { title: 'COINS', titleColor: C_BROWN, fill: 0xFFF8F0, stroke: 0xE8D8C4, icon: MISSION_DESC_KEYS.coinIcon, value: `${data.coinsRemaining}` },
            { title: 'ECO', titleColor: C_GREEN, fill: 0xF3FBF4, stroke: 0xC8E8CC, icon: EME.ecoLeaf, value: `${data.ecoRemaining}` },
            { title: 'TIMER', titleColor: C_BLUE, fill: 0xF3F8FF, stroke: 0xC9DDF8, icon: MISSION_DESC_KEYS.timerIcon, value: data.timerLabel },
        ];
        const gap = m.W * 0.012;
        const cardW = (w - gap * (cards.length - 1)) / cards.length;
        cards.forEach((card, i) => {
            const x = cx - w / 2 + cardW / 2 + i * (cardW + gap);
            this._resourceCard(m, x, y, cardW, h, card);
        });
    }

    _resourceCard (m, x, y, w, h, card) {
        this._round(x, y, w, h, card.fill, h * 0.14, card.stroke, Math.max(2, Math.round(2 * m.s)));
        const iconS = Math.min(w * 0.18, h * 0.28);
        this._iconLabel(x, y - h * 0.28, card.icon, card.title, iconS, m.W * 0.008, {
            fontSize: `${m.fs(TYPE.resTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: card.titleColor,
        });
        this.add(this._text(x, y + h * 0.02, card.value, {
            fontSize: `${m.fs(TYPE.resValue)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5));
        this.add(this._text(x, y + h * 0.30, 'Remaining', {
            fontSize: `${m.fs(TYPE.resLabel)}px`,
            color: C_MUTED,
        }).setOrigin(0.5, 0.5));
    }

    _drawViewCart (m, cx, y, btnW, btnH) {
        const btn = this.scene.add.image(cx, y, SP.greenButton);
        const ratio = btn.width / btn.height;
        const displayH = btnH;
        const displayW = Math.min(btnW, displayH * ratio);
        const fitBtn = (scale = 1) => btn.setDisplaySize(displayW * scale, displayH * scale);
        fitBtn();
        this.add(btn);

        const cartS = displayH * 0.42;
        const cart = this.scene.add.image(cx, y, NEC.cart);
        this._fitContain(cart, cartS, cartS);
        const label = this._text(cx, y, 'View Cart', {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        this.add(cart);
        this.add(label);
        const gap = cart.displayWidth * 0.35;
        const total = cart.displayWidth + gap + label.width;
        cart.x = cx - total / 2 + cart.displayWidth / 2;
        label.x = cart.x + cart.displayWidth / 2 + gap + label.width / 2;

        const hit = this.scene.add.rectangle(cx, y, displayW, displayH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => fitBtn(1.04));
        hit.on('pointerout', () => fitBtn());
        hit.on('pointerup', () => this._viewCart());
        this.add(hit);
    }

    _viewCart () {
        this._close(() => this._onViewCart?.());
    }

    _close (afterClose = null) {
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
