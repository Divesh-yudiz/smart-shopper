import Phaser from 'phaser';
import { addCauseText, setCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS } from '../../config/missionDescriptionAssets.js';
import { SALE_POPUP_KEYS as SP } from '../../config/salePopupAssets.js';
import { NOT_ENOUGH_COIN_KEYS as NEC } from '../../config/notEnoughCoinAssets.js';
import { CHOOSE_PRODUCT_KEYS as CP } from '../../config/chooseProductAssets.js';
import { VIEW_CART_KEYS as VC } from '../../config/viewCartAssets.js';

const TYPE = Object.freeze({
    ribbon: 46,
    subtitle: 26,
    statTitle: 17,
    statValue: 40,
    section: 18,
    name: 24,
    badge: 16,
    pack: 22,
    price: 26,
    qty: 26,
    needed: 20,
    button: 28,
    link: 22,
    note: 18,
});

const C_WHITE = '#ffffff';
const C_NAVY = '#1A2744';
const C_MUTED = '#6A6258';
const C_PURPLE = '#6B3CC9';
const C_GREEN = '#1F8A3A';
const C_RED = '#E23B4A';
const C_COIN = '#C47A12';
const C_ECO = '#1B7A32';
const C_LINK = '#2F6FE0';

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
});

const VISIBLE_CART = 4;
const VISIBLE_NEEDED = 3;

const DEFAULT_CART = Object.freeze([
    Object.freeze({ name: 'Locally Sourced Rice', pack: '1 Pack', price: 16, eco: 4, qty: 1, required: true, textureKey: CP.riceLocal }),
    Object.freeze({ name: 'Packaged White Bread', pack: '1 Pack', price: 7, eco: 7, qty: 1, required: true, textureKey: MISSION_DESC_KEYS.breadIcon }),
    Object.freeze({ name: 'Standard Eggs', pack: '1 Pack of 6', price: 7, eco: 7, qty: 1, required: true, textureKey: MISSION_DESC_KEYS.eggIcon }),
    Object.freeze({ name: 'Chocolate Biscuits', pack: '1 Pack', price: 5, eco: 6, qty: 1, required: false, textureKey: VC.cookie }),
]);

const DEFAULT_NEEDED = Object.freeze([
    Object.freeze({ name: 'Milk 1 Pack', textureKey: VC.milk }),
    Object.freeze({ name: 'Bananas 6 Pieces', textureKey: MISSION_DESC_KEYS.bananaIcon }),
]);

