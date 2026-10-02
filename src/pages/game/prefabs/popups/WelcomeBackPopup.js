import Phaser from 'phaser';
import { addCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS as MD } from '../../config/missionDescriptionAssets.js';
import { WELCOME_BACK_KEYS as WB } from '../../config/welcomeBackAssets.js';

const TYPE = Object.freeze({
    title: 52,
    subtitle: 22,
    missionTag: 20,
    missionName: 30,
    missionDesc: 21,
    progressTitle: 24,
    progressCount: 34,
    itemLabel: 22,
    statLabel: 22,
    statValue: 48,
    statSub: 20,
    button: 36,
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

function formatClock(value) {
    if (typeof value === 'string') return value;
    const total = Math.max(0, Math.round(Number(value) || 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function itemIconKey(item, index) {
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
 */
export default class WelcomeBackPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(630);
        this.setVisible(false);
    }

    get isOpen() {
        return this.visible;
    }

    open({
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
        onNewMission = () => { },
        onClose = () => { },
    } = {}) {
        this._onResume = onResume;
        this._onNewMission = onNewMission;
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

    _shrinkToWidth(text, maxW) {
        let size = parseInt(text.style.fontSize, 10) || 16;
        while (text.width > maxW && size > 11) {
            size -= 1;
            text.setFontSize(size);
        }
        return text;
    }

    _slice(x, y, key, w, h, preferredCap = 48) {
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

    _round(cx, cy, w, h, fill, radius, stroke = null, strokeW = 2) {
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

    _drawPanel(m, data) {
        const panelW = m.W * 0.78;
        const panelH = m.H * 0.93;
        // Keep the previous bottom edge so the taller progress card does not push the buttons off screen.
        const panelY = m.cy + m.H * 0.46 - panelH / 2;
        const panel = this._slice(m.cx, panelY, MS.pop, panelW, panelH, 90);
        this.add(panel);

        const panelTop = panelY - panelH / 2;
        const padX = panelW * 0.045;
        const innerW = panelW - padX * 2;

        let y = panelTop + panelH * 0.055;

        // Title with leaf + sparkle accents
        this._drawTitleDecor(m, m.cx, y, data.title);
        y += m.H * 0.030;

        this.add(this._text(m.cx, y, data.subtitle, {
            fontSize: `${m.fs(TYPE.subtitle)}px`,
            color: C_MUTED,
        }).setOrigin(0.5, 0));
        y += m.H * 0.042;

        // Mission banner card — a little taller so the description can sit below the ribbon.
        const missionH = m.H * 0.268;
        this._drawMissionBlock(m, m.cx, y + missionH / 2, innerW, missionH, data);
        y += missionH + m.H * 0.006;

        // Shopping progress and stats sit higher so the buttons have room above them.
        const progressH = m.H * 0.26;
        this._drawProgress(m, m.cx, y + progressH / 2, innerW, progressH, data);
        y += progressH + m.H * 0.008;

        // Stats row
        const statsH = m.H * 0.115;
        this._drawStats(m, m.cx, y + statsH / 2, innerW, statsH, data);
        y += statsH + m.H * 0.03;

        // Action buttons — Start New Mission (blue) + Resume Mission (green).
        const btnH = m.H * 0.072;
        const panelBot = panelY + panelH / 2;
        const btnCy = Math.min(y + btnH / 2, panelBot - btnH / 2 - m.H * 0.042);
        this._drawActionButtons(m, m.cx, btnCy, innerW, btnH);
    }

    _drawTitleDecor(m, cx, y, title) {
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

    _drawMissionBlock(m, cx, cy, w, h, data) {
        this._round(cx, cy, w, h, 0xF5EDE0, Math.min(w, h) * 0.12, 0xE8D8C4, 2);

        const top = cy - h / 2;
        const padTop = h * 0.055;

        // Keep the side art beside the ribbon; extra card height is for the description below.
        const artS = m.H * 0.19;
        const artY = top + m.H * 0.10;
        if (this.scene.textures.exists(MS.basketArt)) {
            const left = this.scene.add.image(cx - w * 0.34, artY, MS.basketArt);
            this._fitContain(left, artS, artS);
            this.add(left);
        }
        if (this.scene.textures.exists(MS.packArt)) {
            const right = this.scene.add.image(cx + w * 0.34, artY, MS.packArt);
            this._fitContain(right, artS, artS);
            this.add(right);
        }

        // Purple pill
        const tagLabel = this._text(0, 0, `MISSION ${data.missionOrder}`, {
            fontSize: `${m.fs(TYPE.missionTag)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        const tagPadX = m.W * 0.014;
        const tagPadY = m.H * 0.008;
        const tagW = tagLabel.width + tagPadX * 2;
        const tagH = tagLabel.height + tagPadY * 2;
        const tagY = top + padTop + tagH / 2;
        this._round(cx, tagY, tagW, tagH, 0x8B4FD9, tagH * 0.5, 0x6A35B0, Math.max(1, Math.round(1.5 * m.s)));
        tagLabel.setPosition(cx, tagY);
        this.add(tagLabel);

        // Ribbon — asset has transparent padding; fractions map to the visible purple band.
        const ribbon = this.scene.add.image(cx, 0, WB.ribbon);
        this._fitW(ribbon, w * 0.52);
        const bandTopFrac = 0.30;
        const gapTagToRibbon = h * 0.085;
        const tagBottom = tagY + tagH / 2;
        ribbon.y = tagBottom + gapTagToRibbon - ribbon.displayHeight * (bandTopFrac - 0.5);
        this.add(ribbon);
        const name = this._text(ribbon.x, ribbon.y - ribbon.displayHeight * 0.02, data.missionName, {
            fontSize: `${m.fs(TYPE.missionName)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(name, ribbon.displayWidth * 0.78);
        this.add(name);

        // Description sits under the ribbon, with a small gap above the card bottom.
        const descMaxW = ribbon.displayWidth * 0.78;
        const descStyle = {
            fontSize: `${m.fs(TYPE.missionDesc)}px`,
            color: C_BODY,
            align: 'center',
            lineSpacing: m.fs(2),
        };
        const desc = this._text(
            cx,
            0,
            this._wrap(data.missionDescription, descMaxW, { fontSize: descStyle.fontSize }),
            descStyle,
        ).setOrigin(0.5, 0);
        const bottomPad = m.H * 0.022;
        const cardBottom = cy + h / 2;
        desc.y = cardBottom - bottomPad - desc.height;
        this.add(desc);
    }

    _drawProgress(m, cx, cy, w, h, data) {
        this._round(cx, cy, w, h, 0xFFFFFF, Math.min(w, h) * 0.1, 0xD8E0F0, 2);

        const top = cy - h / 2;
        const padX = w * 0.035;
        const left = cx - w / 2 + padX;
        const innerW = w - padX * 2;

        // Progress bar = 60% width (left), items-found count = remaining 40% (right).
        const barW = innerW * 0.60;
        const countW = innerW * 0.40;
        const barCx = left + barW / 2;
        const countCx = left + barW + countW / 2;

        const headY = top + h * 0.16;
        // Title centered over the progress bar (not the full container).
        const titleTxt = this._text(barCx, headY, 'SHOPPING PROGRESS', {
            fontSize: `${m.fs(TYPE.progressTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_BLUE,
        }).setOrigin(0.5, 0.5);
        this.add(titleTxt);

        const leafS = m.H * 0.028;
        const leafGap = titleTxt.width / 2 + m.W * 0.012;
        if (this.scene.textures.exists(MD.leafIcon)) {
            [-1, 1].forEach((side) => {
                const leaf = this.scene.add.image(barCx + side * leafGap, headY, MD.leafIcon);
                leaf.setDisplaySize(leafS, leafS);
                if (side < 0) leaf.setFlipX(true);
                this.add(leaf);
            });
        }

        // Clear gap under the (larger) title so they never overlap.
        const barH = Math.max(14, m.H * 0.024);
        const barY = headY + titleTxt.height / 2 + h * 0.12 + barH / 2;
        // Cap ≈ half height keeps pill ends round (avoids horizontal stretch).
        const barCap = Math.max(6, Math.floor(barH / 2));

        const base = this._slice(barCx, barY, WB.loadingBase, barW, barH, barCap);
        this.add(base);
        const pct = Phaser.Math.Clamp(data.itemsFound / data.itemsTotal, 0, 1);
        if (pct > 0.02) {
            const fillH = barH * 0.72;
            const fillInset = (barH - fillH) / 2;
            const fillW = Math.max(fillH, (barW - fillInset * 2) * pct);
            const fill = this._slice(
                barCx - barW / 2 + fillInset + fillW / 2,
                barY,
                WB.loadingBar,
                fillW,
                fillH,
                Math.max(5, Math.floor(fillH / 2)),
            );
            this.add(fill);
        }

        const countLabel = this._text(
            countCx,
            headY + h * 0.09,
            `${data.itemsFound}/${data.itemsTotal} Items Found`,
            {
                fontSize: `${m.fs(TYPE.progressCount)}px`,
                fontStyle: WEIGHT.bold,
                color: C_NAVY,
            },
        ).setOrigin(0.5, 0.5);
        this._shrinkToWidth(countLabel, countW * 0.92);
        this.add(countLabel);

        // Item tiles — flex width to fit 1–7 items in one row.
        const MAX_TILES = 7;
        const tiles = (data.items || []).slice(0, MAX_TILES);
        const n = Math.max(1, tiles.length);
        const tileGap = m.W * (n >= 7 ? 0.006 : n >= 6 ? 0.008 : 0.010);
        const tileW = (innerW - tileGap * (n - 1)) / n;
        const gapBelowBar = m.H * 0.022;
        const tileTop = barY + barH / 2 + gapBelowBar;
        const bottomPad = h * 0.05;
        let tileH = Math.min(h * 0.46, tileW * 1.2);
        const maxTileH = (cy + h / 2 - bottomPad) - tileTop;
        if (tileH > maxTileH) tileH = Math.max(h * 0.28, maxTileH);
        const tileY = tileTop + tileH / 2;
        const totalW = n * tileW + (n - 1) * tileGap;
        tiles.forEach((item, i) => {
            const x = cx - totalW / 2 + tileW / 2 + i * (tileW + tileGap);
            this._drawItemTile(m, x, tileY, tileW, tileH, item);
        });
    }

    _drawItemTile(m, cx, cy, w, h, item) {
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

        const label = this._text(cx, cy - h * 0.32, item.name, {
            fontSize: `${m.fs(TYPE.itemLabel)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(label, w * 0.78);
        this.add(label);

        const iconKey = item.textureKey;
        if (iconKey && this.scene.textures.exists(iconKey)) {
            const icon = this.scene.add.image(cx, cy + h * 0.12, iconKey);
            this._fitContain(icon, w * 0.72, h * 0.55);
            this.add(icon);
        }
    }

    _drawStats(m, cx, cy, w, h, data) {
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

    _drawStatCard(m, cx, cy, w, h, spec) {
        const card = this._slice(cx, cy, spec.key, w, h, 28);
        this.add(card);

        const iconS = h * 0.68;
        const iconX = cx - w * 0.30;
        if (spec.icon && this.scene.textures.exists(spec.icon)) {
            const icon = this.scene.add.image(iconX, cy, spec.icon);
            this._fitContain(icon, iconS, iconS);
            this.add(icon);
        }

        const textX = cx + w * 0.08;
        const textMaxW = w * 0.5;
        const label = this._text(textX, cy - h * 0.30, spec.label, {
            fontSize: `${m.fs(TYPE.statLabel)}px`,
            fontStyle: WEIGHT.heavy,
            color: spec.labelColor,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(label, textMaxW);
        this.add(label);

        const value = this._text(textX, cy + h * 0.02, spec.value, {
            fontSize: `${m.fs(TYPE.statValue)}px`,
            fontStyle: WEIGHT.heavy,
            color: spec.valueColor,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(value, textMaxW);
        this.add(value);

        const sub = this._text(textX, cy + h * 0.34, spec.sub, {
            fontSize: `${m.fs(TYPE.statSub)}px`,
            color: C_MUTED,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(sub, textMaxW);
        this.add(sub);
    }

    _drawActionButtons(m, cx, cy, innerW, btnH) {
        const gap = m.W * 0.018;
        const blueSrc = this.scene.textures.get(MD.blueButton)?.getSourceImage?.();
        const greenSrc = this.scene.textures.get(HOME_TEXTURE_KEYS.greenButton)?.getSourceImage?.();
        const blueRatio = (blueSrc?.width ?? 565) / Math.max(1, blueSrc?.height ?? 123);
        const greenRatio = (greenSrc?.width ?? 568) / Math.max(1, greenSrc?.height ?? 128);
        let newW = btnH * blueRatio;
        let resumeW = btnH * greenRatio;
        const maxPair = innerW * 0.92;
        if (newW + gap + resumeW > maxPair) {
            const scale = maxPair / (newW + gap + resumeW);
            newW *= scale;
            resumeW *= scale;
        }
        const pairW = newW + gap + resumeW;
        const leftX = cx - pairW / 2 + newW / 2;
        const rightX = cx + pairW / 2 - resumeW / 2;

        this._pillButton(m, leftX, cy, newW, btnH, MD.blueButton, 'Start New Mission', () => {
            this._close(() => this._onNewMission?.());
        });
        this._pillButton(m, rightX, cy, resumeW, btnH, HOME_TEXTURE_KEYS.greenButton, 'Resume Mission', () => {
            this._close(() => this._onResume?.());
        });
    }

    _pillButton(m, cx, cy, w, h, key, label, onClick) {
        const wrap = this.scene.add.container(cx, cy);
        this.add(wrap);

        const btn = this.scene.add.image(0, 0, key);
        this._fitContain(btn, w, h);
        const displayW = btn.displayWidth;
        btn.setInteractive({ useHandCursor: true });
        wrap.add(btn);

        const txt = this._text(0, -h * 0.06, label, {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(txt, displayW * 0.82);
        wrap.add(txt);

        btn.on('pointerover', () => wrap.setScale(1.05));
        btn.on('pointerout', () => wrap.setScale(1));
        btn.on('pointerup', onClick);
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
                if (this.scene._root) this.scene._root.setVisible(true);
                this._onClose?.();
                afterClose?.();
            },
        });
    }

    close() {
        this._close();
    }
}
