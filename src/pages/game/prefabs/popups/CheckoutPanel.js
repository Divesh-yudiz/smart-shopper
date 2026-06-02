import Phaser from 'phaser';
import config from '../../utils/config.js';

// ── panel geometry ─────────────────────────────────────────────────────────────
const PANEL_W = 1300;
const PANEL_H = 790;
const CORNER_R = 24;
const HEADER_H = 100;
const SCORE_W = 320;
const DIVIDER_X = -PANEL_W / 2 + SCORE_W;      // -330
const SCORE_CX = -PANEL_W / 2 + SCORE_W / 2;  // -490

// table column positions (right section, panel-local)
const T_EDGE = DIVIDER_X + 28;   // -302  left edge of table
const T_ICON = T_EDGE + 38;      // -264  icon circle centre
const T_NAME = T_EDGE + 84;      // -218  item name (left-aligned)
const T_REQ = T_EDGE + 530;     // +228  required qty (centred)
const T_CART = T_EDGE + 668;     // +366  in-cart qty (centred)
const T_STATUS = T_EDGE + 840;     // +538  status pill centre

// row geometry
const HDR_ROW_Y = -PANEL_H / 2 + HEADER_H + 52;
const ROW_START = -PANEL_H / 2 + HEADER_H + 98;
const ROW_H = 68;
const ICON_R = 22;

// ── palette ────────────────────────────────────────────────────────────────────
const C_BG = 0xfffbf0;
const C_BORDER = 0xf5a623;
const C_HDR = 0xf5a623;
const C_DIVIDER = 0xfde68a;
const C_ROW_A = 0xfff8e1;
const C_ROW_B = 0xfffde7;
const C_WHITE = '#ffffff';
const C_NAVY = '#1a2d4a';
const C_BODY = '#3a5070';
const C_MUTED = '#9a8a6a';
const C_GREEN = '#27ae60';
const C_RED = '#c0392b';
const C_ORANGE = '#e67e22';

