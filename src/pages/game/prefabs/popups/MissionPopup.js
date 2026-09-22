import Phaser from 'phaser';
import config from '../../utils/config.js';
import { resolveItem } from '../../../../utils/gameApi.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS as K } from '../../config/missionDescriptionAssets.js';

/** Artboard 3 type scale at 1920×1080. */
const TYPE = Object.freeze({
    ribbon: 20,
    heroTitle: 40,
    heading: 32,
    body: 20,
    statLabel: 17,
    statValue: 46,
    statSub: 15,
    itemName: 24,
    itemQty: 19,
    tipsTitle: 22,
    tipsBody: 16,
    button: 21,
    link: 16,
});

const C_BODY = '#111111';
const C_NAVY = '#0F1C2E';
const C_WHITE = '#ffffff';
const C_COIN = '#8A4A08';
const C_ECO = '#145A24';
const C_TIMER = '#084A9A';
const C_LINK = '#145A32';
const C_PURPLE = '#6B2FA0';

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
});

const HERO_ARTS = [MS.basketArt, MS.lunchArt, MS.packArt];

const ITEM_ICON_FALLBACKS = [
    K.bowlIcon,
    K.breadIcon,
    K.eggIcon,
    K.milkIcon,
    K.bananaIcon,
];

function formatName (key) {
    return String(key ?? 'Item')
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime (seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function qtyLabel (item) {
    const q = item.nQuantity ?? 1;
    const hay = `${item.sItemKey ?? ''} ${item.sName ?? ''}`.toLowerCase();
    if (/(banana|carrot|potato|onion|tomato|piece|apple|orange)/.test(hay)) {
        return `${q} ${q === 1 ? 'Piece' : 'Pieces'}`;
    }
    return `${q} Pack`;
}

function itemIconKey (item, index) {
    const hay = `${item.sItemKey ?? ''} ${item.sName ?? ''}`.toLowerCase();
    if (/(rice|grain|bowl|cereal)/.test(hay)) return K.bowlIcon;
    if (/(bread)/.test(hay)) return K.breadIcon;
    if (/(egg)/.test(hay)) return K.eggIcon;
    if (/(milk)/.test(hay)) return K.milkIcon;
    if (/(banana)/.test(hay)) return K.bananaIcon;
    if (/(cola|juice|drink|soda|water)/.test(hay)) return K.milkIcon;
    if (/(cookie|wafer|cake|donut|bread)/.test(hay)) return K.breadIcon;
    return ITEM_ICON_FALLBACKS[index % ITEM_ICON_FALLBACKS.length];
}

/**
 * Mission description brief — Artboard 3 layout.
 * Positions and sizes are fractions of the live game width / height.
 */
export default class MissionPopup extends Phaser.GameObjects.Container {
    constructor (scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(620);
        this.setVisible(false);
    }

    open ({
        shoppingList = [],
        title = '',
        description = '',
        missionOrder = 0,
        budget = 0,
        timeLimit = 0,
        ecoLimit = 100,
        onStart = () => { },
        onChooseAnother = null,
        animate = true,
    } = {}) {
        this._onStart = onStart;
        this._onChooseAnother = onChooseAnother;

        this.removeAll(true);
        this.setScale(1);

        const m = this._m();

        if (this.scene._root) this.scene._root.setVisible(false);

        const bg = this.scene.add.image(m.cx, m.cy, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(m.W, m.H);
        this.add(bg);

        const ov = this.scene.add.rectangle(m.cx, m.cy, m.W, m.H, 0x000000, 0.12);
        ov.setInteractive();
        this.add(ov);

        this._drawChrome(m);
        this._drawPanel(m, {
            items: shoppingList.filter(Boolean),
            title,
            description,
            missionOrder,
            budget,
            timeLimit,
            ecoLimit,
        });

        this.setVisible(true);
        if (animate) {
            this.setAlpha(0);
            this.scene.tweens.add({
                targets: this, alpha: 1, duration: 220, ease: 'Quad.easeOut',
            });
        } else {
            this.setAlpha(1);
        }
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

    _copy (s) {
        return String(s).replace(/ /g, '\u2002');
    }

    _wrap (str, maxWidth, style) {
        const words = String(str).split(/\s+/).filter(Boolean);
        if (!words.length) return '';
        const probe = this.scene.add.text(0, 0, '', {
            fontFamily: config.fonts.text,
            letterSpacing: 0.4,
            ...style,
        }).setVisible(false);
        const widthOf = (s) => {
            probe.setText(this._copy(s));
            return probe.width;
        };
        const lines = [];
        let line = '';
        words.forEach((word) => {
            const trial = line ? `${line} ${word}` : word;
            if (line && widthOf(trial) > maxWidth) {
                lines.push(line);
                line = word;
            } else {
                line = trial;
            }
        });
        if (line) lines.push(line);
        probe.destroy();
        return lines.join('\n');
    }

    _text (x, y, message, style) {
        return this.scene.add.text(x, y, this._copy(message), {
            fontFamily: config.fonts.text,
            letterSpacing: 0.4,
            fontStyle: WEIGHT.bold,
            ...style,
        });
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

    _drawChrome (m) {
        const backH = m.H * 0.078;
        const back = this.scene.add.image(m.x(0.078), m.y(0.058), HOME_TEXTURE_KEYS.backButton);
        this._fitW(back, backH * (back.width / back.height));
        back.setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setScale(back.scaleX * 1.04, back.scaleY * 1.04));
        back.on('pointerout', () => this._fitW(back, backH * (back.width / back.height)));
        back.on('pointerup', () => this._chooseAnother());
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
        const panelW = m.W * 0.88;
        const panelH = m.H * 0.84;
        const panelY = m.y(0.54);

        const panel = this.scene.add.image(m.cx, panelY, MS.pop);
        panel.setDisplaySize(panelW, panelH);
        this.add(panel);

        const padX = panelW * 0.032;
        const padTop = panelH * 0.068;
        const padBot = panelH * 0.05;
        const innerLeft = m.cx - panelW / 2 + padX;
        const innerTop = panelY - panelH / 2 + padTop;
        const innerW = panelW - padX * 2;
        const innerH = panelH - padTop - padBot;

        const leftW = innerW * 0.255;
        const colGap = innerW * 0.03;
        const rightW = innerW - leftW - colGap;
        const rightX = innerLeft + leftW + colGap;

        this._drawHero(m, innerLeft + leftW / 2, innerTop + innerH / 2, leftW, innerH, data);
        const actionH = m.H * 0.125;
        this._drawRight(m, rightX, innerTop, rightW, innerH - actionH, data);
        this._drawActions(m, rightX, innerTop + innerH - m.H * 0.008, rightW);
    }

    _drawHero (m, cx, cy, w, h, { title, missionOrder }) {
        const wrap = this.scene.add.container(cx, cy);
        this.add(wrap);

        const hero = this.scene.add.image(0, 0, K.popHero);
        hero.setDisplaySize(w, h);
        wrap.add(hero);

        const hw = hero.displayWidth;
        const hh = hero.displayHeight;
        const top = -hh / 2;

        const headerH = hh * 0.235;
        const ribbon = this.scene.add.image(0, top + hh * 0.012, K.yellowRibbon);
        this._fitW(ribbon, hw * 0.94);
        wrap.add(ribbon);

        wrap.add(this._text(0, ribbon.y, `Mission ${missionOrder || 1}`, {
            fontSize: `${m.fs(TYPE.ribbon)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5));

        const titleStyle = {
            fontSize: `${m.fs(TYPE.heroTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
            align: 'center',
            lineSpacing: m.fs(4),
        };
        const wrappedTitle = this._wrap(title || 'Shopping Mission', hw * 0.82, titleStyle);
        wrap.add(this._text(0, top + headerH * 0.62, wrappedTitle, titleStyle).setOrigin(0.5, 0.5));

        const artKey = HERO_ARTS[Math.max(0, (missionOrder || 1) - 1) % HERO_ARTS.length];
        const artTop = top + headerH + hh * 0.02;
        const artBot = hh / 2 - hh * 0.04;
        const artBoxH = Math.max(m.H * 0.22, artBot - artTop);
        const artY = artTop + artBoxH / 2;
        const art = this.scene.add.image(0, artY, artKey);
        this._fitContain(art, hw * 0.92, artBoxH);

        const oval = this.scene.add.graphics();
        oval.fillStyle(0x1A0833, 0.45);
        oval.fillEllipse(
            art.x + art.displayWidth * 0.03,
            art.y + art.displayHeight * 0.48,
            art.displayWidth * 0.72,
            art.displayHeight * 0.16,
        );
        wrap.add(oval);

        const drop = this.scene.add.image(art.x + hw * 0.022, art.y + hh * 0.02, artKey);
        drop.setDisplaySize(art.displayWidth, art.displayHeight);
        drop.setTint(0x14061F);
        drop.setAlpha(0.38);
        wrap.add(drop);
        wrap.add(art);
    }

    _drawRight (m, x, y, w, h, data) {
        let cy = y;

        cy = this._drawHeading(m, x, cy, w, 'Description');
        cy += m.H * 0.006;

        const desc = data.description?.trim()
            || 'Your family needs a few everyday groceries. Find everything on your list and make smart choices before time runs out!';
        const descStyle = { fontSize: `${m.fs(TYPE.body)}px`, fontStyle: WEIGHT.bold, color: C_BODY, lineSpacing: m.fs(4) };
        const descText = this._text(x, cy, this._wrap(desc, w * 0.98, descStyle), descStyle).setOrigin(0, 0);
        this.add(descText);
        cy += descText.height + m.H * 0.018;

        const statGap = w * 0.016;
        const statW = (w - statGap * 2) / 3;
        const statH = m.H * 0.155;
        this._drawStat(m, x, cy, statW, statH, {
            base: K.baseY,
            icon: K.coinIcon,
            label: 'COINS',
            value: String(data.budget ?? 0),
            sub: 'Shopping Budget',
            labelColor: C_COIN,
            valueColor: C_NAVY,
        });
        this._drawStat(m, x + statW + statGap, cy, statW, statH, {
            base: K.baseG,
            icon: K.leafIcon,
            label: 'ECO LIMIT',
            value: String(Math.round(data.ecoLimit ?? 100)),
            sub: 'Eco Impact',
            labelColor: C_ECO,
            valueColor: C_ECO,
        });
        this._drawStat(m, x + (statW + statGap) * 2, cy, statW, statH, {
            base: K.baseB,
            icon: K.timerIcon,
            label: 'TIMER',
            value: formatTime(data.timeLimit),
            sub: 'Complete before time ends.',
            labelColor: C_TIMER,
            valueColor: C_TIMER,
        });
        cy += statH + m.H * 0.022;

        cy = this._drawHeading(m, x, cy, w, 'Shopping List');
        cy += m.H * 0.01;

        const items = data.items.slice(0, 5);
        const listSlots = 5;
        const listGap = w * 0.012;
        const itemW = (w - listGap * (listSlots - 1)) / listSlots;
        const itemH = m.H * 0.198;
        items.forEach((item, i) => {
            this._drawListItem(m, x + i * (itemW + listGap), cy, itemW, itemH, item, i);
        });
        cy += itemH + m.H * 0.012;

        this._drawTips(m, x, cy, w, m.H * 0.088);
    }

    _drawHeading (m, x, y, w, label) {
        const heading = this._text(x, y, label, {
            fontSize: `${m.fs(TYPE.heading)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0);
        this.add(heading);

        const leaf = this.scene.add.image(
            heading.x + heading.width + m.W * 0.01,
            heading.y + heading.height * 0.52,
            K.leafIcon,
        );
        this._fitContain(leaf, m.W * 0.02, m.H * 0.03);
        this.add(leaf);

        return y + heading.height;
    }

    _drawStat (m, x, y, w, h, { base, icon, label, value, sub, labelColor, valueColor }) {
        const card = this.scene.add.image(x + w / 2, y + h / 2, base);
        card.setDisplaySize(w, h);
        this.add(card);

        const iconS = Math.min(w * 0.15, h * 0.24);
        const headerY = y + h * 0.22;
        const labelStyle = {
            fontSize: `${m.fs(TYPE.statLabel)}px`,
            fontStyle: WEIGHT.heavy,
            color: labelColor,
        };
        const probe = this._text(0, 0, label, labelStyle).setVisible(false);
        const gap = m.W * 0.008;
        const groupW = iconS + gap + probe.width;
        probe.destroy();

        const groupLeft = x + w / 2 - groupW / 2;
        const iconImg = this.scene.add.image(groupLeft + iconS / 2, headerY, icon);
        this._fitContain(iconImg, iconS, iconS);
        this.add(iconImg);

        this.add(this._text(groupLeft + iconS + gap, headerY, label, labelStyle).setOrigin(0, 0.5));

        this.add(this._text(x + w / 2, y + h * 0.54, value, {
            fontSize: `${m.fs(TYPE.statValue)}px`,
            fontStyle: WEIGHT.heavy,
            color: valueColor || C_NAVY,
        }).setOrigin(0.5, 0.5));

        const subStyle = {
            fontSize: `${m.fs(TYPE.statSub)}px`,
            fontStyle: WEIGHT.bold,
            color: C_BODY,
            align: 'center',
        };
        this.add(this._text(x + w / 2, y + h * 0.82, this._wrap(sub, w * 0.88, subStyle), subStyle).setOrigin(0.5, 0.5));
    }

    _drawListItem (m, x, y, w, h, item, index) {
        const r = Math.min(w, h) * 0.16;
        const g = this.scene.add.graphics();
        g.fillStyle(0x000000, 0.06);
        g.fillRoundedRect(x + 2, y + 3, w, h, r);
        g.fillStyle(0xFFF8EC, 1);
        g.fillRoundedRect(x, y, w, h, r);
        g.lineStyle(2.5, 0xE4D4B8, 1);
        g.strokeRoundedRect(x, y, w, h, r);
        this.add(g);

        const resolved = resolveItem(item.sItemKey);
        const name = item.sName
            || resolved?.label
            || (resolved?.key ? formatName(resolved.key) : formatName(item.sItemKey ?? 'Item'));

        const nameStyle = {
            fontSize: `${m.fs(TYPE.itemName)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_PURPLE,
            align: 'center',
        };
        this.add(this._text(x + w / 2, y + h * 0.07, this._wrap(name, w * 0.92, nameStyle), nameStyle).setOrigin(0.5, 0));

        const iconKey = itemIconKey(item, index);
        const productKey = resolved?.textureKey;
        const useProduct = productKey && this.scene.textures.exists(productKey);
        const img = this.scene.add.image(x + w / 2, y + h * 0.50, useProduct ? productKey : iconKey);
        this._fitContain(img, w * 0.70, h * 0.50);
        this.add(img);

        this.add(this._text(x + w / 2, y + h * 0.90, qtyLabel(item), {
            fontSize: `${m.fs(TYPE.itemQty)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_PURPLE,
        }).setOrigin(0.5, 0.5));
    }

    _drawTips (m, x, y, w, h) {
        const cap = Math.max(12, Math.min(36, Math.floor(h / 2) - 2));
        const bar = this.scene.add.nineslice(
            x + w / 2,
            y + h / 2,
            K.noteBase,
            undefined,
            w,
            h,
            cap,
            cap,
            cap,
            cap,
        );
        this.add(bar);

        this.add(this._text(x + w * 0.035, y + h * 0.34, 'Tips', {
            fontSize: `${m.fs(TYPE.tipsTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0.5));

        const tip = 'Check both price and Eco impact. The cheapest choice may not always be the smartest choice!';
        const tipStyle = { fontSize: `${m.fs(TYPE.tipsBody)}px`, fontStyle: WEIGHT.bold, color: C_BODY };
        this.add(this._text(x + w * 0.035, y + h * 0.70, this._wrap(tip, w * 0.93, tipStyle), tipStyle).setOrigin(0, 0.5));
    }

    _drawActions (m, x, bottom, w) {
        const btnH = m.H * 0.072;
        const otherW = w * 0.42;
        const startW = w * 0.36;
        const gap = w * 0.028;
        const pairW = otherW + gap + startW;
        const pairLeft = x + (w - pairW) / 2;
        const rowY = bottom - btnH * 0.82;
        const otherX = pairLeft + otherW / 2;
        const startX = pairLeft + otherW + gap + startW / 2;

        this._imageButton(m, otherX, rowY, otherW, btnH, K.blueButton, 'Choose Another Mission', {
            color: C_WHITE,
            onClick: () => this._chooseAnother(),
        });
        this._imageButton(m, startX, rowY, startW, btnH, HOME_TEXTURE_KEYS.greenButton, 'Start Shopping', {
            color: C_WHITE,
            icon: MS.basketIcon,
            onClick: () => this._start(),
        });

        const link = this._text(pairLeft + pairW / 2, rowY + btnH * 0.72, 'Enter Supermarket', {
            fontSize: `${m.fs(TYPE.link)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_LINK,
        }).setOrigin(0.5, 0);
        link.setInteractive({ useHandCursor: true });
        link.on('pointerup', () => this._start());
        this.add(link);
    }

    _imageButton (m, cx, cy, w, h, key, label, { color, icon, onClick }) {
        const img = this.scene.add.image(cx, cy, key);
        img.setDisplaySize(w, h);
        this.add(img);

        const labelX = icon ? cx - w * 0.04 : cx;
        const txt = this._text(labelX, cy, label, {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color,
        }).setOrigin(0.5, 0.5);
        this.add(txt);

        if (icon && this.scene.textures.exists(icon)) {
            const cart = this.scene.add.image(txt.x + txt.width / 2 + m.W * 0.012, cy, icon);
            this._fitContain(cart, w * 0.12, h * 0.48);
            this.add(cart);
        }

        const hit = this.scene.add.rectangle(cx, cy, w, h, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            img.setDisplaySize(w * 1.03, h * 1.03);
        });
        hit.on('pointerout', () => {
            img.setDisplaySize(w, h);
        });
        hit.on('pointerup', onClick);
        this.add(hit);
    }

    _start () {
        this.close({ restoreHome: false });
        this._onStart?.();
    }

    _chooseAnother () {
        this.close({ restoreHome: false });
        if (this._onChooseAnother) this._onChooseAnother();
        else this._onStart?.();
    }

    close ({ restoreHome = true } = {}) {
        if (restoreHome && this.scene._root) this.scene._root.setVisible(true);
        this.setVisible(false);
        this.setAlpha(1);
        this.setScale(1);
    }

    get isOpen () {
        return this.visible;
    }
}
