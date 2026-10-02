import Phaser from 'phaser';
import { resolveItem } from '../../../../utils/gameApi.js';
import { copyCause, addCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS as K } from '../../config/missionDescriptionAssets.js';

/** Artboard 3 type scale at 1920×1080. */
const TYPE = Object.freeze({
    ribbon: 26,
    heroTitle: 34,
    heading: 38,
    body: 22,
    statLabel: 22,
    statValue: 58,
    statSub: 18,
    itemName: 24,
    itemQty: 19,
    tipsTitle: 22,
    tipsBody: 18,
    button: 26,
    link: 17,
});

const C_BODY = '#1A1408';
const C_NAVY = '#0E1B5C';
const C_WHITE = '#ffffff';
const C_RIBBON = '#102040';
const C_COIN = '#8B5A12';
const C_COIN_VALUE = '#3D2208';
const C_COIN_SUB = '#5A3A18';
const C_ECO = '#1B6B28';
const C_ECO_VALUE = '#0E4A18';
const C_ECO_SUB = '#1A5A22';
const C_TIMER = '#1A4A9A';
const C_TIMER_VALUE = '#0A2870';
const C_TIMER_SUB = '#1A3A80';
const C_LINK = '#1B8A4A';
const C_PURPLE = '#6B21A8';
const C_TIP_BODY = '#0A0A0A';

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

