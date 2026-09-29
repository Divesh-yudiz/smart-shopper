import Phaser from 'phaser';
import { addCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS as MD } from '../../config/missionDescriptionAssets.js';
import { WELCOME_BACK_KEYS as WB } from '../../config/welcomeBackAssets.js';

const TYPE = Object.freeze({
    title: 52,
    subtitle: 22,
    missionTag: 16,
    missionName: 30,
    missionDesc: 18,
    progressTitle: 20,
    progressCount: 18,
    itemLabel: 14,
    statLabel: 16,
    statValue: 40,
    statSub: 16,
    button: 28,
    link: 18,
});

const C_WHITE = '#ffffff';
const C_NAVY = '#1A3A6B';
const C_TITLE = '#1E4A8C';
const C_MUTED = '#5A4A3A';
const C_BODY = '#4A3A2A';
const C_GREEN = '#1F8A3A';
const C_BLUE = '#2F6FE0';
const C_PURPLE = '#6B3CC9';
const C_COIN = '#C47A12';
const C_ECO = '#1B7A32';

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
});

const ITEM_ICON_FALLBACKS = [
    MD.bowlIcon,
    MD.breadIcon,
    MD.eggIcon,
    MD.milkIcon,
    MD.bananaIcon,
];

const DEFAULT_ITEMS = Object.freeze([
    Object.freeze({ name: 'Rice', done: true, textureKey: MD.bowlIcon }),
    Object.freeze({ name: 'Bread', done: true, textureKey: MD.breadIcon }),
    Object.freeze({ name: 'Eggs', done: true, textureKey: MD.eggIcon }),
    Object.freeze({ name: 'Milk', done: false, textureKey: MD.milkIcon }),
    Object.freeze({ name: 'Bananas', done: false, textureKey: MD.bananaIcon }),
]);

const DEFAULTS = Object.freeze({
    title: 'WELCOME BACK!',
    subtitle: 'You have an unfinished shopping mission. Pick up where you left off.',
    missionOrder: 1,
    missionName: 'FAMILY GROCERY BASKET',
    missionDescription: 'Buy the everyday groceries on your shopping list while staying within your Shop Coin and Eco limits.',
    itemsFound: 3,
    itemsTotal: 5,
    timeLeft: 136,
    timeMax: 240,
    coinsLeft: 34,
    coinsMax: 62,
    ecoLeft: 17,
    ecoMax: 32,
});

