import Phaser from 'phaser';
import config from '../../utils/config.js';
import { addCauseText, setCauseText, wrapCause } from '../../utils/gameText.js';
import { CHECKOUT_TEXTURE_KEYS } from '../../config/checkoutAssets.js';
import { resolveItem } from '../../../../utils/gameApi.js';

const PANEL_W = 1240;
const PANEL_H = 720;
const HEADER_H = 82;
const BODY_PAD = 22;
const LEFT_W = 300;
const RIGHT_W = PANEL_W - LEFT_W - BODY_PAD * 3;
const ICON_SIZE = 48;
const STATUS_BTN_W = 112;
const STATUS_BTN_H = 45;
const STAR_SIZE = 28;

const C_WHITE = '#ffffff';
const C_NAVY = '#1e3a5f';
const C_MUTED = '#8a9ab0';
const C_GREEN = '#27ae60';
const C_RED = '#c0392b';
const C_ORANGE = '#e67e22';
const C_SCORE_HDR = 0x1e3a5f;
const C_PANEL_BODY = 0xc5ccd8;
const C_PANEL_BORDER = 0x8a96a8;
const SCORE_HDR_H = 48;
const SCORE_CORNER_R = 12;
const LIST_HDR_H = 48;
const LIST_CORNER_R = 12;
const C_ROW_A = 0xffffff;
const C_ROW_B = 0xf0f3f8;

