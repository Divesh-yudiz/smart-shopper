import Phaser from 'phaser';
import { addCauseText, wrapCause } from '../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import { HOW_TO_PLAY_KEYS as HTP } from '../config/howToPlayAssets.js';
import { WHAT_LEARN_KEYS as WL } from '../config/whatLearnAssets.js';
import { GAME_GUIDE_KEYS as GG } from '../config/gameGuideAssets.js';
import { MISSION_DESC_KEYS as MD } from '../config/missionDescriptionAssets.js';

const TYPE = Object.freeze({
    title: 28,
    tab: 26,
    stepTitle: 30,
    stepBody: 22,
    control: 18,
    learnTitle: 24,
    learnBody: 24,
    guideTitle: 24,
    guideBody: 18,
    badge: 28,
});

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
    black: '900',
});

const C_WHITE = '#ffffff';
const C_NAVY = '#1A2744';
const C_MUTED = '#3F3A34';

/** Native Base-brown / base-purple tab plate size. */
const TAB_BASE_NATIVE_W = 414;
const TAB_BASE_NATIVE_H = 136;

const TABS = Object.freeze([
    Object.freeze({
        id: 'play',
        label: 'How to Play',
        icon: HTP.tabPlay,
        idleColor: '#5B3FC9',
        idleTint: 0x5B3FC9,
    }),
    Object.freeze({
        id: 'learn',
        label: "What you'll Learn",
        icon: HTP.tabLearn,
        idleColor: '#C47A12',
        idleTint: 0xC47A12,
    }),
    Object.freeze({
        id: 'guide',
        label: 'Game Guide',
        icon: HTP.tabGuide,
        idleColor: '#8B5A2B',
        idleTint: 0x8B5A2B,
    }),
]);

const PLAY_CARDS = Object.freeze([
    Object.freeze({
        n: '1',
        title: 'Choose a Mission',
        body: 'Pick one of your available shopping challenges.',
        icon: HTP.step1,
        fill: 0xF6EEFF,
        stroke: 0xC9A8F5,
        titleColor: '#5A24C4',
        badge: 0x7B3FE4,
    }),
    Object.freeze({
        n: '2',
        title: 'Follow your List',
        body: 'Find the products shown on your shopping list.',
        icon: HTP.step2,
        fill: 0xEAF4FF,
        stroke: 0x9BC4F5,
        titleColor: '#1A4FB8',
        badge: 0x2F6FE0,
    }),
    Object.freeze({
        n: '3',
        title: 'Compare and Choose',
        body: 'Compare price, Eco impact, and product information before adding an item.',
        icon: HTP.step3,
        fill: 0xEEF9E8,
        stroke: 0x9DD89A,
        titleColor: '#146B2C',
        badge: 0x1F8A3A,
    }),
    Object.freeze({
        n: '4',
        title: 'Watch your Resources',
        body: 'Keep an eye on your Shop Coins, Eco Meter, and timer while you shop.',
        icon: HTP.step4,
        fill: 0xFFF3E6,
        stroke: 0xF0B878,
        titleColor: '#B84F10',
        badge: 0xE07020,
    }),
    Object.freeze({
        n: '5',
        title: 'Review & Checkout',
        body: 'Check your cart, fix any choices if needed, and complete checkout before time runs out.',
        icon: HTP.step5,
        fill: 0xFFECEF,
        stroke: 0xF0A0B0,
        titleColor: '#A81E28',
        badge: 0xD63439,
    }),
    Object.freeze({
        n: '6',
        title: 'Controls',
        icon: HTP.step6,
        fill: 0xEEE8FF,
        stroke: 0xB8A8E8,
        titleColor: '#24185A',
        badge: 0x5B3FC9,
        controls: Object.freeze([
            Object.freeze({ kind: 'arrows', label: 'Move Left / Move Right' }),
            Object.freeze({ kind: 'hand', label: 'Select / Inspect Product' }),
            Object.freeze({ kind: 'cart', label: 'Open Cart' }),
        ]),
    }),
]);