export default class CheckoutPanel extends Phaser.GameObjects.Container {
    constructor(scene, x = config.centerX, y = config.centerY) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(600);
        this.setVisible(false);
    }

    open ({ entries = [], cartTotal = 0, budget = 0, onClose = () => { } } = {}) {
        this._onClose = onClose;
        const items = entries.filter(Boolean);
        const matched = items.filter(e => (e.collected ?? 0) >= (e.required ?? 1)).length;
        const total = items.length;
        const pct = total > 0 ? matched / total : 0;
        const overBudget = budget > 0 && cartTotal > budget;

        // star count: 3 = perfect + under budget, 2 = all matched + over budget, 1 = ≥50%, 0 = <50%
        const starCount = (pct >= 1 && !overBudget) ? 3 : (pct >= 1 ? 2 : (pct >= 0.5 ? 1 : 0));

        this.removeAll(true);

        // dim overlay
        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x0a1a30, 0.72);
        ov.setInteractive();
        this.add(ov);

        this._drawPanelBg();
        this._drawHeader(starCount);
        this._drawScoreColumn(matched, total, pct, overBudget, cartTotal, budget, starCount);
        this._drawDivider();
        this._buildTable(items, matched, total, overBudget);
        this._buildDoneButton();

        this.setVisible(true);
        this.setAlpha(0);
        this.setScale(0.88);
        this.scene.tweens.add({
            targets: this, alpha: 1, scale: 1,
            duration: 380, ease: 'Back.easeOut',
        });

        if (pct >= 1 && !overBudget) this._launchConfetti(total);
    }

    // ── panel background ──────────────────────────────────────────────────────

    _drawPanelBg () {
        const g = this.scene.add.graphics();
        const PT = -PANEL_H / 2;

        // orange outer border
        g.fillStyle(C_BORDER, 1);
        g.fillRoundedRect(-PANEL_W / 2 - 5, PT - 5, PANEL_W + 10, PANEL_H + 10, CORNER_R + 4);

        // thin white inner ring
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(-PANEL_W / 2 - 1, PT - 1, PANEL_W + 2, PANEL_H + 2, CORNER_R + 1);

        // cream body
        g.fillStyle(C_BG, 1);
        g.fillRoundedRect(-PANEL_W / 2, PT, PANEL_W, PANEL_H, CORNER_R);

        this.add(g);
    }

    // ── orange header ─────────────────────────────────────────────────────────

    _drawHeader (starCount) {
        const g = this.scene.add.graphics();
        const PT = -PANEL_H / 2;

        g.fillStyle(C_HDR, 1);
        g.fillRoundedRect(-PANEL_W / 2, PT, PANEL_W, HEADER_H,
            { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 });

        // shine strip
        g.fillStyle(0xffffff, 0.22);
        g.fillRoundedRect(-PANEL_W / 2 + 4, PT + 3, PANEL_W - 8, HEADER_H * 0.44,
            { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 });

        // bottom shadow
        g.fillStyle(0x000000, 0.08);
        g.fillRect(-PANEL_W / 2, PT + HEADER_H - 5, PANEL_W, 5);
        this.add(g);

        const hCY = PT + HEADER_H / 2;

        // 🛒 icon left
        this.add(this.scene.add.text(-PANEL_W / 2 + 46, hCY, '🛒', { fontSize: '38px' })
            .setOrigin(0.5, 0.5));

        // title
        this.add(this.scene.add.text(-PANEL_W / 2 + 92, hCY, 'CHECKOUT SUMMARY', {
            fontFamily: config.fonts.text, fontSize: '38px', fontStyle: 'bold',
            color: C_WHITE, stroke: '#b87000', strokeThickness: 3,
        }).setOrigin(0, 0.5));

        // 3 stars top-right (filled / empty based on starCount)
        const starGap = 44, starR = 16;
        const starX0 = PANEL_W / 2 - 52 - starGap * 2;
        for (let i = 0; i < 3; i++) {
            const sg = this.scene.add.graphics();
            this._drawStarShape(sg, starX0 + i * starGap, hCY, starR, i < starCount);
            sg.setScale(0);
            this.add(sg);
            this.scene.tweens.add({
                targets: sg, scale: 1,
                duration: 340, delay: 700 + i * 110, ease: 'Back.easeOut',
            });
        }
    }

    // ── star polygon ──────────────────────────────────────────────────────────

    _drawStarShape (g, cx, cy, r, filled) {
        const inner = r * 0.42;
        if (filled) {
            g.fillStyle(0xffee44, 0.25);
            g.fillCircle(cx, cy, r * 1.65);
        }
        g.fillStyle(filled ? 0xffd700 : 0xd0c8b8, 1);
        if (filled) g.lineStyle(2, 0xffa500, 1);
        g.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const rad = i % 2 === 0 ? r : inner;
            i === 0
                ? g.moveTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad)
                : g.lineTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
        }
        g.closePath();
        g.fillPath();
        if (filled) g.strokePath();
    }

    // ── left score column ─────────────────────────────────────────────────────

    _drawScoreColumn (matched, total, pct, overBudget, cartTotal, budget, starCount) {
        const cx = SCORE_CX;
        const CR = 65;
        const cY = -PANEL_H / 2 + HEADER_H + 128;

        // column tint
        const col = this.scene.add.graphics();
        col.fillStyle(0xfff6d6, 0.62);
        col.fillRoundedRect(-PANEL_W / 2 + 10, -PANEL_H / 2 + HEADER_H + 8,
            SCORE_W - 20, PANEL_H - HEADER_H - 18, 14);
        this.add(col);

        // "🏆 SCORE"
        this.add(this.scene.add.text(cx, -PANEL_H / 2 + HEADER_H + 28, '🏆  SCORE', {
            fontFamily: config.fonts.text, fontSize: '20px', fontStyle: 'bold', color: '#b87000',
        }).setOrigin(0.5, 0.5));

        // track ring (beige)
        const trackG = this.scene.add.graphics();
        trackG.lineStyle(12, 0xe8d8a0, 1);
        trackG.strokeCircle(cx, cY, CR);
        this.add(trackG);

        // animated arc / full circle
        const arcColor = (pct >= 1 && !overBudget) ? 0x27ae60
            : (pct >= 1) ? 0xe74c3c
                : 0xf5a623;

        const arcG = this.scene.add.graphics();
        this.add(arcG);
        const proxy = { t: 0 };
        this.scene.tweens.add({
            targets: proxy, t: pct, duration: 1000, delay: 400, ease: 'Cubic.easeOut',
            onUpdate: () => {
                arcG.clear();
                if (proxy.t <= 0) return;
                arcG.lineStyle(12, arcColor, 1);
                arcG.beginPath();
                arcG.arc(cx, cY, CR, -Math.PI / 2, -Math.PI / 2 + proxy.t * Math.PI * 2, false);
                arcG.strokePath();
            },
        });

        // count-up number
        const numT = this.scene.add.text(cx, cY - 14, '0', {
            fontFamily: config.fonts.text, fontSize: '62px', fontStyle: 'bold', color: C_NAVY,
        }).setOrigin(0.5, 0.5);
        this.add(numT);
        const ctr = { n: 0 };
        this.scene.tweens.add({
            targets: ctr, n: matched, duration: 1000, delay: 400, ease: 'Cubic.easeOut',
            onUpdate: () => numT.setText(`${Math.round(ctr.n)}`),
        });

        this.add(this.scene.add.text(cx, cY + 24, `of ${total} items`, {
            fontFamily: config.fonts.text, fontSize: '17px', color: C_MUTED,
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.text(cx, cY + CR + 18, 'items matched', {
            fontFamily: config.fonts.text, fontSize: '17px', color: C_MUTED,
        }).setOrigin(0.5, 0));

        // 3 small stars below "items matched"
        const starGap = 42, starR = 13;
        const starX0 = cx - starGap;
        for (let i = 0; i < 3; i++) {
            const sg = this.scene.add.graphics();
            this._drawStarShape(sg, starX0 + i * starGap, cY + CR + 52, starR, i < starCount);
            sg.setScale(0);
            this.add(sg);
            this.scene.tweens.add({
                targets: sg, scale: 1,
                duration: 320, delay: 860 + i * 120, ease: 'Back.easeOut',
            });
        }

        // dashed horizontal separator
        const sepY = PANEL_H / 2 - 192;
        const sepG = this.scene.add.graphics();
        sepG.fillStyle(0xd4b87a, 0.80);
        for (let x = SCORE_CX - SCORE_W / 2 + 22; x < SCORE_CX + SCORE_W / 2 - 22; x += 10) {
            sepG.fillCircle(x, sepY, 2);
        }
        this.add(sepG);

        // "💰 TOTAL SPENT"
        this.add(this.scene.add.text(cx, sepY + 16, '💰  TOTAL SPENT', {
            fontFamily: config.fonts.text, fontSize: '15px', fontStyle: 'bold', color: C_MUTED,
        }).setOrigin(0.5, 0));

        // "AED X / AED Y"
        const spentStr = budget > 0 ? `AED ${cartTotal} / AED ${budget}` : `AED ${cartTotal}`;
        const spentColor = overBudget ? C_RED : C_NAVY;
        this.add(this.scene.add.text(cx, sepY + 42, spentStr, {
            fontFamily: config.fonts.text, fontSize: '26px', fontStyle: 'bold', color: spentColor,
        }).setOrigin(0.5, 0));

        // savings / over-budget note
        if (budget > 0) {
            const noteStr = overBudget
                ? `⚠  AED ${cartTotal - budget} over budget`
                : `🎉  AED ${budget - cartTotal} saved!`;
            const noteColor = overBudget ? C_RED : C_GREEN;
            this.add(this.scene.add.text(cx, sepY + 76, noteStr, {
                fontFamily: config.fonts.text, fontSize: '17px', color: noteColor,
            }).setOrigin(0.5, 0));
        }
    }

    // ── vertical divider ──────────────────────────────────────────────────────

    _drawDivider () {
        const g = this.scene.add.graphics();
        g.lineStyle(2, C_DIVIDER, 1);
        g.lineBetween(DIVIDER_X, -PANEL_H / 2 + HEADER_H + 10, DIVIDER_X, PANEL_H / 2 - 90);
        this.add(g);
    }

    // ── item table ────────────────────────────────────────────────────────────

    _buildTable (items, matched, total, overBudget) {
        const hStyle = {
            fontFamily: config.fonts.text, fontSize: '18px', fontStyle: 'bold', color: '#9a7a20',
        };
        [
            ['ITEM', T_NAME + 60],
            ['REQUIRED', T_REQ],
            ['IN CART', T_CART],
            ['STATUS', T_STATUS],
        ].forEach(([lbl, cx]) => {
            this.add(this.scene.add.text(cx, HDR_ROW_Y, lbl, hStyle).setOrigin(0.5, 0.5));
        });

        // header underline
        const hDiv = this.scene.add.graphics();
        hDiv.lineStyle(2, 0xfde68a, 1);
        hDiv.lineBetween(T_EDGE, HDR_ROW_Y + 16, PANEL_W / 2 - 20, HDR_ROW_Y + 16);
        this.add(hDiv);

        items.forEach((entry, i) => this._buildRow(entry, i));

        // summary message
        const allDone = matched === total && total > 0;
        let msg, msgColor;
        if (allDone && overBudget) {
            msg = '⚠️  All matched, but you went over budget!';
            msgColor = C_ORANGE;
        } else if (allDone) {
            msg = `🎉  All ${total} items matched – amazing shopping!`;
            msgColor = C_GREEN;
        } else {
            msg = `👍  Nice try! ${matched} of ${total} matched – grab the rest next time.`;
            msgColor = C_ORANGE;
        }

        const tableCX = (T_EDGE + PANEL_W / 2 - 20) / 2;
        const summaryT = this.scene.add.text(
            tableCX,
            ROW_START + total * ROW_H + 16,
            msg, {
            fontFamily: config.fonts.text, fontSize: '24px', fontStyle: 'bold', color: msgColor,
        }
        ).setOrigin(0.5, 0).setAlpha(0);
        this.add(summaryT);
        this.scene.tweens.add({
            targets: summaryT, alpha: 1,
            duration: 340, delay: 200 + total * 68 + 260, ease: 'Quad.easeOut',
        });

        if (allDone && !overBudget) this._launchConfetti(total);
    }

    // ── single row ────────────────────────────────────────────────────────────

    _buildRow (entry, i) {
        const ry = ROW_START + i * ROW_H;
        const inCart = entry.collected ?? 0;
        const required = entry.required ?? 1;
        const done = inCart >= required;
        const tableW = PANEL_W / 2 - T_EDGE - 20;

        const rowC = this.scene.add.container(0, ry + 14).setAlpha(0);
        this.add(rowC);
        this.scene.tweens.add({
            targets: rowC, y: ry, alpha: 1,
            duration: 280, delay: 160 + i * 68, ease: 'Cubic.easeOut',
        });

        // alternating stripe
        const stripe = this.scene.add.graphics();
        stripe.fillStyle(i % 2 === 0 ? C_ROW_A : C_ROW_B, 1);
        stripe.fillRoundedRect(T_EDGE - 8, -ROW_H / 2 + 3, tableW + 8, ROW_H - 6, 8);
        rowC.add(stripe);

        // green left accent (only matched rows)
        if (done) {
            const bar = this.scene.add.graphics();
            bar.fillStyle(0x27ae60, 1);
            bar.fillRoundedRect(T_EDGE - 8, -ROW_H / 2 + 3, 5, ROW_H - 6,
                { tl: 4, tr: 0, bl: 4, br: 0 });
            rowC.add(bar);
        }

        // icon circle (beige)
        const iconBg = this.scene.add.graphics();
        iconBg.fillStyle(0xf5eed6, 1);
        iconBg.fillCircle(T_ICON, 0, ICON_R);
        iconBg.lineStyle(1.5, 0xd4b87a, 0.60);
        iconBg.strokeCircle(T_ICON, 0, ICON_R);
        rowC.add(iconBg);

        if (entry.textureKey && this.scene.textures.exists(entry.textureKey)) {
            const img = this.scene.add.image(T_ICON, 0, entry.textureKey).setOrigin(0.5, 0.5);
            const max = (ICON_R - 3) * 2;
            const src = img.texture.getSourceImage();
            const s = Math.min(max / (src?.width || max), max / (src?.height || max));
            img.setScale(s);
            rowC.add(img);
        }

        // item name
        const name = (entry.key ?? '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
        rowC.add(this.scene.add.text(T_NAME, 0, name, {
            fontFamily: config.fonts.text, fontSize: '24px', color: C_NAVY,
        }).setOrigin(0, 0.5));

        // required qty (neutral)
        rowC.add(this.scene.add.text(T_REQ, 0, `×${required}`, {
            fontFamily: config.fonts.text, fontSize: '24px', fontStyle: 'bold', color: C_BODY,
        }).setOrigin(0.5, 0.5));

        // in-cart qty (green = done, red = not done)
        rowC.add(this.scene.add.text(T_CART, 0, `×${inCart}`, {
            fontFamily: config.fonts.text, fontSize: '24px', fontStyle: 'bold',
            color: done ? C_GREEN : C_RED,
        }).setOrigin(0.5, 0.5));

        // status pill
        const bW = 132, bH = 36;
        const pillBg = this.scene.add.graphics();
        pillBg.fillStyle(done ? 0x27ae60 : 0x90a4ae, 1);
        pillBg.fillRoundedRect(T_STATUS - bW / 2, -bH / 2, bW, bH, bH / 2);
        rowC.add(pillBg);

        rowC.add(this.scene.add.text(T_STATUS, 0, done ? '✓  Done' : 'Missed', {
            fontFamily: config.fonts.text, fontSize: '18px', fontStyle: 'bold', color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        // pulse matched rows
        if (done) {
            this.scene.time.delayedCall(160 + i * 68 + 320, () => {
                if (!rowC.active) return;
                this.scene.tweens.add({
                    targets: rowC, scaleX: 1.014, scaleY: 1.014,
                    duration: 130, yoyo: true, ease: 'Sine.easeInOut',
                });
            });
        }
    }

    // ── done button (centred in right section) ────────────────────────────────

    _buildDoneButton () {
        const btnW = 240;
        const btnH = 62;
        const btnX = (DIVIDER_X + PANEL_W / 2) / 2;   // centre of right section
        const btnY = PANEL_H / 2 - 44;

        const g = this.scene.add.graphics();
        const draw = (hover) => {
            g.clear();
            g.fillStyle(0x000000, 0.14);
            g.fillRoundedRect(btnX - btnW / 2 + 3, btnY - btnH / 2 + 5, btnW, btnH, btnH / 2);
            g.fillStyle(hover ? 0x219a52 : 0x27ae60, 1);
            g.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, btnH / 2);
            g.fillStyle(0xffffff, 0.20);
            g.fillRoundedRect(btnX - btnW / 2 + 4, btnY - btnH / 2 + 3, btnW - 8, btnH / 2 - 3, {
                tl: btnH / 2, tr: btnH / 2, bl: 0, br: 0,
            });
        };
        draw(false);
        this.add(g);

        const lbl = this.scene.add.text(btnX, btnY, '🎯  Done', {
            fontFamily: config.fonts.text, fontSize: '30px', fontStyle: 'bold',
            color: C_WHITE, stroke: '#14532d', strokeThickness: 2,
        }).setOrigin(0.5, 0.5);
        this.add(lbl);

        this.scene.tweens.add({
            targets: lbl, scaleX: 1.04, scaleY: 1.04,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        const hit = this.scene.add.rectangle(btnX, btnY, btnW, btnH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            draw(true);
            this.scene.tweens.killTweensOf(lbl);
            this.scene.tweens.add({ targets: lbl, scale: 1.08, duration: 80, ease: 'Quad.easeOut' });
        });
        hit.on('pointerout', () => {
            draw(false);
            this.scene.tweens.killTweensOf(lbl);
            this.scene.tweens.add({
                targets: lbl, scaleX: 1.04, scaleY: 1.04,
                duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        });
        hit.on('pointerup', () => this._close());
        this.add(hit);
    }

    // ── confetti ──────────────────────────────────────────────────────────────

    _launchConfetti (total) {
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
            COLORS.forEach((_, i) => {
                const { bx, by, speedX, speedY } = bursts[i % bursts.length];
                const em = this.scene.add.particles(bx, by, `__conf_${i}`, {
                    x: { min: -400, max: 400 }, y: { min: -700, max: -300 },
                    speedX, speedY, gravityY: 520,
                    rotate: { min: -360, max: 360 },
                    alpha: { start: 1, end: 0 },
                    lifespan: { min: 1800, max: 2600 },
                    quantity: 7, frequency: 30, duration: 300,
                    scale: { min: 0.9, max: 1.6 },
                });
                em.setDepth(700);
                this._confettiPieces.push(em);
                this.scene.time.delayedCall(2800, () => { if (em?.active) em.destroy(); });
            });
        });
    }

    _destroyConfetti () {
        this._confettiPieces?.forEach(e => { if (e?.active) e.destroy(); });
        this._confettiPieces = [];
    }

    // ── close ─────────────────────────────────────────────────────────────────

    _close () {
        this._destroyConfetti();
        this.scene.tweens.add({
            targets: this, alpha: 0, scale: 0.88, duration: 200, ease: 'Quad.easeIn',
            onComplete: () => {
                this.setVisible(false);
                this._onClose?.();      // clears ss_inGame + saved state
                window.location.reload(); // Boot re-runs → sees no ss_inGame → starts Home
            },
        });
    }
}