function formatName(key) {
    return String(key ?? 'Item')
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function qtyLabel(item) {
    const q = item.nQuantity ?? 1;
    const hay = `${item.sItemKey ?? ''} ${item.sName ?? ''}`.toLowerCase();
    if (/(banana|carrot|potato|onion|tomato|piece|apple|orange)/.test(hay)) {
        return `${q} ${q === 1 ? 'Piece' : 'Pieces'}`;
    }
    return `${q} Pack`;
}

function itemIconKey(item, index) {
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

/** Stable Phaser key for a shopping-list image URL. */
function listImageTextureKey(url) {
    let hash = 2166136261;
    const s = String(url);
    for (let i = 0; i < s.length; i += 1) {
        hash ^= s.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return `ms_list_${(hash >>> 0).toString(36)}`;
}

/**
 * Mission description brief — Artboard 3 layout.
 * Positions and sizes are fractions of the live game width / height.
 */
export default class MissionPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(620);
        this.setVisible(false);
    }

    open({
        shoppingList = [],
        title = '',
        description = '',
        missionOrder = 0,
        missionLabel = null,
        budget = 0,
        timeLimit = 0,
        ecoLimit = 100,
        onStart = () => { },
        onChooseAnother = null,
        animate = true,
        animateShoppingList = false,
        deferShoppingList = false,
    } = {}) {
        this._onStart = onStart;
        this._onChooseAnother = onChooseAnother;
        this._listLayout = null;
        this._listItems = null;

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
            items: deferShoppingList ? [] : shoppingList.filter(Boolean),
            title,
            description,
            missionOrder,
            missionLabel,
            budget,
            timeLimit,
            ecoLimit,
            animateShoppingList,
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

    _copy(s) {
        return copyCause(s);
    }

    _wrap(str, maxWidth, style) {
        return wrapCause(this.scene, str, maxWidth, style);
    }

    /** Shrink until the label stays within maxLines, so it doesn't cover the product. */
    _fitWrapped(str, maxWidth, style, maxLines) {
        let size = parseInt(style.fontSize, 10) || 16;
        let text = this._wrap(str, maxWidth, { ...style, fontSize: `${size}px` });
        while (text.split('\n').length > maxLines && size > 13) {
            size -= 1;
            text = this._wrap(str, maxWidth, { ...style, fontSize: `${size}px` });
        }
        return { text, fontSize: `${size}px` };
    }

    _text(x, y, message, style) {
        return addCauseText(this.scene, x, y, message, { fontStyle: WEIGHT.bold, ...style });
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

    _drawChrome(m) {
        const backH = m.H * 0.078;
        const back = this.scene.add.image(m.x(0.078), m.y(0.058), HOME_TEXTURE_KEYS.backButton);
        this._fitW(back, backH * (back.width / back.height));
        back.setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setScale(back.scaleX * 1.04, back.scaleY * 1.04));
        back.on('pointerout', () => this._fitW(back, backH * (back.width / back.height)));
        back.on('pointerup', () => this._chooseAnother());
        this.add(back);

    }

    _drawPanel(m, data) {
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
        const actionH = m.H * 0.12;
        this._drawRight(m, rightX, innerTop, rightW, innerH - actionH, data);
        this._drawActions(m, rightX, innerTop + innerH - actionH, rightW, actionH);
    }

    _drawHero(m, cx, cy, w, h, { title, missionOrder, missionLabel }) {
        const wrap = this.scene.add.container(cx, cy);
        this.add(wrap);

        const hero = this.scene.add.image(0, 0, K.popHero);
        hero.setDisplaySize(w, h);
        wrap.add(hero);

        const hw = hero.displayWidth;
        const hh = hero.displayHeight;
        const top = -hh / 2;

        const headerH = hh * 0.235;
        const ribbon = this.scene.add.image(0, top, K.yellowRibbon);
        this._fitW(ribbon, hw * 0.94);
        // Sit on the purple header edge with a clear overlap (not floating above).
        ribbon.y = top + ribbon.displayHeight * 0.1;
        wrap.add(ribbon);

        // Ribbon art folds are slightly asymmetric — nudge text left to look centered.
        wrap.add(this._text(
            ribbon.x - ribbon.displayWidth * 0.012,
            ribbon.y - ribbon.displayHeight * 0.14,
            missionLabel || `Mission ${missionOrder || 1}`,
            {
                fontSize: `${m.fs(TYPE.ribbon)}px`,
                fontStyle: WEIGHT.heavy,
                color: C_RIBBON,
            },
        ).setOrigin(0.5, 0.5));

        const titleStyle = {
            fontSize: `${m.fs(TYPE.heroTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
            align: 'center',
            lineSpacing: m.fs(4),
        };
        const wrappedTitle = this._wrap(title || 'Shopping Mission', hw * 0.82, titleStyle);
        wrap.add(this._text(0, top + headerH * 0.52, wrappedTitle, titleStyle).setOrigin(0.5, 0.5));

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

    _drawRight(m, x, y, w, h, data) {
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
            valueColor: C_COIN_VALUE,
            subColor: C_COIN_SUB,
        });
        this._drawStat(m, x + statW + statGap, cy, statW, statH, {
            base: K.baseG,
            icon: K.leafIcon,
            label: 'ECO LIMIT',
            value: String(Math.round(data.ecoLimit ?? 100)),
            sub: 'Eco Impact',
            labelColor: C_ECO,
            valueColor: C_ECO_VALUE,
            subColor: C_ECO_SUB,
        });
        this._drawStat(m, x + (statW + statGap) * 2, cy, statW, statH, {
            base: K.baseB,
            icon: K.timerIcon,
            label: 'TIMER',
            value: formatTime(data.timeLimit),
            sub: 'Complete before time ends.',
            labelColor: C_TIMER,
            valueColor: C_TIMER_VALUE,
            subColor: C_TIMER_SUB,
        });
        cy += statH + m.H * 0.022;

        cy = this._drawHeading(m, x, cy, w, 'Shopping List');
        cy += m.H * 0.01;

        const tipsH = m.H * 0.082;
        const tipsGap = m.H * 0.014;
        const tipsY = y + h - tipsH;
        const listAvail = Math.max(m.H * 0.12, tipsY - tipsGap - cy);

        const items = (data.items || []).filter(Boolean).slice(0, 6);
        const listGap = w * 0.01;
        const itemH = Math.min(m.H * 0.21, listAvail);

        this._listLayout = { m, x, y: cy, listW: w, itemH, listGap };
        this._listItems = this.scene.add.container(0, 0);
        this.add(this._listItems);

        if (items.length) {
            this._populateListItems(items, { animate: !!data.animateShoppingList });
        }

        this._drawTips(m, x, tipsY, w, tipsH);
    }

    /**
     * Show / refresh shopping-list cards. Call after a successful brief fetch
     * so the list can animate in without rebuilding the whole popup.
     */
    revealShoppingList(items = [], { animate = true } = {}) {
        if (!this.visible || !this._listLayout) return;
        this._populateListItems((items || []).filter(Boolean).slice(0, 6), { animate });
    }

    _populateListItems(items, { animate = false } = {}) {
        this._listImageGen = (this._listImageGen ?? 0) + 1;
        this._listImageJobs = [];
        if (this._listItems) {
            this._listItems.removeAll(true);
        } else {
            this._listItems = this.scene.add.container(0, 0);
            this.add(this._listItems);
        }

        const { m, x, y, listW, itemH, listGap } = this._listLayout;
        const count = Math.max(items.length, 1);
        const itemW = (listW - listGap * (count - 1)) / count;
        items.forEach((item, i) => {
            const card = this._drawListItem(
                m,
                x + i * (itemW + listGap),
                y,
                itemW,
                itemH,
                item,
                i,
                this._listItems,
            );
            if (!animate) return;

            const targetY = card.y;
            card.setAlpha(0);
            card.y = targetY + m.H * 0.028;
            this.scene.tweens.add({
                targets: card,
                alpha: 1,
                y: targetY,
                duration: 420,
                delay: 60 + i * 75,
                ease: 'Back.easeOut',
            });
        });
        this._loadListImages();
    }

    /**
     * Shopping-list art comes from each item's sImage. Local icons are only a
     * stand-in until that URL is on the texture cache (or when the URL is missing).
     */
    _loadListImages() {
        const jobs = this._listImageJobs ?? [];
        this._listImageJobs = [];
        if (!jobs.length || !this.scene) return;

        const gen = this._listImageGen;
        const scene = this.scene;
        const applyAll = () => {
            if (gen !== this._listImageGen) return;
            jobs.forEach((job) => job.apply());
        };

        const missing = [];
        const queued = new Set();
        jobs.forEach((job) => {
            if (scene.textures.exists(job.key)) return;
            if (queued.has(job.key)) return;
            queued.add(job.key);
            missing.push(job);
        });
        if (!missing.length) {
            applyAll();
            return;
        }

        const start = () => {
            if (gen !== this._listImageGen || !this.scene) return;
            scene.load.setCORS('anonymous');
            missing.forEach(({ key, url }) => {
                if (!scene.textures.exists(key)) scene.load.image(key, url);
            });
            if (!scene.load.list.size) {
                applyAll();
                return;
            }
            scene.load.once(Phaser.Loader.Events.COMPLETE, applyAll);
            scene.load.start();
        };

        if (scene.load.isLoading()) {
            scene.load.once(Phaser.Loader.Events.COMPLETE, start);
        } else {
            start();
        }
    }

    _drawHeading(m, x, y, w, label) {
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

    _drawStat(m, x, y, w, h, { base, icon, label, value, sub, labelColor, valueColor, subColor }) {
        const card = this.scene.add.image(x + w / 2, y + h / 2, base);
        card.setDisplaySize(w, h);
        this.add(card);

        const iconS = Math.min(w * 0.17, h * 0.28);
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
            color: subColor || C_BODY,
            align: 'center',
        };
        this.add(this._text(x + w / 2, y + h * 0.82, this._wrap(sub, w * 0.88, subStyle), subStyle).setOrigin(0.5, 0.5));
    }

    _drawListItem(m, x, y, w, h, item, index, parent = this) {
        const card = this.scene.add.container(x, y);
        parent.add(card);

        const r = Math.min(w, h) * 0.16;
        const g = this.scene.add.graphics();
        g.fillStyle(0x000000, 0.06);
        g.fillRoundedRect(2, 3, w, h, r);
        g.fillStyle(0xFFF8EC, 1);
        g.fillRoundedRect(0, 0, w, h, r);
        g.lineStyle(2.5, 0xE4D4B8, 1);
        g.strokeRoundedRect(0, 0, w, h, r);
        card.add(g);

        const resolved = resolveItem(item.sItemKey);
        const name = item.sName
            || resolved?.label
            || (resolved?.key ? formatName(resolved.key) : formatName(item.sItemKey ?? 'Item'));

        const nameStyle = {
            fontSize: `${m.fs(TYPE.itemName)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_PURPLE,
            align: 'center',
            stroke: C_PURPLE,
            strokeThickness: 1.25,
        };
        const fittedName = this._fitWrapped(name, w * 0.9, nameStyle, 2);
        const nameY = h * 0.05;
        const nameText = this._text(w / 2, nameY, fittedName.text, {
            ...nameStyle,
            fontSize: fittedName.fontSize,
        }).setOrigin(0.5, 0);
        card.add(nameText);

        const qtyFs = m.fs(TYPE.itemQty);
        const qtyY = h - Math.max(h * 0.075, qtyFs * 0.7);
        const nameGap = Math.max(m.fs(10), h * 0.07);
        const imageTop = nameY + nameText.height + nameGap;
        const imageBottom = qtyY - qtyFs * 0.7;
        const maxW = w * 0.68;
        const maxH = Math.max(h * 0.22, imageBottom - imageTop);
        const imageY = imageTop + maxH / 2;
        const iconKey = itemIconKey(item, index);
        const imageUrl = item.sImage || null;
        const imageKey = imageUrl ? listImageTextureKey(imageUrl) : null;
        const readyKey = imageKey && this.scene.textures.exists(imageKey) ? imageKey : iconKey;
        const img = this.scene.add.image(w / 2, imageY, readyKey);
        this._fitContain(img, maxW, maxH);
        // Keep the slot-based icon hidden until the real product URL arrives,
        // so tomatoes never briefly shows the bread fallback.
        if (imageKey && readyKey !== imageKey) img.setVisible(false);
        card.add(img);
        if (imageKey && readyKey !== imageKey) {
            this._listImageJobs = this._listImageJobs ?? [];
            this._listImageJobs.push({
                key: imageKey,
                url: imageUrl,
                apply: () => {
                    if (!img.active || !this.scene?.textures.exists(imageKey)) {
                        if (img.active) img.setVisible(true);
                        return;
                    }
                    img.setTexture(imageKey);
                    this._fitContain(img, maxW, maxH);
                    img.setVisible(true);
                },
            });
        }

        card.add(this._text(w / 2, qtyY, qtyLabel(item), {
            fontSize: `${m.fs(TYPE.itemQty)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_PURPLE,
            stroke: C_PURPLE,
            strokeThickness: 1.1,
        }).setOrigin(0.5, 0.5));

        return card;
    }

    _drawTips(m, x, y, w, h) {
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
        const tipStyle = {
            fontSize: `${m.fs(TYPE.tipsBody)}px`,
            fontStyle: WEIGHT.bold,
            color: C_TIP_BODY,
        };
        this.add(this._text(x + w * 0.035, y + h * 0.70, this._wrap(tip, w * 0.93, tipStyle), tipStyle).setOrigin(0, 0.5));
    }

    _drawActions(m, x, top, w, h) {
        const btnH = Math.min(m.H * 0.074, h * 0.74);
        const gap = w * 0.03;

        // Size from height using native aspect so buttons stay pill-shaped.
        const blueSrc = this.scene.textures.get(K.blueButton)?.getSourceImage?.();
        const greenSrc = this.scene.textures.get(HOME_TEXTURE_KEYS.greenButton)?.getSourceImage?.();
        const blueRatio = (blueSrc?.width ?? 565) / Math.max(1, blueSrc?.height ?? 123);
        const greenRatio = (greenSrc?.width ?? 568) / Math.max(1, greenSrc?.height ?? 128);
        let otherW = btnH * blueRatio;
        let startW = btnH * greenRatio;
        const maxPair = w * 0.92;
        if (otherW + gap + startW > maxPair) {
            const scale = maxPair / (otherW + gap + startW);
            otherW *= scale;
            startW *= scale;
        }
        const pairW = otherW + gap + startW;
        const pairLeft = x + (w - pairW) / 2;
        const rowY = top + h * 0.52;
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
    }

    _imageButton(m, cx, cy, maxW, maxH, key, label, { color, icon, onClick }) {
        const img = this.scene.add.image(cx, cy, key);
        const ratio = img.width / Math.max(1, img.height);
        let h = maxH;
        let w = h * ratio;
        if (w > maxW) {
            w = maxW;
            h = w / ratio;
        }
        img.setDisplaySize(w, h);
        this.add(img);

        // Label + icon are one centered run, lifted together so Cause's glyph
        // box sits in the middle of the pill.
        const group = this.scene.add.container(cx, cy - h * 0.06);
        this.add(group);

        const txt = this._text(0, 0, label, {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color,
            letterSpacing: 0,
        }).setOrigin(0, 0.5);
        group.add(txt);

        let iconImg = null;
        if (icon && this.scene.textures.exists(icon)) {
            iconImg = this.scene.add.image(0, 0, icon).setOrigin(0, 0.5);
            group.add(iconImg);
        }

        const layout = () => {
            const gap = iconImg ? Math.max(m.fs(7), h * 0.1) : 0;
            const iconSize = iconImg ? Math.min(h * 0.42, txt.height * 0.92) : 0;
            if (iconImg) {
                this._fitContain(iconImg, iconSize, iconSize);
                iconImg.setTintFill(0xffffff);
            }
            const total = txt.width + (iconImg ? gap + iconImg.displayWidth : 0);
            const start = -total / 2;
            txt.x = start;
            if (iconImg) iconImg.x = txt.x + txt.width + gap;
        };

        this._shrinkToWidth(txt, w * (iconImg ? 0.68 : 0.82));
        layout();
        const maxContent = w * 0.86;
        const contentW = iconImg
            ? (iconImg.x + iconImg.displayWidth) - txt.x
            : txt.width;
        const baseScale = contentW > maxContent ? maxContent / contentW : 1;
        group.setScale(baseScale);

        const hover = (scale) => {
            img.setDisplaySize(w * scale, h * scale);
            group.setScale(baseScale * scale);
        };

        const hit = this.scene.add.rectangle(cx, cy, w, h, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => hover(1.03));
        hit.on('pointerout', () => hover(1));
        hit.on('pointerup', onClick);
        this.add(hit);
    }

    async _start() {
        if (this._starting) return;
        this._starting = true;
        try {
            await this._onStart?.();
        } finally {
            this._starting = false;
        }
    }

    _chooseAnother() {
        this.close({ restoreHome: false });
        if (this._onChooseAnother) this._onChooseAnother();
        else this._onStart?.();
    }

    close({ restoreHome = true } = {}) {
        if (restoreHome && this.scene._root) this.scene._root.setVisible(true);
        this.setVisible(false);
        this.setAlpha(1);
        this.setScale(1);
    }

    get isOpen() {
        return this.visible;
    }
}