const LEARN_CARDS = Object.freeze([
    Object.freeze({
        n: '1',
        title: 'NEEDS VS WANTS',
        body: 'Buy what you need before spending on tempting extras.',
        icon: WL.icon1,
        footer: WL.footer1,
        fill: 0xF6EEFF,
        stroke: 0xC9A8F5,
        titleColor: '#5A24C4',
        bodyColor: '#3A2A7A',
        badge: 0x7B3FE4,
    }),
    Object.freeze({
        n: '2',
        title: 'SMART BUDGETING',
        body: 'Plan your spending and avoid running out of Shop Coins.',
        icon: WL.icon2,
        footer: WL.footer2,
        fill: 0xEEF9E8,
        stroke: 0x9DD89A,
        titleColor: '#146B2C',
        bodyColor: '#1A5A30',
        badge: 0x1F8A3A,
    }),
    Object.freeze({
        n: '3',
        title: 'ECO-FRIENDLY THINKING',
        body: 'Compare products and understand how shopping choices can have different environmental impacts.',
        icon: WL.icon3,
        footer: WL.footer3,
        fill: 0xEAF4FF,
        stroke: 0x9BC4F5,
        titleColor: '#1A4FB8',
        bodyColor: '#1A3F7A',
        badge: 0x2F6FE0,
    }),
    Object.freeze({
        n: '4',
        title: 'SMART DECISIONS',
        body: 'A cheaper product is not always the best choice. Look at price and Eco impact together.',
        icon: WL.icon4,
        footer: WL.footer4,
        fill: 0xFFF3E6,
        stroke: 0xF0B878,
        titleColor: '#B84F10',
        bodyColor: '#7A3A10',
        badge: 0xE07020,
    }),
    Object.freeze({
        n: '5',
        title: 'SALES & DISCOUNTS',
        body: 'A special offer can look exciting—but first ask: "Do I really need it?"',
        icon: WL.icon5,
        footer: WL.footer5,
        fill: 0xFFECEF,
        stroke: 0xF0A0B0,
        titleColor: '#A81E28',
        bodyColor: '#7A1A28',
        badge: 0xD63439,
    }),
]);

const GUIDE_CARDS = Object.freeze([
    Object.freeze({
        title: 'COINS',
        body: 'Your mission budget. Every product you buy uses Shop Coins.',
        icon: GG.coins,
        frame: GG.yellowLarge,
        titleBar: GG.yellowSmall,
        titleIcon: MD.coinIcon,
        fill: 0xFFF9E6,
        stroke: 0xF0C84A,
        titleColor: '#A81E28',
        bodyColor: '#5A3A20',
        wide: false,
    }),
    Object.freeze({
        title: 'ECO METER',
        body: 'Shows the environmental impact available for your mission. Lower-impact choices use fewer Eco Points.',
        icon: GG.ecoMeter,
        frame: GG.greenLarge,
        titleBar: GG.greenSmall,
        titleIcon: MD.leafIcon,
        fill: 0xEEF9E8,
        stroke: 0x7DCC7A,
        titleColor: '#146B2C',
        bodyColor: '#1A5A30',
        wide: false,
    }),
    Object.freeze({
        title: 'TIMER',
        body: 'Shows how much time remains to complete your shopping.',
        icon: GG.timer,
        frame: GG.blueLarge,
        titleBar: GG.blueSmall,
        titleIcon: MD.timerIcon,
        fill: 0xEAF4FF,
        stroke: 0x7AB0E8,
        titleColor: '#1A4FB8',
        bodyColor: '#1A3F7A',
        wide: false,
    }),
    Object.freeze({
        title: 'CART',
        body: 'Stores everything you select. Review, remove, or swap products before checkout.',
        icon: GG.shoppingCart,
        frame: GG.pinkLarge,
        titleBar: GG.pinkSmall,
        titleIcon: GG.shoppingCart,
        fill: 0xFFECEF,
        stroke: 0xF0A0B0,
        titleColor: '#A81E28',
        bodyColor: '#7A1A28',
        wide: false,
    }),
    Object.freeze({
        title: 'SHOPPING LIST',
        body: 'Shows what you need to buy and what you have already collected.',
        icon: GG.shoppingList,
        frame: GG.purpleLarge,
        titleBar: GG.purpleSmall,
        titleIcon: GG.shoppingList,
        fill: 0xF6EEFF,
        stroke: 0xC9A8F5,
        titleColor: '#5A24C4',
        bodyColor: '#3A2A7A',
        wide: true,
    }),
    Object.freeze({
        title: 'SALE / EXTRA ITEMS',
        body: 'Not everything on the shelves is needed. Extras still use your Shop Coins and Eco Meter.',
        icon: GG.discount,
        frame: GG.orangeLarge,
        titleBar: GG.orangeSmall,
        titleIcon: GG.discount,
        fill: 0xFFF3E6,
        stroke: 0xF0B878,
        titleColor: '#B84F10',
        bodyColor: '#7A3A10',
        wide: true,
    }),
]);