function formatClock (value) {
    if (typeof value === 'string') return value;
    const total = Math.max(0, Math.round(Number(value) || 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * View Cart — review cart rows, missing list items, and checkout.
 * Row cards are nine-sliced so the rounded corners stay intact.
 */
export default class ViewCartPopup extends Phaser.GameObjects.Container {
    constructor (scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(610);
        this.setVisible(false);
    }

    open ({
        title = 'View Cart',
        subtitle = 'Review your choices before you continue shopping.',
        itemsFound = '3/5',
        coinsRemaining = 32,
        ecoRemaining = 7,
        timerRemaining = '01:40',
        cartItems = DEFAULT_CART,
        stillNeeded = DEFAULT_NEEDED,
        onContinue = () => { },
        onFindRemaining = () => { },
        onCheckout = () => { },
        onQtyChange = () => { },
        onClose = () => { },
    } = {}) {
        this._onContinue = onContinue;
        this._onFindRemaining = onFindRemaining;
        this._onCheckout = onCheckout;
        this._onQtyChange = onQtyChange;
        this._onClose = onClose;
        this._timerText = null;
        this._timerLayout = null;
        this._stopScrollHint();
        this._cartItems = cartItems.map((item) => ({
            ...item,
            qty: Math.max(0, Math.round(item.qty ?? 1)),
        }));

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
            itemsFound: String(itemsFound),
            coinsRemaining: Math.max(0, Math.round(coinsRemaining)),
            ecoRemaining: Math.max(0, Math.round(ecoRemaining)),
            timerLabel: formatClock(timerRemaining),
            stillNeeded,
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

    _fitButton (img, maxW, maxH) {
        const ratio = img.width / Math.max(1, img.height);
        let w = maxW;
        let h = w / ratio;
        if (h > maxH) {
            h = maxH;
            w = h * ratio;
        }
        img.setDisplaySize(w, h);
        return { w, h };
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

    _round (x, y, w, h, color, radius, stroke = null, strokeW = 2, parent = this) {
        const g = this.scene.add.graphics();
        const r = radius ?? Math.min(w, h) * 0.22;
        g.fillStyle(color, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
        if (stroke != null) {
            g.lineStyle(strokeW, stroke, 1);
            g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
        }
        parent.add(g);
        return g;
    }

    _addTo (parent, obj) {
        parent.add(obj);
        return obj;
    }

    _scrollList (m, cx, listTop, viewW, viewH, contentH, onScroll) {
        const list = this.scene.add.container(cx, listTop);
        this.add(list);

        const radius = Math.min(viewW, viewH) * 0.04;
        const maskG = this.scene.add.graphics();
        maskG.fillStyle(0xffffff, 1);
        maskG.fillRoundedRect(cx - viewW / 2, listTop, viewW, viewH, radius);
        maskG.setVisible(false);
        this.add(maskG);
        list.setMask(maskG.createGeometryMask());

        const maxScroll = Math.max(0, contentH - viewH);
        let offset = 0;
        // Stay over the visible window as the list moves, so hits never cover
        // the buttons drawn underneath.
        const dragPad = this.scene.add.rectangle(0, viewH / 2, viewW, viewH, 0, 0);
        list.add(dragPad);
        const apply = (next) => {
            offset = Phaser.Math.Clamp(next, 0, maxScroll);
            list.y = listTop - offset;
            dragPad.y = offset + viewH / 2;
            onScroll?.(offset, maxScroll);
        };

        if (maxScroll > 0) {
            dragPad.setInteractive({ useHandCursor: false });
            let dragY = null;
            dragPad.on('pointerdown', (ptr) => { dragY = ptr.y; });
            dragPad.on('pointermove', (ptr) => {
                if (dragY == null || !ptr.isDown) return;
                apply(offset + (dragY - ptr.y));
                dragY = ptr.y;
            });
            dragPad.on('pointerup', () => { dragY = null; });
            dragPad.on('pointerupoutside', () => { dragY = null; });
            dragPad.on('wheel', (_ptr, _dx, dy) => apply(offset + dy * 0.45));
        }

        return list;
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

    }

    _drawPanel (m, data) {
        const panelW = m.W * 0.74;
        const padX = panelW * 0.078;
        const innerW = panelW - padX * 2;
        const colGap = innerW * 0.02;
        const rightW = innerW * 0.30;
        const leftW = innerW - colGap - rightW;
        const gap = m.H * 0.012;
        const statH = m.H * 0.112;
        const sectionH = m.H * 0.038;
        const rowGap = m.H * 0.008;
        const rowH = m.H * 0.098;
        const needH = m.H * 0.062;
        const wellPadY = m.H * 0.022;
        const cartVisible = Math.min(VISIBLE_CART, Math.max(1, this._cartItems.length));
        const leftBody = sectionH + wellPadY
            + cartVisible * rowH + Math.max(0, cartVisible - 1) * rowGap
            + wellPadY;

        const subStyle = {
            fontSize: `${m.fs(TYPE.subtitle)}px`,
            color: C_NAVY,
            align: 'center',
        };
        const subProbe = this._text(0, 0, this._wrap(data.subtitle, innerW * 0.92, subStyle), subStyle).setVisible(false);
        const subH = subProbe.height;
        subProbe.destroy();

        const btnMaxH = m.H * 0.064;
        const linkH = m.H * 0.036;
        const noteH = m.H * 0.028;
        const stackGap = m.H * 0.008;
        const needCount = data.stillNeeded?.length || 0;
        const needVisible = Math.min(VISIBLE_NEEDED, Math.max(1, needCount));
        const scrollHintH = needCount > VISIBLE_NEEDED ? m.H * 0.03 : 0;
        const rightBody = sectionH + wellPadY
            + needVisible * needH + Math.max(0, needVisible - 1) * rowGap
            + scrollHintH + gap + btnMaxH + stackGap + linkH + stackGap + btnMaxH + stackGap + noteH + wellPadY;
        const bodyH = Math.max(leftBody, rightBody);

        const ribbonSrc = this.scene.textures.get(MS.ribbon)?.getSourceImage?.();
        const ribbonW = panelW * 0.46;
        const ribbonH = ribbonW * ((ribbonSrc?.height ?? 180) / (ribbonSrc?.width ?? 900));
        const ribbonOverlap = ribbonH * 0.22;
        const ribbonLift = ribbonH * 0.18;
        const belowRibbon = ribbonOverlap + ribbonH * 0.42 + m.H * 0.006;
        const bottomPad = m.H * 0.09;
        const panelH = belowRibbon + subH + gap + statH + gap + bodyH + bottomPad;
        const panelY = m.cy + m.H * 0.012;
        const panel = this._slice(m.cx, panelY, MS.pop, panelW, panelH, 110);
        this.add(panel);

        const panelTop = panelY - panelH / 2;
        const panelLeft = m.cx - panelW / 2;

        const ribbon = this.scene.add.image(m.cx, panelTop + ribbonOverlap - ribbonLift, MS.ribbon);
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
            this._wrap(data.title, ribbon.displayWidth * 0.7, ribbonStyle),
            ribbonStyle,
        ).setOrigin(0.5, 0.5));

        const innerLeft = panelLeft + padX;
        const contentTop = panelTop + belowRibbon;
        const subtitle = this._text(
            m.cx,
            contentTop,
            this._wrap(data.subtitle, innerW * 0.92, subStyle),
            subStyle,
        ).setOrigin(0.5, 0);
        this.add(subtitle);

        const statY = subtitle.y + subtitle.height + gap + statH / 2;
        this._drawStatRow(m, m.cx, statY, innerW, statH, data);

        const bodyTop = statY + statH / 2 + gap;
        const leftX = innerLeft + leftW / 2;
        const rightX = innerLeft + leftW + colGap + rightW / 2;
        this._drawCartColumn(m, leftX, bodyTop, leftW, rowH, rowGap, sectionH, wellPadY, bodyH);
        this._drawNeededColumn(m, rightX, bodyTop, rightW, {
            stillNeeded: data.stillNeeded,
            sectionH,
            needH,
            rowGap,
            gap,
            btnMaxH,
            linkH,
            stackGap,
            scrollHintH,
            wellPadY,
        });
    }

    _drawStatRow (m, cx, y, w, h, data) {
        const cards = [
            { title: 'ITEMS FOUND', titleColor: C_PURPLE, fill: 0xF3E8FF, stroke: 0xD9BCFF, icon: VC.basket, value: data.itemsFound, statKey: 'found' },
            { title: 'REMAINING COINS', titleColor: '#C47A12', fill: 0xFFF9E6, stroke: 0xFCDA8B, icon: MISSION_DESC_KEYS.coinIcon, value: `${data.coinsRemaining}`, statKey: 'coins' },
            { title: 'REMAINING ECO', titleColor: C_GREEN, fill: 0xEEF9E8, stroke: 0xBCE4A8, icon: CP.leaf, value: `${data.ecoRemaining}`, statKey: 'eco' },
            { title: 'REMAINING TIME', titleColor: C_LINK, fill: 0xE8F4FF, stroke: 0xADD8FF, icon: MISSION_DESC_KEYS.timerIcon, value: data.timerLabel, liveTimer: true },
        ];
        const gap = w * 0.016;
        const cardW = (w - gap * (cards.length - 1)) / cards.length;
        cards.forEach((card, i) => {
            const x = cx - w / 2 + cardW / 2 + i * (cardW + gap);
            this._statCard(m, x, y, cardW, h, card);
        });
    }

    _statCard (m, x, y, w, h, card) {
        const radius = Math.min(w, h) * 0.22;
        this._round(x, y, w, h, card.fill, radius, card.stroke, Math.max(2, Math.round(2.5 * m.s)));
        const iconS = Math.min(w * 0.28, h * 0.42);
        const gap = w * 0.045;
        const icon = this.scene.add.image(0, y, card.icon);
        this._fitContain(icon, iconS, iconS);

        const title = this._text(0, y - h * 0.16, card.title, {
            fontSize: `${m.fs(TYPE.statTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: card.titleColor,
        }).setOrigin(0, 0.5);
        const value = this._text(0, y + h * 0.16, card.value, {
            fontSize: `${m.fs(TYPE.statValue)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0.5);
        this.add(icon);
        this.add(title);
        this.add(value);

        const layout = { icon, title, value, centerX: x, gap };
        this._centerStatContent(layout);
        if (card.statKey === 'found') {
            this._foundText = value;
            this._foundLayout = layout;
        }
        if (card.statKey === 'coins') {
            this._coinsText = value;
            this._coinsLayout = layout;
        }
        if (card.statKey === 'eco') {
            this._ecoText = value;
            this._ecoLayout = layout;
        }
        if (card.liveTimer) {
            this._timerText = value;
            this._timerLayout = layout;
        }
    }

    _centerStatContent ({ icon, title, value, centerX, gap }) {
        const textW = Math.max(title.width, value.width);
        const contentW = icon.displayWidth + gap + textW;
        const left = centerX - contentW / 2;
        icon.x = left + icon.displayWidth / 2;
        const textX = left + icon.displayWidth + gap;
        title.x = textX;
        value.x = textX;
    }

    setItemsFound (label) {
        if (!this._foundText?.active) return;
        setCauseText(this._foundText, String(label));
        if (this._foundLayout) this._centerStatContent(this._foundLayout);
    }

    setCoinsRemaining (amount) {
        if (!this._coinsText?.active) return;
        setCauseText(this._coinsText, `${Math.max(0, Math.round(amount))}`);
        if (this._coinsLayout) this._centerStatContent(this._coinsLayout);
    }

    setEcoRemaining (amount) {
        if (!this._ecoText?.active) return;
        setCauseText(this._ecoText, `${Math.max(0, Math.round(amount))}`);
        if (this._ecoLayout) this._centerStatContent(this._ecoLayout);
    }

    setTimerRemaining (seconds) {
        if (!this.visible || !this._timerText?.active) return;
        setCauseText(this._timerText, formatClock(seconds));
        if (this._timerLayout) this._centerStatContent(this._timerLayout);
    }

    dismiss () {
        this.scene.tweens.killTweensOf(this);
        this._stopScrollHint();
        this._timerText = null;
        this._timerLayout = null;
        this.setVisible(false);
        this.setAlpha(1);
    }

    _sectionPill (m, x, y, label) {
        const style = {
            fontSize: `${m.fs(TYPE.section)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        };
        const probe = this._text(0, 0, label, style).setVisible(false);
        const w = probe.width + m.W * 0.028;
        const h = m.H * 0.036;
        probe.destroy();
        this._round(x, y, w, h, 0x7A3FE0, h * 0.28);
        this.add(this._text(x, y, label, style).setOrigin(0.5, 0.5));
    }

    _columnWell (m, cx, top, bottom, w) {
        const h = Math.max(m.H * 0.08, bottom - top);
        const radius = Math.min(h, w) * 0.06;
        this._round(
            cx,
            top + h / 2,
            w,
            h,
            0xF6E4C4,
            radius,
            0xE0C89A,
            Math.max(2, Math.round(2.5 * m.s)),
        );
        return { top, bottom: top + h, h, radius };
    }

    _drawCartColumn (m, cx, top, w, rowH, rowGap, sectionH, wellPadY, bodyH) {
        const padX = w * 0.028;
        const innerW = w - padX * 2;
        const count = this._cartItems.length;

        if (count === 0) {
            const wellBottom = top + bodyH;
            this._columnWell(m, cx, top + sectionH * 0.28, wellBottom, w);
            this._sectionPill(m, cx - w / 2 + m.W * 0.055, top + sectionH / 2, 'IN CART');
            const emptyStyle = {
                fontSize: `${m.fs(TYPE.name)}px`,
                fontStyle: WEIGHT.heavy,
                color: C_MUTED,
                align: 'center',
            };
            const message = this._wrap(
                'Add the required products to your cart',
                innerW * 0.78,
                emptyStyle,
            );
            const wellTop = top + sectionH * 0.28;
            this.add(this._text(
                cx,
                wellTop + (wellBottom - wellTop) / 2,
                message,
                emptyStyle,
            ).setOrigin(0.5, 0.5));
            return;
        }

        const visible = Math.min(VISIBLE_CART, Math.max(1, count));
        const listTop = top + sectionH + wellPadY;
        const viewH = visible * rowH + Math.max(0, visible - 1) * rowGap;
        const contentH = Math.max(viewH, count * rowH + Math.max(0, count - 1) * rowGap);
        this._columnWell(m, cx, top + sectionH * 0.28, listTop + viewH + wellPadY, w);
        this._sectionPill(m, cx - w / 2 + m.W * 0.055, top + sectionH / 2, 'IN CART');

        const list = this._scrollList(m, cx, listTop, innerW + padX, viewH, contentH);
        this._cartItems.forEach((item, i) => {
            const y = rowH / 2 + i * (rowH + rowGap);
            this._drawCartRow(m, list, 0, y, innerW, rowH, item, i);
        });
    }

    _drawCartRow (m, parent, cx, cy, w, h, item, index) {
        this._addTo(parent, this._slice(cx, cy, MISSION_DESC_KEYS.baseN, w, h * 0.96, Math.floor(h * 0.45)));

        const slot = h * 0.78;
        const iconX = cx - w / 2 + slot * 0.62;
        const key = this.scene.textures.exists(item.textureKey) ? item.textureKey : VC.cookie;
        const icon = this.scene.add.image(iconX, cy, key);
        this._fitContain(icon, slot * 0.92, slot * 0.86);
        this._addTo(parent, icon);

        const nameX = iconX + slot * 0.52;
        const nameMax = w * 0.34;
        const nameStyle = {
            fontSize: `${m.fs(TYPE.name)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        };
        const name = this._text(nameX, cy - h * 0.16, this._wrap(item.name, nameMax, nameStyle), nameStyle).setOrigin(0, 0.5);
        this._addTo(parent, name);

        const required = item.required !== false;
        const badgeLabel = required ? 'Required' : 'Not Required';
        const badgeStyle = {
            fontSize: `${m.fs(TYPE.badge)}px`,
            fontStyle: WEIGHT.heavy,
            color: required ? C_GREEN : C_RED,
        };
        const badgeProbe = this._text(0, 0, badgeLabel, badgeStyle).setVisible(false);
        const badgeW = badgeProbe.width + m.W * 0.012;
        const badgeH = m.H * 0.022;
        badgeProbe.destroy();
        const badgeX = nameX + badgeW / 2;
        const badgeY = cy + h * 0.18;
        this._round(badgeX, badgeY, badgeW, badgeH, required ? 0xDDF6E4 : 0xFDE4E6, badgeH * 0.4, null, 2, parent);
        this._addTo(parent, this._text(badgeX, badgeY, badgeLabel, badgeStyle).setOrigin(0.5, 0.5));

        const packX = cx + w * 0.02;
        this._addTo(parent, this._text(packX, cy - h * 0.18, item.pack ?? '', {
            fontSize: `${m.fs(TYPE.pack)}px`,
            color: C_MUTED,
        }).setOrigin(0.5, 0.5));

        this._drawPriceCluster(m, parent, cx + w * 0.30, cy - h * 0.16, item);
        this._drawStepper(m, parent, cx + w * 0.30, cy + h * 0.20, h * 0.36, index);
    }

    _drawPriceCluster (m, parent, x, y, item) {
        const iconS = m.H * 0.028;
        const gap = m.W * 0.004;
        const coin = this.scene.add.image(0, y, MISSION_DESC_KEYS.coinIcon);
        this._fitContain(coin, iconS, iconS);
        const price = this._text(0, y, `${item.price ?? 0}`, {
            fontSize: `${m.fs(TYPE.price)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_COIN,
        }).setOrigin(0, 0.5);
        const leaf = this.scene.add.image(0, y, CP.leaf);
        this._fitContain(leaf, iconS * 0.92, iconS * 0.92);
        const eco = this._text(0, y, `${item.eco ?? 0}`, {
            fontSize: `${m.fs(TYPE.price)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_ECO,
        }).setOrigin(0, 0.5);
        const total = coin.displayWidth + gap + price.width + gap * 2 + leaf.displayWidth + gap + eco.width;
        let cursor = x - total / 2;
        coin.x = cursor + coin.displayWidth / 2;
        cursor = coin.x + coin.displayWidth / 2 + gap;
        price.x = cursor;
        cursor = price.x + price.width + gap * 2;
        leaf.x = cursor + leaf.displayWidth / 2;
        eco.x = leaf.x + leaf.displayWidth / 2 + gap;
        this._addTo(parent, coin);
        this._addTo(parent, price);
        this._addTo(parent, leaf);
        this._addTo(parent, eco);
    }

    _drawStepper (m, parent, x, y, size, index) {
        const btn = size;
        const gap = size * 0.55;
        const label = this._text(x, y, `${this._cartItems[index].qty}`, {
            fontSize: `${m.fs(TYPE.qty)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5);
        this._addTo(parent, label);
        this._stepBtn(parent, x - label.width / 2 - gap - btn / 2, y, btn, '−', () => this._changeQty(index, -1));
        this._stepBtn(parent, x + label.width / 2 + gap + btn / 2, y, btn, '+', () => this._changeQty(index, 1));
        this._cartItems[index]._label = label;
    }

    _stepBtn (parent, x, y, size, glyph, onClick) {
        const btn = this.scene.add.image(x, y, SP.stepButton);
        btn.setDisplaySize(size, size);
        this._addTo(parent, btn);
        this._addTo(parent, this._text(x, y - size * 0.02, glyph, {
            fontSize: `${Math.round(size * 0.55)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));
        const hit = this.scene.add.rectangle(x, y, size, size, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => btn.setDisplaySize(size * 1.06, size * 1.06));
        hit.on('pointerout', () => btn.setDisplaySize(size, size));
        hit.on('pointerup', onClick);
        this._addTo(parent, hit);
    }

    _changeQty (index, delta) {
        const item = this._cartItems[index];
        if (!item) return;
        const next = Math.max(0, Math.min(9, item.qty + delta));
        if (next === item.qty) return;
        item.qty = next;
        if (item._label) setCauseText(item._label, `${next}`);
        this._onQtyChange?.(item, next, index, delta);
    }

    _drawNeededColumn (m, cx, top, w, layout) {
        const { stillNeeded, sectionH, needH, rowGap, gap, btnMaxH, linkH, stackGap, scrollHintH, wellPadY } = layout;
        const padX = w * 0.07;
        const innerW = w - padX * 2;
        const items = stillNeeded?.length ? stillNeeded : [];
        const visible = Math.min(VISIBLE_NEEDED, Math.max(1, items.length));
        const listTop = top + sectionH + wellPadY;
        const viewH = visible * needH + Math.max(0, visible - 1) * rowGap;
        const contentH = Math.max(viewH, items.length * needH + Math.max(0, items.length - 1) * rowGap);
        const afterRows = listTop + viewH;
        const hintH = items.length > VISIBLE_NEEDED ? scrollHintH : 0;
        const continueY = afterRows + hintH + gap + btnMaxH / 2;
        const linkY = continueY + btnMaxH / 2 + stackGap + linkH / 2;
        const checkoutY = linkY + linkH / 2 + stackGap + btnMaxH / 2;
        const noteY = checkoutY + btnMaxH / 2 + stackGap;
        const noteBottom = noteY + m.H * 0.02;
        this._columnWell(m, cx, top + sectionH * 0.28, noteBottom + wellPadY, w);

        this._sectionPill(m, cx, top + sectionH / 2, 'STILL NEEDED');

        let hint = null;
        const list = this._scrollList(m, cx, listTop, innerW + padX * 0.5, viewH, contentH, (offset, maxScroll) => {
            if (!hint?.active) return;
            hint.setVisible(offset < maxScroll - 1);
        });
        items.forEach((item, i) => {
            const y = needH / 2 + i * (needH + rowGap);
            this._drawNeededRow(m, list, 0, y, innerW, needH, item);
        });
        if (hintH > 0) hint = this._drawScrollHint(m, cx, afterRows + hintH * 0.55);

        this._drawActionButton(m, cx, continueY, innerW, btnMaxH, SP.blueButton, 'CONTINUE', NEC.cart, () => {
            this._close(() => this._onContinue?.());
        });

        this._drawLink(m, cx, linkY, 'Find Remaining Items', () => {
            this._close(() => this._onFindRemaining?.());
        });

        this._drawActionButton(m, cx, checkoutY, innerW, btnMaxH, SP.greenButton, 'CHECKOUT  →', null, () => {
            this._close(() => this._onCheckout?.());
        });

        const missing = items.length;
        this.add(this._text(cx, noteY, `${missing} Items still needed`, {
            fontSize: `${m.fs(TYPE.note)}px`,
            color: C_MUTED,
        }).setOrigin(0.5, 0));
    }

    _drawScrollHint (m, x, y) {
        const size = Math.max(8, m.H * 0.009);
        const wrap = this.scene.add.container(x, y);
        const g = this.scene.add.graphics();
        const thick = Math.max(3.2, 3.6 * m.s);
        const arm = (x1, y1, x2, y2) => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy) || 1;
            const nx = (-dy / len) * thick * 0.5;
            const ny = (dx / len) * thick * 0.5;
            return [
                { x: x1 + nx, y: y1 + ny },
                { x: x2 + nx, y: y2 + ny },
                { x: x2 - nx, y: y2 - ny },
                { x: x1 - nx, y: y1 - ny },
            ];
        };
        const chevron = (oy) => {
            const w = size;
            const h = size * 0.62;
            g.fillPoints(arm(-w, oy - h, 0, oy), true);
            g.fillPoints(arm(w, oy - h, 0, oy), true);
            g.fillCircle(-w, oy - h, thick * 0.5);
            g.fillCircle(w, oy - h, thick * 0.5);
            g.fillCircle(0, oy, thick * 0.55);
        };
        g.fillStyle(0x7A3FE0, 1);
        chevron(-size * 0.38);
        chevron(size * 0.34);
        wrap.add(g);
        this.add(wrap);
        this._scrollHint = wrap;
        this._scrollHintTween = this.scene.tweens.add({
            targets: wrap,
            y: y + size * 0.28,
            duration: 520,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
        return wrap;
    }

    _stopScrollHint () {
        if (this._scrollHintTween) {
            this._scrollHintTween.stop();
            this._scrollHintTween = null;
        }
        this._scrollHint = null;
    }

    _drawNeededRow (m, parent, cx, cy, w, h, item) {
        this._addTo(parent, this._slice(cx, cy, MISSION_DESC_KEYS.baseN, w, h, Math.floor(h * 0.45)));
        const r = h * 0.16;
        const radioX = cx - w / 2 + h * 0.38;
        const g = this.scene.add.graphics();
        g.lineStyle(Math.max(2, 2.5 * m.s), 0xC8C0D4, 1);
        g.strokeCircle(radioX, cy, r);
        this._addTo(parent, g);

        const slot = h * 0.72;
        const key = this.scene.textures.exists(item.textureKey) ? item.textureKey : VC.milk;
        const icon = this.scene.add.image(radioX + r + slot * 0.55, cy, key);
        this._fitContain(icon, slot, slot);
        this._addTo(parent, icon);

        const nameStyle = {
            fontSize: `${m.fs(TYPE.needed)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        };
        const nameX = icon.x + icon.displayWidth / 2 + m.W * 0.006;
        this._addTo(parent, this._text(nameX, cy, this._wrap(item.name, w * 0.48, nameStyle), nameStyle).setOrigin(0, 0.5));
    }

    _drawActionButton (m, cx, cy, maxW, maxH, key, label, iconKey, onClick) {
        const wrap = this.scene.add.container(cx, cy);
        this.add(wrap);

        const img = this.scene.add.image(0, 0, key);
        const { w, h } = this._fitButton(img, maxW, maxH);
        wrap.add(img);

        const labelText = this._text(0, 0, label, {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        wrap.add(labelText);

        // Keep the label (and icon) inside the pill, clear of the rounded ends.
        const innerMax = w - h * 1.35;
        if (iconKey && this.scene.textures.exists(iconKey)) {
            const iconS = h * 0.38;
            const icon = this.scene.add.image(0, 0, iconKey);
            this._fitContain(icon, iconS, iconS);
            icon.setTint(0xffffff);
            wrap.add(icon);
            const gap = m.W * 0.006;
            this._shrinkToWidth(labelText, innerMax - icon.displayWidth - gap);
            const total = icon.displayWidth + gap + labelText.width;
            icon.x = -total / 2 + icon.displayWidth / 2;
            labelText.x = icon.x + icon.displayWidth / 2 + gap + labelText.width / 2;
        } else {
            this._shrinkToWidth(labelText, innerMax);
        }

        const hit = this.scene.add.rectangle(0, 0, w, h, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => this._hoverScale(wrap, 1.03));
        hit.on('pointerout', () => this._hoverScale(wrap, 1));
        hit.on('pointerup', onClick);
        wrap.add(hit);
    }

    _hoverScale (target, scale) {
        this.scene.tweens.killTweensOf(target);
        this.scene.tweens.add({
            targets: target,
            scaleX: scale,
            scaleY: scale,
            duration: 120,
            ease: 'Quad.easeOut',
        });
    }

    _shrinkToWidth (text, maxW) {
        let size = parseInt(text.style.fontSize, 10) || 16;
        while (text.width > maxW && size > 11) {
            size -= 1;
            text.setFontSize(size);
        }
        return text;
    }

    _drawLink (m, cx, cy, label, onClick) {
        const style = {
            fontSize: `${m.fs(TYPE.link)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_LINK,
        };
        const text = this._text(cx, cy, label, style).setOrigin(0.5, 0.5);
        this.add(text);
        const line = this.scene.add.rectangle(cx, cy + text.height * 0.42, text.width, Math.max(2, 2 * m.s), 0x2F6FE0);
        this.add(line);
        const hit = this.scene.add.rectangle(cx, cy, text.width + 8, text.height + 8, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerup', onClick);
        this.add(hit);
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