function formatClock (value) {
    if (typeof value === 'string') return value;
    const total = Math.max(0, Math.round(Number(value) || 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function itemIconKey (item, index) {
    if (item?.textureKey) return item.textureKey;
    const hay = `${item?.sItemKey ?? ''} ${item?.name ?? item?.label ?? ''}`.toLowerCase();
    if (/(rice|grain|bowl|cereal)/.test(hay)) return MD.bowlIcon;
    if (/(bread)/.test(hay)) return MD.breadIcon;
    if (/(egg)/.test(hay)) return MD.eggIcon;
    if (/(milk)/.test(hay)) return MD.milkIcon;
    if (/(banana)/.test(hay)) return MD.bananaIcon;
    return ITEM_ICON_FALLBACKS[index % ITEM_ICON_FALLBACKS.length];
}

/**
 * Welcome Back — resume unfinished mission (Artboard welcome-back).
 * No Back button — only info chrome + Resume Mission.
 */
export default class WelcomeBackPopup extends Phaser.GameObjects.Container {
    constructor (scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(630);
        this.setVisible(false);
    }

    get isOpen () {
        return this.visible;
    }

    open ({
        title = DEFAULTS.title,
        subtitle = DEFAULTS.subtitle,
        missionOrder = DEFAULTS.missionOrder,
        missionName = DEFAULTS.missionName,
        missionDescription = DEFAULTS.missionDescription,
        items = DEFAULT_ITEMS,
        itemsFound = DEFAULTS.itemsFound,
        itemsTotal = DEFAULTS.itemsTotal,
        timeLeft = DEFAULTS.timeLeft,
        timeMax = DEFAULTS.timeMax,
        coinsLeft = DEFAULTS.coinsLeft,
        coinsMax = DEFAULTS.coinsMax,
        ecoLeft = DEFAULTS.ecoLeft,
        ecoMax = DEFAULTS.ecoMax,
        onResume = () => { },
        onInfo = () => { },
        onClose = () => { },
    } = {}) {
        this._onResume = onResume;
        this._onInfo = onInfo;
        this._onClose = onClose;

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
            title,
            subtitle,
            missionOrder,
            missionName: String(missionName || DEFAULTS.missionName).toUpperCase(),
            missionDescription,
            items: (items?.length ? items : DEFAULT_ITEMS).map((it, i) => ({
                name: it.name ?? it.label ?? `Item ${i + 1}`,
                done: !!(it.done ?? ((it.collected ?? 0) >= (it.required ?? 1))),
                textureKey: itemIconKey(it, i),
            })),
            itemsFound,
            itemsTotal: Math.max(1, itemsTotal),
            timeLeft,
            timeMax: Math.max(1, timeMax),
            coinsLeft,
            coinsMax: Math.max(1, coinsMax),
            ecoLeft,
            ecoMax: Math.max(1, ecoMax),
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

    _shrinkToWidth (text, maxW) {
        let size = parseInt(text.style.fontSize, 10) || 16;
        while (text.width > maxW && size > 11) {
            size -= 1;
            text.setFontSize(size);
        }
        return text;
    }

    _slice (x, y, key, w, h, preferredCap = 48) {
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

    _round (cx, cy, w, h, fill, radius, stroke = null, strokeW = 2) {
        const g = this.scene.add.graphics();
        g.fillStyle(fill, 1);
        g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, radius);
        if (stroke != null) {
            g.lineStyle(strokeW, stroke, 1);
            g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, radius);
        }
        this.add(g);
        return g;
    }

    _drawChrome (m) {
        // No Back button on welcome-back / home chrome.
        const infoS = m.H * 0.074;
        const info = this.scene.add.image(m.x(0.948), m.y(0.058), HOME_TEXTURE_KEYS.infoButton);
        info.setDisplaySize(infoS, infoS);
        info.setInteractive({ useHandCursor: true });
        info.on('pointerover', () => info.setDisplaySize(infoS * 1.06, infoS * 1.06));
        info.on('pointerout', () => info.setDisplaySize(infoS, infoS));
        info.on('pointerup', () => this._onInfo?.());
        this.add(info);
    }

    _drawPanel (m, data) {
        const panelW = m.W * 0.78;
        const panelH = m.H * 0.88;
        const panelY = m.cy + m.H * 0.02;
        const panel = this._slice(m.cx, panelY, MS.pop, panelW, panelH, 90);
        this.add(panel);

        const panelTop = panelY - panelH / 2;
        const padX = panelW * 0.045;
        const innerW = panelW - padX * 2;

        let y = panelTop + panelH * 0.055;

        // Title with leaf + sparkle accents
        this._drawTitleDecor(m, m.cx, y, data.title);
        y += m.H * 0.055;

        this.add(this._text(m.cx, y, data.subtitle, {
            fontSize: `${m.fs(TYPE.subtitle)}px`,
            color: C_MUTED,
        }).setOrigin(0.5, 0));
        y += m.H * 0.042;

        // Mission banner card
        const missionH = m.H * 0.20;
        this._drawMissionBlock(m, m.cx, y + missionH / 2, innerW, missionH, data);
        y += missionH + m.H * 0.022;

        // Shopping progress
        const progressH = m.H * 0.20;
        this._drawProgress(m, m.cx, y + progressH / 2, innerW, progressH, data);
        y += progressH + m.H * 0.018;

        // Stats row
        const statsH = m.H * 0.115;
        this._drawStats(m, m.cx, y + statsH / 2, innerW, statsH, data);
        y += statsH + m.H * 0.028;

        // Resume button
        const btnH = m.H * 0.078;
        const btnW = Math.min(innerW * 0.42, m.W * 0.28);
        this._drawResumeButton(m, m.cx, y + btnH / 2, btnW, btnH);
        y += btnH + m.H * 0.018;

        this.add(this._text(m.cx, y, 'Continue from your point', {
            fontSize: `${m.fs(TYPE.link)}px`,
            color: C_BLUE,
        }).setOrigin(0.5, 0));
        const link = this.list[this.list.length - 1];
        const ul = this.scene.add.graphics();
        ul.lineStyle(Math.max(2, Math.round(2 * m.s)), 0x2F6FE0, 1);
        const linkW = Math.min(link.width, innerW * 0.5);
        ul.lineBetween(m.cx - linkW / 2, y + link.height + 2, m.cx + linkW / 2, y + link.height + 2);
        this.add(ul);
        link.setInteractive({ useHandCursor: true });
        link.on('pointerup', () => this._close(() => this._onResume?.()));
    }

    _drawTitleDecor (m, cx, y, title) {
        const titleTxt = this._text(cx, y, title, {
            fontSize: `${m.fs(TYPE.title)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_TITLE,
        }).setOrigin(0.5, 0.5);
        this.add(titleTxt);

        const leafS = m.H * 0.028;
        const gap = titleTxt.width / 2 + m.W * 0.018;
        [-1, 1].forEach((side) => {
            if (this.scene.textures.exists(MD.leafIcon)) {
                const leaf = this.scene.add.image(cx + side * gap, y, MD.leafIcon);
                leaf.setDisplaySize(leafS, leafS);
                if (side < 0) leaf.setFlipX(true);
                this.add(leaf);
            }
            const spark = this.scene.add.image(
                cx + side * (gap + m.W * 0.028),
                y - m.H * 0.012,
                MS.starFilled,
            );
            spark.setDisplaySize(leafS * 0.7, leafS * 0.7);
            spark.setTint(0xF0A020);
            this.add(spark);
        });
    }

    _drawMissionBlock (m, cx, cy, w, h, data) {
        this._round(cx, cy, w, h, 0xF5EDE0, Math.min(w, h) * 0.12, 0xE8D8C4, 2);

        const artS = h * 0.72;
        if (this.scene.textures.exists(MS.basketArt)) {
            const left = this.scene.add.image(cx - w * 0.34, cy - h * 0.04, MS.basketArt);
            this._fitContain(left, artS, artS);
            this.add(left);
        }
        if (this.scene.textures.exists(MS.packArt)) {
            const right = this.scene.add.image(cx + w * 0.34, cy - h * 0.04, MS.packArt);
            this._fitContain(right, artS, artS);
            this.add(right);
        }

        const tag = this.scene.add.image(cx, cy - h * 0.32, MS.missionTag);
        this._fitW(tag, w * 0.16);
        this.add(tag);
        this.add(this._text(tag.x, tag.y, `MISSION ${data.missionOrder}`, {
            fontSize: `${m.fs(TYPE.missionTag)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const ribbon = this.scene.add.image(cx, cy - h * 0.06, WB.ribbon);
        this._fitW(ribbon, w * 0.52);
        this.add(ribbon);
        const name = this._text(ribbon.x, ribbon.y - ribbon.displayHeight * 0.02, data.missionName, {
            fontSize: `${m.fs(TYPE.missionName)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(name, ribbon.displayWidth * 0.78);
        this.add(name);

        const desc = this._text(
            cx,
            cy + h * 0.28,
            this._wrap(data.missionDescription, w * 0.72, { fontSize: `${m.fs(TYPE.missionDesc)}px` }),
            {
                fontSize: `${m.fs(TYPE.missionDesc)}px`,
                color: C_BODY,
                align: 'center',
                lineSpacing: m.fs(2),
            },
        ).setOrigin(0.5, 0);
        this.add(desc);
    }

    _drawProgress (m, cx, cy, w, h, data) {
        this._round(cx, cy, w, h, 0xFFFFFF, Math.min(w, h) * 0.1, 0xD8E0F0, 2);

        const top = cy - h / 2;
        const padX = w * 0.035;
        const left = cx - w / 2 + padX;
        const right = cx + w / 2 - padX;

        const headY = top + h * 0.18;
        if (this.scene.textures.exists(MD.leafIcon)) {
            const leaf = this.scene.add.image(left + m.W * 0.01, headY, MD.leafIcon);
            leaf.setDisplaySize(m.H * 0.028, m.H * 0.028);
            this.add(leaf);
        }
        this.add(this._text(left + m.W * 0.028, headY, 'SHOPPING PROGRESS', {
            fontSize: `${m.fs(TYPE.progressTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_BLUE,
        }).setOrigin(0, 0.5));

        this.add(this._text(right, headY, `${data.itemsFound}/${data.itemsTotal} Items Found`, {
            fontSize: `${m.fs(TYPE.progressCount)}px`,
            fontStyle: WEIGHT.bold,
            color: C_NAVY,
        }).setOrigin(1, 0.5));

        // Progress bar
        const barW = w - padX * 2;
        const barH = Math.max(10, m.H * 0.016);
        const barY = headY + h * 0.22;
        const base = this._slice(cx, barY, WB.loadingBase, barW, barH, 12);
        this.add(base);
        const pct = Phaser.Math.Clamp(data.itemsFound / data.itemsTotal, 0, 1);
        if (pct > 0.02) {
            const fillW = Math.max(barH, barW * pct);
            const fill = this._slice(
                cx - barW / 2 + fillW / 2,
                barY,
                WB.loadingBar,
                fillW,
                barH * 0.85,
                10,
            );
            this.add(fill);
        }

        // Item tiles
        const tiles = data.items.slice(0, 6);
        const tileGap = m.W * 0.012;
        const tileW = Math.min(
            (w - padX * 2 - tileGap * Math.max(0, tiles.length - 1)) / Math.max(1, tiles.length),
            m.W * 0.11,
        );
        const tileH = h * 0.42;
        const tileY = cy + h * 0.22;
        const totalW = tiles.length * tileW + (tiles.length - 1) * tileGap;
        tiles.forEach((item, i) => {
            const x = cx - totalW / 2 + tileW / 2 + i * (tileW + tileGap);
            this._drawItemTile(m, x, tileY, tileW, tileH, item);
        });
    }

    _drawItemTile (m, cx, cy, w, h, item) {
        const fill = item.done ? 0xE8F6E4 : 0xF7F1E6;
        const stroke = item.done ? 0x8BC47A : 0xE0D4C4;
        this._round(cx, cy, w, h, fill, Math.min(w, h) * 0.18, stroke, 2);

        const checkS = Math.min(w, h) * 0.28;
        const checkX = cx - w / 2 + checkS * 0.7;
        const checkY = cy - h / 2 + checkS * 0.7;
        if (item.done && this.scene.textures.exists(WB.checkIcon)) {
            const check = this.scene.add.image(checkX, checkY, WB.checkIcon);
            check.setDisplaySize(checkS, checkS);
            this.add(check);
        } else {
            const g = this.scene.add.graphics();
            g.lineStyle(Math.max(2, Math.round(2 * m.s)), item.done ? 0x2E9A3E : 0xC8C0B4, 1);
            g.strokeCircle(checkX, checkY, checkS * 0.35);
            this.add(g);
        }

        const iconKey = item.textureKey;
        if (iconKey && this.scene.textures.exists(iconKey)) {
            const icon = this.scene.add.image(cx, cy + h * 0.02, iconKey);
            this._fitContain(icon, w * 0.55, h * 0.48);
            this.add(icon);
        }

        const label = this._text(cx, cy + h * 0.36, item.name, {
            fontSize: `${m.fs(TYPE.itemLabel)}px`,
            fontStyle: WEIGHT.bold,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(label, w * 0.88);
        this.add(label);
    }

    _drawStats (m, cx, cy, w, h, data) {
        const gap = m.W * 0.014;
        const cardW = (w - gap * 2) / 3;
        const specs = [
            {
                key: WB.cardPurple,
                icon: MD.timerIcon,
                label: 'TIME LEFT',
                value: formatClock(data.timeLeft),
                sub: `of ${formatClock(data.timeMax)}`,
                labelColor: C_PURPLE,
                valueColor: C_PURPLE,
            },
            {
                key: WB.cardGold,
                icon: MD.coinIcon,
                label: 'COINS LEFT',
                value: String(Math.max(0, Math.round(data.coinsLeft))),
                sub: `started with ${Math.max(0, Math.round(data.coinsMax))}`,
                labelColor: C_COIN,
                valueColor: C_COIN,
            },
            {
                key: WB.cardGreen,
                icon: MD.leafIcon,
                label: 'ECO METER AT',
                value: String(Math.max(0, Math.round(data.ecoLeft))),
                sub: `started at ${Math.max(0, Math.round(data.ecoMax))}`,
                labelColor: C_ECO,
                valueColor: C_ECO,
            },
        ];
        specs.forEach((spec, i) => {
            const x = cx - w / 2 + cardW / 2 + i * (cardW + gap);
            this._drawStatCard(m, x, cy, cardW, h, spec);
        });
    }

    _drawStatCard (m, cx, cy, w, h, spec) {
        const card = this._slice(cx, cy, spec.key, w, h, 28);
        this.add(card);

        const iconS = h * 0.42;
        const iconX = cx - w * 0.32;
        if (spec.icon && this.scene.textures.exists(spec.icon)) {
            const icon = this.scene.add.image(iconX, cy, spec.icon);
            this._fitContain(icon, iconS, iconS);
            this.add(icon);
        }

        const textX = cx + w * 0.08;
        this.add(this._text(textX, cy - h * 0.28, spec.label, {
            fontSize: `${m.fs(TYPE.statLabel)}px`,
            fontStyle: WEIGHT.heavy,
            color: spec.labelColor,
        }).setOrigin(0.5, 0.5));

        const value = this._text(textX, cy + h * 0.02, spec.value, {
            fontSize: `${m.fs(TYPE.statValue)}px`,
            fontStyle: WEIGHT.heavy,
            color: spec.valueColor,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(value, w * 0.52);
        this.add(value);

        this.add(this._text(textX, cy + h * 0.32, spec.sub, {
            fontSize: `${m.fs(TYPE.statSub)}px`,
            color: C_MUTED,
        }).setOrigin(0.5, 0.5));
    }

    _drawResumeButton (m, cx, cy, w, h) {
        const btn = this.scene.add.image(cx, cy, HOME_TEXTURE_KEYS.greenButton);
        this._fitContain(btn, w, h);
        const displayW = btn.displayWidth;
        const displayH = btn.displayHeight;
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setScale(btn.scaleX * 1.04, btn.scaleY * 1.04));
        btn.on('pointerout', () => {
            btn.setScale(1);
            this._fitContain(btn, w, h);
        });
        btn.on('pointerup', () => this._close(() => this._onResume?.()));
        this.add(btn);

        const label = this._text(cx, cy, 'Resume Mission', {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        this.add(label);

        // Play triangle
        const tri = this.scene.add.triangle(
            0, 0,
            0, -displayH * 0.16,
            0, displayH * 0.16,
            displayH * 0.22, 0,
            0xffffff,
        );
        const gap = m.W * 0.008;
        this._shrinkToWidth(label, displayW * 0.7);
        const total = tri.width + gap + label.width;
        tri.x = cx - total / 2 + tri.width / 2;
        tri.y = cy;
        label.x = tri.x + tri.width / 2 + gap + label.width / 2;
        this.add(tri);
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
                if (this.scene._root) this.scene._root.setVisible(true);
                this._onClose?.();
                afterClose?.();
            },
        });
    }

    close () {
        this._close();
    }
}