function formatItemName(entry = {}) {
    const resolved = resolveItem(entry.key);
    if (resolved?.label) return resolved.label;
    const key = entry.key ?? '';
    return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export default class CheckoutPanel extends Phaser.GameObjects.Container {
    constructor(scene, x = config.centerX, y = config.centerY) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(600);
        this.setVisible(false);
    }

    open({ entries = [], cartTotal = 0, budget = 0, onClose = () => { } } = {}) {
        this._onClose = onClose;
        const items = entries.filter(Boolean);
        const matched = items.filter((e) => (e.collected ?? 0) >= (e.required ?? 1)).length;
        const total = items.length;
        const pct = total > 0 ? matched / total : 0;
        const overBudget = budget > 0 && cartTotal > budget;
        const starCount = (pct >= 1 && !overBudget) ? 3 : (pct >= 1 ? 2 : (pct >= 0.5 ? 1 : 0));

        this.removeAll(true);

        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x0a1a30, 0.72);
        ov.setInteractive();
        this.add(ov);

        this._drawFrame();
        this._drawHeader();
        this._drawCloseButton();
        this._drawScorePanel(matched, total, pct, overBudget, cartTotal, budget, starCount);
        this._drawItemPanel(items, matched, total, overBudget);

        this.setVisible(true);
        this.setAlpha(0);
        this.setScale(0.9);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 360,
            ease: 'Back.easeOut',
        });

        if (pct >= 1 && !overBudget) this._launchConfetti(total);
    }

    _pt() { return -PANEL_H / 2; }
    _pl() { return -PANEL_W / 2; }
    _bodyTop() { return this._pt() + HEADER_H + BODY_PAD; }
    _bodyH() { return PANEL_H - HEADER_H - BODY_PAD * 2; }

    _drawFrame () {
        const pl = this._pl();
        const pt = this._pt();
        const g = this.scene.add.graphics();

        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(pl - 5, pt - 5, PANEL_W + 10, PANEL_H + 10, SCORE_CORNER_R + 3);

        g.fillStyle(C_PANEL_BODY, 1);
        g.fillRoundedRect(pl, pt, PANEL_W, PANEL_H, SCORE_CORNER_R);

        g.fillStyle(C_SCORE_HDR, 1);
        g.fillRoundedRect(pl, pt, PANEL_W, HEADER_H, {
            tl: SCORE_CORNER_R,
            tr: SCORE_CORNER_R,
            bl: 0,
            br: 0,
        });

        g.lineStyle(2, C_PANEL_BORDER, 1);
        g.strokeRoundedRect(pl, pt, PANEL_W, PANEL_H, SCORE_CORNER_R);

        this.add(g);
    }

    _drawHeader() {
        const pl = this._pl();
        const pt = this._pt();
        const hCY = pt + HEADER_H / 2 + 2;

        const cart = this.scene.add.image(pl + 58, hCY, CHECKOUT_TEXTURE_KEYS.cartIcon);
        cart.setDisplaySize(36, 36);
        this.add(cart);

        this.add(addCauseText(this.scene, pl + 92, hCY, 'CHECKOUT SUMMARY', {
            fontSize: '34px',
            fontStyle: 'bold',
            color: C_WHITE,
        }).setOrigin(0, 0.5));
    }

    _drawCloseButton() {
        const pt = this._pt();
        const size = 50;
        const closeBtn = this.scene.add.image(
            PANEL_W / 2 - size / 2 + 16,
            pt - 12,
            CHECKOUT_TEXTURE_KEYS.closeButton,
        );
        closeBtn.setDisplaySize(size, size);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerup', () => this._close());
        this.add(closeBtn);
    }

    _drawPanelShell (centerX, panelTop, panelW, panelH, headerH = SCORE_HDR_H, cornerR = SCORE_CORNER_R) {
        const left = centerX - panelW / 2;
        const g = this.scene.add.graphics();

        g.fillStyle(C_PANEL_BODY, 1);
        g.fillRoundedRect(left, panelTop, panelW, panelH, cornerR);

        g.fillStyle(C_SCORE_HDR, 1);
        g.fillRoundedRect(left, panelTop, panelW, headerH, {
            tl: cornerR,
            tr: cornerR,
            bl: 0,
            br: 0,
        });

        g.lineStyle(2, C_PANEL_BORDER, 1);
        g.strokeRoundedRect(left, panelTop, panelW, panelH, cornerR);

        this.add(g);
    }

    _drawScorePanelShell (cardX, panelTop, panelH) {
        this._drawPanelShell(cardX, panelTop, LEFT_W, panelH);
    }

    _drawListPanelShell (panelX, panelTop, panelH) {
        this._drawPanelShell(panelX, panelTop, RIGHT_W, panelH, LIST_HDR_H, LIST_CORNER_R);
    }

    _drawScorePanel (matched, total, pct, overBudget, cartTotal, budget, starCount) {
        const pl = this._pl();
        const bodyTop = this._bodyTop();
        const bodyH = this._bodyH();
        const cardX = pl + BODY_PAD + LEFT_W / 2;
        const panelTop = bodyTop;
        const panelH = bodyH;

        this._drawScorePanelShell(cardX, panelTop, panelH);

        const tabY = panelTop + SCORE_HDR_H / 2;
        const trophy = this.scene.add.image(cardX - 52, tabY, CHECKOUT_TEXTURE_KEYS.trophy);
        trophy.setDisplaySize(28, 28);
        this.add(trophy);

        this.add(addCauseText(this.scene, cardX + 4, tabY, 'SCORE', {
            fontSize: '18px',
            fontStyle: 'bold',
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const ringY = panelTop + SCORE_HDR_H + 78;
        const ringSize = 126;
        const ringBase = this.scene.add.image(cardX, ringY, CHECKOUT_TEXTURE_KEYS.progressBase);
        ringBase.setDisplaySize(ringSize, ringSize);
        this.add(ringBase);

        const arcG = this.scene.add.graphics();
        this.add(arcG);
        const arcColor = (pct >= 1 && !overBudget) ? 0x27ae60 : (pct >= 1 ? 0xe74c3c : 0x27ae60);
        const proxy = { t: 0 };
        this.scene.tweens.add({
            targets: proxy,
            t: pct,
            duration: 1000,
            delay: 350,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                arcG.clear();
                if (proxy.t <= 0) return;
                arcG.lineStyle(10, arcColor, 1);
                arcG.beginPath();
                arcG.arc(cardX, ringY, ringSize * 0.44, -Math.PI / 2,
                    -Math.PI / 2 + proxy.t * Math.PI * 2, false);
                arcG.strokePath();
            },
        });

        const numT = addCauseText(this.scene, cardX, ringY - 9, '0', {
            fontSize: '52px',
            fontStyle: 'bold',
            color: C_NAVY,
        }).setOrigin(0.5, 0.5);
        this.add(numT);
        const ctr = { n: 0 };
        this.scene.tweens.add({
            targets: ctr,
            n: matched,
            duration: 1000,
            delay: 350,
            ease: 'Cubic.easeOut',
            onUpdate: () => setCauseText(numT, `${Math.round(ctr.n)}`),
        });

        this.add(addCauseText(this.scene, cardX, ringY + 23, `of ${total} items`, {
            fontSize: '16px',
            color: C_MUTED,
        }).setOrigin(0.5, 0.5));

        const matchedY = ringY + ringSize / 2 + 20;
        this.add(addCauseText(this.scene, cardX, matchedY, 'items matched', {
            fontSize: '16px',
            color: C_MUTED,
        }).setOrigin(0.5, 0));

        const starY = matchedY + 36;
        const starGap = 36;
        for (let i = 0; i < 3; i++) {
            const starKey = i < starCount
                ? CHECKOUT_TEXTURE_KEYS.starFilled
                : CHECKOUT_TEXTURE_KEYS.starEmpty;
            const star = this.scene.add.image(cardX - starGap + i * starGap, starY, starKey);
            star.setDisplaySize(STAR_SIZE, STAR_SIZE);
            star.setAlpha(0);
            this.add(star);
            this.scene.tweens.add({
                targets: star,
                alpha: 1,
                duration: 300,
                delay: 820 + i * 110,
                ease: 'Quad.easeOut',
            });
        }

        const panelBottom = panelTop + panelH;
        const savedY = panelBottom - 26;
        const spentY = panelBottom - 62;
        const totalLabelY = panelBottom - 90;
        const sepY = panelBottom - 124;

        const dotted = this.scene.add.image(cardX, sepY, CHECKOUT_TEXTURE_KEYS.dottedLine);
        dotted.setDisplaySize(LEFT_W - 40, 8);
        this.add(dotted);

        const aed = this.scene.add.image(cardX - 68, totalLabelY, CHECKOUT_TEXTURE_KEYS.aedIcon);
        aed.setDisplaySize(20, 20);
        this.add(aed);

        this.add(addCauseText(this.scene, cardX - 44, totalLabelY, 'TOTAL SPENT', {
            fontSize: '14px',
            fontStyle: 'bold',
            color: C_MUTED,
        }).setOrigin(0, 0.5));

        const spentStr = budget > 0 ? `AED ${cartTotal} / AED ${budget}` : `AED ${cartTotal}`;
        this.add(addCauseText(this.scene, cardX, spentY, spentStr, {
            fontSize: '23px',
            fontStyle: 'bold',
            color: overBudget ? C_RED : C_NAVY,
        }).setOrigin(0.5, 0.5));

        if (budget > 0) {
            const noteStr = overBudget
                ? `AED ${cartTotal - budget} over budget`
                : `AED ${budget - cartTotal} saved!`;
            const noteColor = overBudget ? C_RED : C_GREEN;

            if (!overBudget) {
                const gift = this.scene.add.image(cardX - 68, savedY, CHECKOUT_TEXTURE_KEYS.giftIcon);
                gift.setDisplaySize(22, 22);
                this.add(gift);
            }

            this.add(addCauseText(this.scene, cardX - (overBudget ? 0 : 44), savedY, noteStr, {
                fontSize: '16px',
                fontStyle: 'bold',
                color: noteColor,
            }).setOrigin(overBudget ? 0.5 : 0, 0.5));
        }
    }

    _drawItemPanel (items, matched, total, overBudget) {
        const pl = this._pl();
        const bodyTop = this._bodyTop();
        const bodyH = this._bodyH();
        const panelX = pl + BODY_PAD + LEFT_W + BODY_PAD + RIGHT_W / 2;
        const panelTop = bodyTop;
        const panelH = bodyH;

        this._drawListPanelShell(panelX, panelTop, panelH);

        const innerPad = 18;
        const innerLeft = panelX - RIGHT_W / 2 + innerPad;
        const innerW = RIGHT_W - innerPad * 2;
        const hdrY = panelTop + LIST_HDR_H / 2;

        const colIcon = innerLeft + 30;
        const colName = innerLeft + 66;
        const colReq = innerLeft + innerW * 0.55;
        const colCart = innerLeft + innerW * 0.72;
        const colStatus = innerLeft + innerW * 0.90;

        const hdrStyle = {
            fontSize: '16px',
            fontStyle: 'bold',
            color: C_WHITE,
        };
        this.add(addCauseText(this.scene, colName, hdrY, 'ITEM', hdrStyle).setOrigin(0, 0.5));
        this.add(addCauseText(this.scene, colReq, hdrY, 'REQUIRED', hdrStyle).setOrigin(1, 0.5));
        this.add(addCauseText(this.scene, colCart, hdrY, 'IN CART', hdrStyle).setOrigin(1, 0.5));
        this.add(addCauseText(this.scene, colStatus, hdrY, 'STATUS', hdrStyle).setOrigin(0.5, 0.5));

        const summaryH = 52;
        const summaryGap = 16;
        const summaryY = panelTop + panelH - summaryH - summaryGap;
        const rowsPad = 14;
        const rowTop = panelTop + LIST_HDR_H + rowsPad;
        const rowCount = Math.max(items.length, 1);
        const listBodyH = summaryY - rowsPad - rowTop;

        // Rows share the available height evenly (clamped) instead of packing to a fixed
        // size and leaving a large dead gap above the summary box when there are few items.
        const rowH = Phaser.Math.Clamp(listBodyH / rowCount, 50, 100);
        const usedH = rowH * rowCount;
        const rowsTop = rowTop + Math.max(0, (listBodyH - usedH) / 2);

        const listBody = this.scene.add.graphics();
        listBody.fillStyle(0xffffff, 1);
        listBody.fillRoundedRect(innerLeft, rowTop, innerW, listBodyH, 8);
        this.add(listBody);

        items.forEach((entry, i) => {
            const rowCY = rowsTop + i * rowH + rowH / 2;
            this._drawRow(entry, rowCY, innerLeft, innerW, colIcon, colName, colReq, colCart, colStatus, rowH, i);
        });

        const allDone = matched === total && total > 0;
        let msg;
        let msgColor;
        if (allDone && overBudget) {
            msg = 'All matched, but you went over budget!';
            msgColor = C_ORANGE;
        } else if (allDone) {
            msg = `All ${total} items matched – amazing shopping!`;
            msgColor = C_GREEN;
        } else {
            msg = `Nice try ${matched} of ${total} matched - grab the rest next time.`;
            msgColor = C_GREEN;
        }

        const box = this.scene.add.graphics();
        box.fillStyle(0xe8f8ef, 1);
        box.fillRoundedRect(innerLeft, summaryY, innerW, summaryH, 10);
        box.lineStyle(2, 0x27ae60, 0.55);
        box.strokeRoundedRect(innerLeft, summaryY, innerW, summaryH, 10);
        this.add(box);

        const summaryStyle = {
            fontSize: '18px',
            fontStyle: 'bold',
            color: msgColor,
            align: 'center',
        };
        const summaryT = addCauseText(
            this.scene,
            innerLeft + innerW / 2,
            summaryY + summaryH / 2,
            wrapCause(this.scene, msg, innerW - 24, summaryStyle),
            summaryStyle,
        ).setOrigin(0.5, 0.5).setAlpha(0);
        this.add(summaryT);
        this.scene.tweens.add({
            targets: summaryT,
            alpha: 1,
            duration: 320,
            delay: 220 + items.length * 55,
            ease: 'Quad.easeOut',
        });
    }

    _drawRow (entry, rowCY, innerLeft, innerW, colIcon, colName, colReq, colCart, colStatus, rowH, i) {
        const inCart = entry.collected ?? 0;
        const required = entry.required ?? 1;
        const done = inCart >= required;
        const rowTop = rowCY - rowH / 2;

        const rowG = this.scene.add.graphics();
        rowG.fillStyle(i % 2 === 0 ? C_ROW_A : C_ROW_B, 1);
        rowG.fillRect(innerLeft, rowTop, innerW, rowH);
        if (i > 0) {
            rowG.lineStyle(1, 0xd8dee8, 1);
            rowG.lineBetween(innerLeft, rowTop, innerLeft + innerW, rowTop);
        }
        rowG.setAlpha(0);
        this.add(rowG);

        const iconBg = this.scene.add.image(colIcon, rowCY, CHECKOUT_TEXTURE_KEYS.productBase);
        iconBg.setDisplaySize(ICON_SIZE, ICON_SIZE);
        iconBg.setAlpha(0);
        this.add(iconBg);

        let productImg = null;
        if (entry.textureKey && this.scene.textures.exists(entry.textureKey)) {
            productImg = this.scene.add.image(colIcon, rowCY, entry.textureKey).setOrigin(0.5, 0.5);
            const isFruit = entry.textureKey?.startsWith('product_fruits_') &&
                !entry.textureKey?.includes('tomato');
            const max = ICON_SIZE * (isFruit ? 0.8 : 0.66);
            const src = productImg.texture.getSourceImage();
            const s = Math.min(max / (src?.width || max), max / (src?.height || max));
            productImg.setDisplaySize((src?.width || max) * s, (src?.height || max) * s);
            productImg.setAlpha(0);
            this.add(productImg);
        }

        const nameT = addCauseText(this.scene, colName, rowCY, formatItemName(entry), {
            fontSize: '21px',
            fontStyle: 'bold',
            color: C_NAVY,
        }).setOrigin(0, 0.5).setAlpha(0);
        this.add(nameT);

        const reqT = addCauseText(this.scene, colReq, rowCY, `x${required}`, {
            fontSize: '21px',
            fontStyle: 'bold',
            color: C_NAVY,
        }).setOrigin(1, 0.5).setAlpha(0);
        this.add(reqT);

        const cartT = addCauseText(this.scene, colCart, rowCY, `x${inCart}`, {
            fontSize: '21px',
            fontStyle: 'bold',
            color: done ? C_GREEN : C_ORANGE,
        }).setOrigin(1, 0.5).setAlpha(0);
        this.add(cartT);

        const statusKey = done ? CHECKOUT_TEXTURE_KEYS.doneButton : CHECKOUT_TEXTURE_KEYS.missedButton;
        const statusBtn = this.scene.add.image(colStatus, rowCY, statusKey);
        statusBtn.setDisplaySize(STATUS_BTN_W, STATUS_BTN_H);
        statusBtn.setAlpha(0);
        this.add(statusBtn);

        const fadeTargets = [rowG, iconBg, nameT, reqT, cartT, statusBtn];
        if (productImg) fadeTargets.push(productImg);
        this.scene.tweens.add({
            targets: fadeTargets,
            alpha: 1,
            duration: 260,
            delay: 120 + i * 55,
            ease: 'Cubic.easeOut',
        });
    }

    _launchConfetti(total) {
        const COLORS = [0xff4444, 0xff9800, 0xffeb3b, 0x4caf50, 0x2196f3, 0x9c27b0, 0xff69b4, 0x00bcd4];
        this._confettiPieces = [];

        COLORS.forEach((color, i) => {
            const key = `__conf_${i}`;
            if (!this.scene.textures.exists(key)) {
                const gfx = this.scene.make.graphics({ x: 0, y: 0, add: false });
                gfx.fillStyle(color, 1);
                gfx.fillRect(0, 0, 10, 7);
                gfx.generateTexture(key, 10, 7);
                gfx.destroy();
            }
        });

        this.scene.time.delayedCall(240 + total * 70 + 320, () => {
            if (!this.active) return;
            const bursts = [
                { bx: 0, by: config.height + 50, speedX: { min: 100, max: 480 }, speedY: { min: -1000, max: -500 } },
                { bx: config.width, by: config.height + 50, speedX: { min: -480, max: -100 }, speedY: { min: -1000, max: -500 } },
            ];
            COLORS.forEach((_, idx) => {
                const { bx, by, speedX, speedY } = bursts[idx % bursts.length];
                const em = this.scene.add.particles(bx, by, `__conf_${idx}`, {
                    x: { min: -400, max: 400 },
                    y: { min: -700, max: -300 },
                    speedX,
                    speedY,
                    gravityY: 520,
                    rotate: { min: -360, max: 360 },
                    alpha: { start: 1, end: 0 },
                    lifespan: { min: 1800, max: 2600 },
                    quantity: 7,
                    frequency: 30,
                    duration: 300,
                    scale: { min: 0.9, max: 1.6 },
                });
                em.setDepth(700);
                this._confettiPieces.push(em);
                this.scene.time.delayedCall(2800, () => { if (em?.active) em.destroy(); });
            });
        });
    }

    _destroyConfetti() {
        this._confettiPieces?.forEach((e) => { if (e?.active) e.destroy(); });
        this._confettiPieces = [];
    }

    _close() {
        this._destroyConfetti();
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0.94,
            scaleY: 0.94,
            duration: 200,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.setScale(1);
                this.setVisible(false);
                this._onClose?.();
                window.location.reload();
            },
        });
    }
}