/**
 * How to Play / Learn / Guide popup — Artboard 12 layout.
 */
export default class HomeInfoPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(700);
        this.setVisible(false);
        this._tab = 'play';
    }

    open() {
        this._tab = 'play';
        this._rebuild();
        this.setVisible(true);
        this.setAlpha(0);
        this.setScale(0.96);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scale: 1,
            duration: 280,
            ease: 'Back.easeOut',
        });
    }

    close() {
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: 0.97,
            duration: 160,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.setVisible(false);
                this.setScale(1);
            },
        });
    }

    get isOpen() {
        return this.visible;
    }

    _m() {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const s = Math.min(W / 1920, H / 1080);
        return {
            W,
            H,
            s,
            cx: W / 2,
            cy: H / 2,
            x: (f) => W * f,
            y: (f) => H * f,
            fs: (px) => Math.max(11, Math.round(px * s)),
        };
    }

    _text(x, y, message, style, wrapW) {
        const msg = wrapW != null ? wrapCause(this.scene, message, wrapW, style) : message;
        return addCauseText(this.scene, x, y, msg, style);
    }

    _fitContain(img, maxW, maxH) {
        const s = Math.min(maxW / img.width, maxH / img.height);
        img.setDisplaySize(img.width * s, img.height * s);
        return img;
    }

    _fitW(img, displayW) {
        img.setDisplaySize(displayW, displayW * (img.height / img.width));
        return img;
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

    /**
     * Capsule title bar sized to the label.
     * Uses 3-slice at fixed height so width can grow with text without
     * stretching the round ends, and without changing title font size.
     */
    _titlePill(x, y, key, innerW, targetH) {
        const src = this.scene.textures.get(key)?.getSourceImage?.();
        const tw = Math.max(1, src?.width ?? 530);
        const th = Math.max(1, src?.height ?? 233);
        // Round end width in source pixels (~half the capsule height).
        const side = Math.max(8, Math.min(Math.floor(th * 0.48), Math.floor(tw / 2) - 1));
        // Tight side padding past the round caps (keeps text inside, less empty space).
        const padFactor = 0.78;
        const dispW = Math.max(targetH * 2.0, innerW + targetH * padFactor);
        // Build slices in source space, then scale to the target display size.
        const srcW = Math.max(side * 2 + 8, Math.round(dispW * (th / targetH)));
        const pill = this.scene.add.nineslice(x, y, key, undefined, srcW, th, side, side, 0, 0);
        pill.setDisplaySize(dispW, targetH);
        return { pill, pillW: dispW, pillH: targetH };
    }

    _round(x, y, w, h, fill, radius, stroke = null, strokeW = 2) {
        const g = this.scene.add.graphics();
        const r = radius ?? Math.min(w, h) * 0.12;
        g.fillStyle(fill, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
        if (stroke != null) {
            g.lineStyle(strokeW, stroke, 1);
            g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
        }
        this.add(g);
        return g;
    }

    _rebuild() {
        this.removeAll(true);
        const m = this._m();

        const bg = this.scene.add.image(m.cx, m.cy, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(m.W, m.H);
        this.add(bg);

        const dim = this.scene.add.rectangle(m.cx, m.cy, m.W, m.H, 0x000000, 0.28);
        dim.setInteractive();
        this.add(dim);

        this._drawChrome(m);
        this._drawPanel(m);
    }

    _drawChrome(m) {
        const backH = m.H * 0.078;
        const back = this.scene.add.image(m.x(0.078), m.y(0.058), HOME_TEXTURE_KEYS.backButton);
        this._fitW(back, backH * (back.width / back.height));
        back.setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setScale(back.scaleX * 1.04, back.scaleY * 1.04));
        back.on('pointerout', () => this._fitW(back, backH * (back.width / back.height)));
        back.on('pointerup', () => this.close());
        this.add(back);

    }

    _drawPanel(m) {
        const panelW = m.W * 0.78;
        const panelH = m.H * 0.84;
        const panelY = m.cy + m.H * 0.02;
        this._panel = { w: panelW, h: panelH, y: panelY, x: m.cx };
        this._round(m.cx, panelY, panelW, panelH, 0xFFFEFB, Math.min(panelW, panelH) * 0.035, 0x3B7DE8, Math.max(8, Math.round(10 * m.s)));

        const panelTop = panelY - panelH / 2;
        const title = this._text(
            m.cx,
            panelTop + m.H * 0.038,
            'Find what you need, compare your choices and shop wisely.',
            {
                fontSize: `${m.fs(TYPE.title)}px`,
                fontStyle: WEIGHT.heavy,
                color: C_NAVY,
                align: 'center',
            },
            panelW * 0.82,
        ).setOrigin(0.5, 0.5);
        this.add(title);

        // Height-led size keeps plates compact; width follows native aspect (no stretch).
        const tabH = m.H * 0.072;
        const tabW = tabH * (TAB_BASE_NATIVE_W / TAB_BASE_NATIVE_H) * 1.08;
        const tabY = title.y + title.height / 2 + tabH / 2 + m.H * 0.014;
        this._drawTabs(m, tabY, tabW, tabH);

        const bodyTop = tabY + tabH / 2 + m.H * 0.022;
        const bodyBottom = panelY + panelH / 2 - m.H * 0.032;
        const padX = panelW * 0.028;
        const box = {
            x: m.cx - panelW / 2 + padX,
            y: bodyTop,
            w: panelW - padX * 2,
            h: bodyBottom - bodyTop,
        };

        if (this._tab === 'play') this._drawPlay(m, box);
        else if (this._tab === 'learn') this._drawLearn(m, box);
        else this._drawGuide(m, box);
    }

    _drawTabs(m, y, tabW, tabH) {
        const gap = m.W * 0.01;
        const total = TABS.length * tabW + (TABS.length - 1) * gap;
        let x = m.cx - total / 2 + tabW / 2;

        TABS.forEach((tab) => {
            const active = tab.id === this._tab;
            const baseKey = active ? HTP.tabBasePurple : HTP.tabBaseBrown;
            const base = this.scene.add.image(x, y, baseKey);
            base.setDisplaySize(tabW, tabH);
            this.add(base);

            const iconS = tabH * 0.52;
            const contentGap = tabW * 0.04;
            const sidePad = tabW * 0.1;
            const label = this._text(0, 0, tab.label, {
                fontSize: `${m.fs(TYPE.tab)}px`,
                fontStyle: WEIGHT.heavy,
                color: active ? C_WHITE : tab.idleColor,
            }).setOrigin(0, 0.5);
            this._shrinkToWidth(label, tabW - sidePad * 2 - iconS - contentGap);

            const rowW = iconS + contentGap + label.width;
            const iconX = x - rowW / 2 + iconS / 2;
            const labelX = iconX + iconS / 2 + contentGap;

            const icon = this.scene.add.image(iconX, y, tab.icon);
            this._fitContain(icon, iconS, iconS);
            if (active) icon.setTint(0xffffff);
            else icon.setTint(tab.idleTint);
            this.add(icon);

            label.setPosition(labelX, y);
            this.add(label);

            const hit = this.scene.add.rectangle(x, y, tabW, tabH, 0, 0);
            hit.setInteractive({ useHandCursor: true });
            hit.on('pointerup', () => this._setTab(tab.id));
            this.add(hit);

            x += tabW + gap;
        });
    }

    _setTab(id) {
        if (this._tab === id) return;
        this._tab = id;
        this._rebuild();
    }

    _drawPlay(m, box) {
        const gapX = box.w * 0.01;
        const gapY = box.h * 0.022;
        const cols = 3;
        const rows = 2;
        const cw = (box.w - gapX * (cols - 1)) / cols;
        const ch = (box.h - gapY * (rows - 1)) / rows;

        PLAY_CARDS.forEach((card, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = box.x + cw / 2 + col * (cw + gapX);
            const cy = box.y + ch / 2 + row * (ch + gapY);
            this._stepCard(m, cx, cy, cw, ch, card);
        });
    }

    _stepCard(m, cx, cy, w, h, card) {
        this._round(cx, cy, w, h, card.fill, Math.min(w, h) * 0.1, card.stroke, Math.max(2, Math.round(2.5 * m.s)));

        const left = cx - w / 2;
        const top = cy - h / 2;
        const badgeS = Math.min(w, h) * 0.14;
        this._round(left + badgeS * 0.55, top + badgeS * 0.55, badgeS, badgeS, card.badge, badgeS * 0.5);
        this.add(this._text(left + badgeS * 0.55, top + badgeS * 0.55, card.n, {
            fontSize: `${m.fs(TYPE.badge)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const padY = h * 0.04;
        const gap = h * 0.024;
        const textW = w * 0.9;

        if (card.controls) {
            const title = this._text(0, 0, card.title, {
                fontSize: `${m.fs(TYPE.stepTitle)}px`,
                fontStyle: WEIGHT.black,
                color: card.titleColor,
            }).setOrigin(0.5, 0);
            const titleH = title.height;
            const rows = card.controls.length;
            const rowH = Math.min(h * 0.115, (h - padY * 2 - titleH - gap * 2) * 0.2);
            const listH = rows * rowH;
            const iconMax = h - padY * 2 - titleH - gap * 2 - listH;
            const iconS = Math.min(w * 0.66, Math.max(h * 0.32, iconMax * 0.95));
            const blockH = iconS + gap + titleH + gap + listH;
            let y = cy - blockH / 2;

            const icon = this.scene.add.image(cx, y + iconS / 2, card.icon);
            this._fitContain(icon, iconS, iconS);
            this.add(icon);
            y += iconS + gap;

            title.setPosition(cx, y);
            this.add(title);
            y += titleH + gap;

            card.controls.forEach((row, i) => {
                this._controlRow(m, cx, y + rowH / 2 + i * rowH, w * 0.9, rowH * 0.88, row);
            });
            return;
        }

        const titleStyle = {
            fontSize: `${m.fs(TYPE.stepTitle)}px`,
            fontStyle: WEIGHT.black,
            color: card.titleColor,
            align: 'center',
        };
        const bodyStyle = {
            fontSize: `${m.fs(TYPE.stepBody)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_MUTED,
            align: 'center',
            lineSpacing: m.fs(2),
        };
        const title = this._text(0, 0, this._wrap(card.title, textW, titleStyle), titleStyle).setOrigin(0.5, 0);
        const body = this._text(0, 0, this._wrap(card.body, textW, bodyStyle), bodyStyle).setOrigin(0.5, 0);
        const titleH = title.height;
        const bodyH = body.height;
        const hrH = Math.max(2, Math.round(1.5 * m.s));

        const footerH = titleH + gap + hrH + gap + bodyH;
        const iconMax = h - padY * 2 - footerH - gap;
        const iconS = Math.min(w * 0.84, Math.max(h * 0.4, iconMax * 0.98));
        const blockH = iconS + gap + footerH;
        let y = cy - blockH / 2;

        const icon = this.scene.add.image(cx, y + iconS / 2, card.icon);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);
        y += iconS + gap;

        title.setPosition(cx, y);
        this.add(title);
        y += titleH + gap;

        const hr = this.scene.add.graphics();
        hr.lineStyle(hrH, card.badge, 0.55);
        hr.lineBetween(cx - w * 0.34, y + hrH / 2, cx + w * 0.34, y + hrH / 2);
        this.add(hr);
        y += hrH + gap;

        body.setPosition(cx, y);
        this.add(body);
    }

    _controlRow(m, cx, y, w, h, row) {
        const iconW = h * 1.4;
        const iconX = cx - w / 2 + iconW / 2;
        this._drawControlIcon(m, iconX, y, h, row.kind);
        this.add(this._text(iconX + iconW * 0.7, y, row.label, {
            fontSize: `${m.fs(TYPE.control)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0.5));
    }

    _drawControlIcon(m, x, y, size, kind) {
        const g = this.scene.add.graphics();
        const s = size * 0.9;
        if (kind === 'arrows') {
            g.fillStyle(0x5B3FC9, 1);
            g.fillTriangle(x - s * 0.42, y, x - s * 0.08, y - s * 0.28, x - s * 0.08, y + s * 0.28);
            g.fillTriangle(x + s * 0.42, y, x + s * 0.08, y - s * 0.28, x + s * 0.08, y + s * 0.28);
        } else if (kind === 'hand') {
            g.fillStyle(0xF0C14B, 1);
            g.fillRoundedRect(x - s * 0.18, y - s * 0.35, s * 0.36, s * 0.7, s * 0.12);
            g.fillCircle(x, y - s * 0.28, s * 0.2);
        } else {
            g.fillStyle(0x2F6FE0, 1);
            g.fillRoundedRect(x - s * 0.32, y - s * 0.18, s * 0.64, s * 0.42, s * 0.08);
            g.fillStyle(0x1A2744, 1);
            g.fillCircle(x - s * 0.16, y + s * 0.28, s * 0.1);
            g.fillCircle(x + s * 0.16, y + s * 0.28, s * 0.1);
        }
        this.add(g);
    }

    _drawLearn(m, box) {
        const gap = box.w * 0.012;
        const n = LEARN_CARDS.length;
        const cw = (box.w - gap * (n - 1)) / n;
        LEARN_CARDS.forEach((card, i) => {
            const cx = box.x + cw / 2 + i * (cw + gap);
            const cy = box.y + box.h / 2;
            this._learnCard(m, cx, cy, cw, box.h, card);
        });
    }

    _learnCard(m, cx, cy, w, h, card) {
        this._round(cx, cy, w, h, card.fill, Math.min(w, h) * 0.08, card.stroke, Math.max(2, Math.round(2.5 * m.s)));

        const top = cy - h / 2;
        const bottom = cy + h / 2;
        const padY = h * 0.028;
        const gap = Math.max(m.H * 0.008, h * 0.016);
        const textW = w * 0.88;

        const badgeS = Math.min(w, h) * 0.14;
        const badgeY = top + badgeS * 0.7;
        this._round(cx, badgeY, badgeS, badgeS, card.badge, badgeS * 0.5);
        this.add(this._text(cx, badgeY, card.n, {
            fontSize: `${m.fs(TYPE.badge)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        // Fixed icon bands so every card's upper/lower art shares the same baseline.
        const iconS = Math.min(w * 0.94, h * 0.30);
        const footerS = Math.min(w * 0.88, h * 0.22);
        const iconY = badgeY + badgeS * 0.55 + gap + iconS / 2;
        const footerY = bottom - padY - footerS / 2;

        const icon = this.scene.add.image(cx, iconY, card.icon);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);

        const footer = this.scene.add.image(cx, footerY, card.footer);
        this._fitContain(footer, footerS, footerS);
        this.add(footer);

        // Text sits strictly between top icon and bottom footer — never overlapping either.
        const textTop = iconY + icon.displayHeight / 2 + gap;
        const textBottom = footerY - footer.displayHeight / 2 - gap;
        const availH = Math.max(0, textBottom - textTop);

        const titleStyle = {
            fontSize: `${m.fs(TYPE.learnTitle)}px`,
            fontStyle: WEIGHT.black,
            color: card.titleColor,
            align: 'center',
        };
        let bodyFs = m.fs(TYPE.learnBody);
        const makeBodyStyle = (fs) => ({
            fontSize: `${fs}px`,
            fontStyle: WEIGHT.heavy,
            color: card.bodyColor,
            align: 'center',
            lineSpacing: Math.max(1, Math.round(fs * 0.12)),
        });

        const title = this._text(0, 0, this._wrap(card.title, textW, titleStyle), titleStyle).setOrigin(0.5, 0);
        let bodyStyle = makeBodyStyle(bodyFs);
        let body = this._text(0, 0, this._wrap(card.body, textW, bodyStyle), bodyStyle).setOrigin(0.5, 0);

        // Shrink body type if the block can't fit in the mid band.
        while ((title.height + gap + body.height) > availH && bodyFs > m.fs(14)) {
            body.destroy();
            bodyFs -= 1;
            bodyStyle = makeBodyStyle(bodyFs);
            body = this._text(0, 0, this._wrap(card.body, textW, bodyStyle), bodyStyle).setOrigin(0.5, 0);
        }

        const textBlockH = title.height + gap + body.height;
        // Bias upward from center so body clears the footer; keep clear of the top icon.
        let textY = textTop;
        if (textBlockH < availH) {
            textY = textTop + (availH - textBlockH) * 0.2;
        }
        if (textY + textBlockH > textBottom) {
            textY = Math.max(textTop, textBottom - textBlockH);
        }

        title.setPosition(cx, textY);
        this.add(title);
        body.setPosition(cx, textY + title.height + gap);
        this.add(body);
    }

    _drawGuide(m, box) {
        const gapX = box.w * 0.012;
        const gapY = box.h * 0.02;
        const topCards = GUIDE_CARDS.filter((c) => !c.wide);
        const wideCards = GUIDE_CARDS.filter((c) => c.wide);
        const topCols = topCards.length;
        const topH = box.h * 0.58;
        const botH = box.h - topH - gapY;
        const topW = (box.w - gapX * (topCols - 1)) / topCols;
        const botCols = wideCards.length;
        const botW = (box.w - gapX * (botCols - 1)) / botCols;

        topCards.forEach((card, i) => {
            const cx = box.x + topW / 2 + i * (topW + gapX);
            const cy = box.y + topH / 2;
            this._guideCard(m, cx, cy, topW, topH, card);
        });

        wideCards.forEach((card, i) => {
            const cx = box.x + botW / 2 + i * (botW + gapX);
            const cy = box.y + topH + gapY + botH / 2;
            this._guideCard(m, cx, cy, botW, botH, card);
        });
    }

    _guideCard(m, cx, cy, w, h, card) {
        const radius = Math.min(w, h) * (card.wide ? 0.12 : 0.1);
        this._round(cx, cy, w, h, card.fill, radius);

        // Nine-slice so colored frames keep round corners (no stretch).
        const frameSrc = this.scene.textures.get(card.frame)?.getSourceImage?.();
        const frameCap = Math.max(36, Math.floor(Math.min(frameSrc?.width ?? 400, frameSrc?.height ?? 400) * 0.14));
        this.add(this._slice(cx, cy, card.frame, w, h, frameCap));

        const padY = h * 0.05;
        const gap = Math.max(m.H * 0.006, h * 0.018);
        const textW = w * (card.wide ? 0.86 : 0.84);
        const titleBarH = Math.min(m.H * 0.048, h * 0.12);
        const titleIconS = titleBarH * 0.62;

        const titleStyle = {
            fontSize: `${m.fs(TYPE.guideTitle)}px`,
            fontStyle: WEIGHT.black,
            color: card.titleColor,
            align: 'center',
        };
        let bodyFs = m.fs(TYPE.guideBody);
        const makeBodyStyle = (fs) => ({
            fontSize: `${fs}px`,
            fontStyle: WEIGHT.heavy,
            color: card.bodyColor,
            align: 'center',
            lineSpacing: Math.max(1, Math.round(fs * 0.14)),
        });

        let bodyStyle = makeBodyStyle(bodyFs);
        let body = this._text(0, 0, this._wrap(card.body, textW, bodyStyle), bodyStyle).setOrigin(0.5, 0);

        const titleText = this._text(0, 0, card.title, titleStyle).setOrigin(0, 0.5);
        const titleIcon = this.scene.add.image(0, 0, card.titleIcon);
        this._fitContain(titleIcon, titleIconS, titleIconS);
        const titleGap = Math.max(5, m.W * 0.004);
        const innerW = titleIcon.displayWidth + titleGap + titleText.width;
        // Keep title type at guideTitle size — only the pill width adapts.
        const maxPillW = w * 0.94;
        let { pill, pillW, pillH } = this._titlePill(0, 0, card.titleBar, innerW, titleBarH);
        if (pillW > maxPillW) {
            pillW = maxPillW;
            pill.setDisplaySize(pillW, pillH);
        }

        const footerH = pillH + gap + body.height;
        let iconS = Math.min(
            w * (card.wide ? 0.28 : 0.74),
            h * (card.wide ? 0.42 : 0.4),
            h - padY * 2 - footerH - gap,
        );
        iconS = Math.max(h * 0.2, iconS);

        while ((iconS + gap + footerH) > (h - padY * 2) && bodyFs > m.fs(12)) {
            body.destroy();
            bodyFs -= 1;
            bodyStyle = makeBodyStyle(bodyFs);
            body = this._text(0, 0, this._wrap(card.body, textW, bodyStyle), bodyStyle).setOrigin(0.5, 0);
        }

        const blockH = iconS + gap + pillH + gap + body.height;
        let y = cy - blockH / 2;
        y = Math.max(cy - h / 2 + padY, Math.min(y, cy + h / 2 - padY - blockH));

        const icon = this.scene.add.image(cx, y + iconS / 2, card.icon);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);
        y += iconS + gap;

        const titleMidY = y + pillH / 2;
        pill.setPosition(cx, titleMidY);
        this.add(pill);

        const titleRowW = titleIcon.displayWidth + titleGap + titleText.width;
        titleIcon.setPosition(cx - titleRowW / 2 + titleIcon.displayWidth / 2, titleMidY);
        titleText.setPosition(titleIcon.x + titleIcon.displayWidth / 2 + titleGap, titleMidY);
        this.add(titleIcon);
        this.add(titleText);
        y += pillH + gap;

        body.setPosition(cx, y);
        this.add(body);
    }

    _wrap(str, maxWidth, style) {
        return wrapCause(this.scene, str, maxWidth, style);
    }

    _shrinkToWidth(text, maxW) {
        let size = parseInt(text.style.fontSize, 10) || 16;
        while (text.width > maxW && size > 11) {
            size -= 1;
            text.setFontSize(size);
        }
        return text;
    }
}
