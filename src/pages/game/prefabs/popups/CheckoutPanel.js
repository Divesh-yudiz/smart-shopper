import Phaser from 'phaser';
import config from '../../utils/config.js';

// ── panel geometry ─────────────────────────────────────────────────────────────
const PANEL_W = 1300;
const PANEL_H = 790;
const CORNER_R = 28;
const HEADER_H = 100;
const SCORE_W = 340;
const DIVIDER_X = -PANEL_W / 2 + SCORE_W;
const SCORE_CX = -PANEL_W / 2 + SCORE_W / 2;

// ── cartoon / kids palette ─────────────────────────────────────────────────────
const C_PANEL_BG = 0xfffbf0;   // warm sunny cream
const C_HDR_BASE = 0xf5a623;   // golden orange header
const C_BORDER_OUT = 0xf5a623;   // thick outer ring
const C_DIVIDER = 0xfde68a;   // soft yellow divider
const C_ROW_A = 0xfff8e1;   // alternating row A
const C_ROW_B = 0xfffde7;   // alternating row B

// text
const C_NAVY = '#1a2d4a';
const C_BODY = '#3a5070';
const C_MUTED = '#9a8a6a';
const C_WHITE = '#ffffff';

// status — vivid for kids
const C_GREEN_BG = 0x6ee68a;
const C_GREEN_TXT = '#155c2e';
const C_AMBER_BG = 0xffcc44;
const C_AMBER_TXT = '#7a5500';
const C_RED_BG = 0xff8585;
const C_RED_TXT = '#7a1515';

// table column x positions (panel-local)
const T_EDGE = DIVIDER_X + 28;
const T_ICON = T_EDGE + 30;
const T_NAME = T_EDGE + 76;
const T_REQ = T_EDGE + 530;
const T_CART = T_EDGE + 668;
const T_STATUS = T_EDGE + 840;

// row geometry
const HDR_ROW_Y = -PANEL_H / 2 + HEADER_H + 50;
const ROW_START = -PANEL_H / 2 + HEADER_H + 96;
const ROW_H = 70;
const ICON_R = 22;

export default class CheckoutPanel extends Phaser.GameObjects.Container {
    constructor(scene, x = config.centerX, y = config.centerY) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(600);
        this.setVisible(false);
    }

    open ({ entries = [], cartTotal = 0, budget = 0, onClose = () => { } } = {}) {
        this._onClose = onClose;
        this._activeEntries = entries.filter(Boolean);
        this.removeAll(true);
        this._buildPanel(cartTotal, budget);
        this.setVisible(true);
        this.setAlpha(0);
        this.setScale(0.88);
        this.scene.tweens.add({
            targets: this, alpha: 1, scale: 1,
            duration: 380, ease: 'Back.easeOut',
        });
    }

    // ── entry point ───────────────────────────────────────────────────────────

    _buildPanel (cartTotal, budget) {
        const entries = this._activeEntries;
        const total = entries.length;
        const matched = entries.filter(e => (e.collected ?? 0) >= (e.required ?? 1)).length;
        const pct = total > 0 ? matched / total : 0;

        this._drawOverlay();
        this._drawPanelBg();
        this._drawHeader(pct);
        this._buildCloseBtn();
        this._drawScoreColumn(matched, total, pct, cartTotal, budget);
        this._drawColumnDivider();
        this._buildTable(entries, matched, total);
        this._buildDoneButton();
    }

    // ── overlay ───────────────────────────────────────────────────────────────

    _drawOverlay () {
        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x0a1a30, 0.74);
        ov.setInteractive();
        this.add(ov);
    }

    // ── panel background ──────────────────────────────────────────────────────

    _drawPanelBg () {
        const g = this.scene.add.graphics();

        // thick outer border
        g.fillStyle(C_BORDER_OUT, 1);
        g.fillRoundedRect(-PANEL_W / 2 - 3, -PANEL_H / 2 - 3, PANEL_W + 6, PANEL_H + 6, CORNER_R + 2);

        // thin white inner ring
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(-PANEL_W / 2 - 1, -PANEL_H / 2 - 1, PANEL_W + 2, PANEL_H + 2, CORNER_R + 1);

        // panel body
        g.fillStyle(C_PANEL_BG, 1);
        g.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, CORNER_R);

        // subtle warm wash on lower half
        g.fillStyle(0xfff0c0, 0.28);
        g.fillRoundedRect(
            -PANEL_W / 2, PANEL_H / 6,
            PANEL_W, PANEL_H / 3,
            { tl: 0, tr: 0, bl: CORNER_R, br: CORNER_R }
        );

        this.add(g);
    }

    // ── header ────────────────────────────────────────────────────────────────

    _drawHeader (pct) {
        const g = this.scene.add.graphics();

        // base fill
        g.fillStyle(C_HDR_BASE, 1);
        g.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, HEADER_H,
            { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 });

        // top shine
        g.fillStyle(0xffffff, 0.22);
        g.fillRoundedRect(-PANEL_W / 2 + 4, -PANEL_H / 2 + 3, PANEL_W - 8, HEADER_H * 0.44,
            { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 });

        // bottom shadow strip
        g.fillStyle(0x000000, 0.08);
        g.fillRect(-PANEL_W / 2, -PANEL_H / 2 + HEADER_H - 5, PANEL_W, 5);

        this.add(g);

        // cart emoji
        this.add(this.scene.add.text(
            -PANEL_W / 2 + 52, -PANEL_H / 2 + HEADER_H / 2, '🛒', { fontSize: '40px' }
        ).setOrigin(0.5, 0.5));

        // title
        this.add(this.scene.add.text(
            -PANEL_W / 2 + 98, -PANEL_H / 2 + HEADER_H / 2,
            'CHECKOUT SUMMARY', {
            fontFamily: config.fonts.text,
            fontSize: '38px',
            fontStyle: 'bold',
            color: C_WHITE,
            stroke: '#b87000',
            strokeThickness: 3,
        }
        ).setOrigin(0, 0.5));

        // star emojis at top-right (fade in after animation)
        const starCount = pct >= 1 ? 3 : (pct >= 0.6 ? 2 : (pct >= 0.3 ? 1 : 0));
        if (starCount > 0) {
            const stars = '⭐'.repeat(starCount);
            const st = this.scene.add.text(
                PANEL_W / 2 - 190, -PANEL_H / 2 + HEADER_H / 2, stars, { fontSize: '28px' }
            ).setOrigin(0.5, 0.5).setAlpha(0);
            this.add(st);
            this.scene.tweens.add({ targets: st, alpha: 1, duration: 400, delay: 900, ease: 'Quad.easeOut' });
        }
    }

    // ── close button ─────────────────────────────────────────────────────────

    _buildCloseBtn () {
        const r = 18;
        const cx = PANEL_W / 2 - 38;
        const cy = -PANEL_H / 2 + HEADER_H / 2;

        const draw = (hover) => {
            g.clear();
            g.fillStyle(0xffffff, hover ? 0.38 : 0.22);
            g.fillCircle(cx, cy, r);
            const arm = r * 0.44;
            g.lineStyle(Math.max(2, r * 0.22), 0xffffff, 1);
            g.lineBetween(cx - arm, cy - arm, cx + arm, cy + arm);
            g.lineBetween(cx + arm, cy - arm, cx - arm, cy + arm);
        };

        const g = this.scene.add.graphics();
        draw(false);
        this.add(g);

        const hit = this.scene.add.rectangle(cx, cy, (r + 8) * 2, (r + 8) * 2, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => draw(true));
        hit.on('pointerout', () => draw(false));
        hit.on('pointerup', () => this._close());
        this.add(hit);
    }

    // ── left score column ─────────────────────────────────────────────────────

    _drawScoreColumn (matched, total, pct, cartTotal, budget) {
        const cx = SCORE_CX;
        const CR = 65;
        const cY = -PANEL_H / 2 + HEADER_H + 120;

        // column tint
        const colBg = this.scene.add.graphics();
        colBg.fillStyle(0xfff6d6, 0.65);
        colBg.fillRoundedRect(
            -PANEL_W / 2 + 10, -PANEL_H / 2 + HEADER_H + 8,
            SCORE_W - 20, PANEL_H - HEADER_H - 18, 16
        );
        this.add(colBg);

        // section label
        this.add(this.scene.add.text(cx, -PANEL_H / 2 + HEADER_H + 28, '🏆  SCORE', {
            fontFamily: config.fonts.text, fontSize: '20px', fontStyle: 'bold', color: '#b87000',
        }).setOrigin(0.5, 0.5));

        // track ring
        const trackG = this.scene.add.graphics();
        trackG.lineStyle(12, 0xe8d8a0, 1);
        trackG.strokeCircle(cx, cY, CR);
        this.add(trackG);

        // animated progress arc
        const arcColor = pct >= 1 ? 0x2ecc71 : (pct >= 0.5 ? 0xf5a623 : 0xff6b6b);
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
        const numT = this.scene.add.text(cx, cY - 12, '0', {
            fontFamily: config.fonts.text, fontSize: '58px', fontStyle: 'bold', color: C_NAVY,
        }).setOrigin(0.5, 0.5);
        this.add(numT);
        const ctr = { n: 0 };
        this.scene.tweens.add({
            targets: ctr, n: matched, duration: 1000, delay: 400, ease: 'Cubic.easeOut',
            onUpdate: () => numT.setText(`${Math.round(ctr.n)}`),
        });

        this.add(this.scene.add.text(cx, cY + 28, `of ${total} items`, {
            fontFamily: config.fonts.text, fontSize: '18px', color: C_MUTED,
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.text(cx, cY + CR + 18, 'items matched', {
            fontFamily: config.fonts.text, fontSize: '18px', color: C_MUTED,
        }).setOrigin(0.5, 0));

        // star rating (prominent)
        const starCount = pct >= 1 ? 3 : (pct >= 0.6 ? 2 : (pct >= 0.3 ? 1 : 0));
        this._buildStars(cx, cY + CR + 52, starCount);

        // separator
        const sepY = PANEL_H / 2 - 188;
        const sepG = this.scene.add.graphics();
        sepG.lineStyle(2, C_DIVIDER, 1);
        sepG.lineBetween(SCORE_CX - SCORE_W / 2 + 22, sepY, SCORE_CX + SCORE_W / 2 - 22, sepY);
        this.add(sepG);

        // budget info
        const overBudget = budget > 0 && cartTotal > budget;
        this.add(this.scene.add.text(cx, sepY + 16, '💰  TOTAL SPENT', {
            fontFamily: config.fonts.text, fontSize: '16px', fontStyle: 'bold', color: C_MUTED,
        }).setOrigin(0.5, 0));

        const spentLabel = budget > 0
            ? `AED ${cartTotal}  /  AED ${budget}`
            : `AED ${cartTotal}`;
        this.add(this.scene.add.text(cx, sepY + 40, spentLabel, {
            fontFamily: config.fonts.text, fontSize: '22px', fontStyle: 'bold',
            color: overBudget ? '#c0392b' : '#155c2e',
        }).setOrigin(0.5, 0));

        const extraMsg = overBudget
            ? '⚠  Over budget!'
            : (budget > 0 ? `🎉 AED ${budget - cartTotal} saved!` : null);
        if (extraMsg) {
            this.add(this.scene.add.text(cx, sepY + 70, extraMsg, {
                fontFamily: config.fonts.text, fontSize: '17px',
                color: overBudget ? '#c0392b' : '#155c2e',
            }).setOrigin(0.5, 0));
        }
    }

    // ── stars ─────────────────────────────────────────────────────────────────

    _buildStars (cx, sy, filledCount) {
        const GAP = 44;
        const SR = 15;
        for (let i = 0; i < 3; i++) {
            const g = this.scene.add.graphics();
            this._drawStar(g, cx - GAP + i * GAP, sy, SR, i < filledCount);
            g.setScale(0);
            this.add(g);
            this.scene.tweens.add({
                targets: g, scale: 1, duration: 340, delay: 840 + i * 130, ease: 'Back.easeOut',
            });
        }
    }

    _drawStar (g, cx, cy, r, filled) {
        const inner = r * 0.42;
        if (filled) {
            g.fillStyle(0xffee44, 0.28);
            g.fillCircle(cx, cy, r * 1.7);
        }
        g.fillStyle(filled ? 0xffd700 : 0xd8d0c0, 1);
        if (filled) g.lineStyle(2, 0xffa500, 1);
        g.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const rad = i % 2 === 0 ? r : inner;
            const px = cx + Math.cos(angle) * rad;
            const py = cy + Math.sin(angle) * rad;
            i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        if (filled) g.strokePath();
    }

    // ── column divider ────────────────────────────────────────────────────────

    _drawColumnDivider () {
        const g = this.scene.add.graphics();
        g.lineStyle(2, C_DIVIDER, 1);
        g.lineBetween(DIVIDER_X, -PANEL_H / 2 + HEADER_H + 10, DIVIDER_X, PANEL_H / 2 - 92);
        this.add(g);
    }

    // ── comparison table ──────────────────────────────────────────────────────

    _buildTable (entries, matched, total) {
        const hStyle = {
            fontFamily: config.fonts.text, fontSize: '18px', fontStyle: 'bold', color: '#9a7a20',
        };
        [
            ['ITEM', T_NAME + 40],
            ['REQUIRED', T_REQ],
            ['IN CART', T_CART],
            ['STATUS', T_STATUS],
        ].forEach(([lbl, cx]) => {
            this.add(this.scene.add.text(cx, HDR_ROW_Y, lbl, hStyle).setOrigin(0.5, 0.5));
        });

        const hDiv = this.scene.add.graphics();
        hDiv.lineStyle(2, 0xfde68a, 1);
        hDiv.lineBetween(T_EDGE, HDR_ROW_Y + 16, PANEL_W / 2 - 20, HDR_ROW_Y + 16);
        this.add(hDiv);

        entries.forEach((entry, i) => this._buildRow(entry, i));

        // summary message
        const allDone = matched === total && total > 0;
        const msg = allDone
            ? `🎉  All ${total} items matched — amazing shopping!`
            : `${matched} of ${total} item${total !== 1 ? 's' : ''} matched`;
        const msgColor = allDone ? C_GREEN_TXT : (matched > 0 ? C_AMBER_TXT : C_RED_TXT);

        const summaryT = this.scene.add.text(
            T_EDGE + (PANEL_W / 2 - T_EDGE - 20) / 2,
            ROW_START + total * ROW_H + 14,
            msg, {
            fontFamily: config.fonts.text, fontSize: '26px', fontStyle: 'bold', color: msgColor,
        }
        ).setOrigin(0.5, 0).setAlpha(0);
        this.add(summaryT);
        this.scene.tweens.add({
            targets: summaryT, alpha: 1, duration: 380,
            delay: 240 + total * 70 + 260, ease: 'Quad.easeOut',
        });

        if (allDone) this._launchConfetti(total);
    }

    // ── confetti ──────────────────────────────────────────────────────────────

    _launchConfetti (total) {
        const COLORS = [0xff4444, 0xff9800, 0xffeb3b, 0x4caf50, 0x2196f3, 0x9c27b0, 0xff69b4, 0x00bcd4];
        this._confettiPieces = [];

        // Build a small rectangle texture per colour (once per session)
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

        const launchDelay = 240 + total * 70 + 320;

        // Two firecracker launch points: bottom corners of the game screen
        const bursts = [
            { bx: 0, by: config.height + 50, speedX: { min: 100, max: 480 }, speedY: { min: -1000, max: -500 } },
            { bx: config.width, by: config.height + 50, speedX: { min: -480, max: -100 }, speedY: { min: -1000, max: -500 } },
        ];

        this.scene.time.delayedCall(launchDelay, () => {
            if (!this.active) return;
            COLORS.forEach((_, i) => {
                const { bx, by, speedX, speedY } = bursts[i % bursts.length];
                const emitter = this.scene.add.particles(bx, by, `__conf_${i}`, {
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
                emitter.setDepth(700);
                this._confettiPieces.push(emitter);

                this.scene.time.delayedCall(2800, () => {
                    if (emitter?.active) emitter.destroy();
                });
            });
        });
    }

    _destroyConfetti () {
        if (!this._confettiPieces) return;
        this._confettiPieces.forEach(e => { if (e?.active) e.destroy(); });
        this._confettiPieces = [];
    }

    _buildRow (entry, i) {
        const ry = ROW_START + i * ROW_H;
        const inCart = entry.collected ?? 0;
        const required = entry.required ?? 1;
        const matched = inCart >= required;
        const partial = !matched && inCart > 0;
        const tableW = PANEL_W / 2 - T_EDGE - 20;

        const rowC = this.scene.add.container(0, ry + 14).setAlpha(0);
        this.add(rowC);
        this.scene.tweens.add({
            targets: rowC, y: ry, alpha: 1,
            duration: 300, delay: 180 + i * 68, ease: 'Cubic.easeOut',
        });

        // row stripe
        const stripe = this.scene.add.graphics();
        stripe.fillStyle(i % 2 === 0 ? C_ROW_A : C_ROW_B, 1);
        stripe.fillRoundedRect(T_EDGE - 8, -ROW_H / 2 + 3, tableW + 8, ROW_H - 6, 8);
        rowC.add(stripe);

        // colored left accent bar
        const stripColor = matched ? 0x2ecc71 : (partial ? 0xf5a623 : 0xff6b6b);
        const accentBar = this.scene.add.graphics();
        accentBar.fillStyle(stripColor, 1);
        accentBar.fillRoundedRect(T_EDGE - 8, -ROW_H / 2 + 3, 5, ROW_H - 6,
            { tl: 4, tr: 0, bl: 4, br: 0 });
        rowC.add(accentBar);

        // hover highlight
        const hoverBg = this.scene.add.graphics();
        rowC.add(hoverBg);
        const drawHover = (on) => {
            hoverBg.clear();
            if (!on) return;
            hoverBg.fillStyle(0xf5a623, 0.1);
            hoverBg.fillRoundedRect(T_EDGE - 8, -ROW_H / 2 + 3, tableW + 8, ROW_H - 6, 8);
        };

        // icon circle
        const iconFill = matched ? 0xd4f9e0 : (partial ? 0xfff3c4 : 0xffe8e8);
        const iconStroke = matched ? 0x2ecc71 : (partial ? 0xf5a623 : 0xff6b6b);
        const iconBg = this.scene.add.graphics();
        iconBg.fillStyle(iconFill, 1);
        iconBg.fillCircle(T_ICON, 0, ICON_R);
        iconBg.lineStyle(2.5, iconStroke, 1);
        iconBg.strokeCircle(T_ICON, 0, ICON_R);
        rowC.add(iconBg);

        if (entry.textureKey && this.scene.textures.exists(entry.textureKey)) {
            const img = this.scene.add.image(T_ICON, 0, entry.textureKey).setOrigin(0.5, 0.5);
            const max = (ICON_R - 4) * 2;
            const src = img.texture.getSourceImage();
            const s = Math.min(max / (src?.width || max), max / (src?.height || max));
            img.setScale(s);
            rowC.add(img);
        }

        // item name
        rowC.add(this.scene.add.text(T_NAME, 0,
            (entry.key ?? '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
            { fontFamily: config.fonts.text, fontSize: '24px', color: C_NAVY }
        ).setOrigin(0, 0.5));

        // required qty
        rowC.add(this.scene.add.text(T_REQ, 0, `× ${required}`, {
            fontFamily: config.fonts.text, fontSize: '24px', fontStyle: 'bold', color: C_BODY,
        }).setOrigin(0.5, 0.5));

        // cart qty
        rowC.add(this.scene.add.text(T_CART, 0, `× ${inCart}`, {
            fontFamily: config.fonts.text, fontSize: '24px', fontStyle: 'bold',
            color: matched ? C_GREEN_TXT : (partial ? C_AMBER_TXT : C_RED_TXT),
        }).setOrigin(0.5, 0.5));

        // status pill
        const badgeW = 146, badgeH = 34;
        const badgeBg = this.scene.add.graphics();
        badgeBg.fillStyle(matched ? C_GREEN_BG : (partial ? C_AMBER_BG : C_RED_BG), 1);
        badgeBg.fillRoundedRect(T_STATUS - badgeW / 2, -badgeH / 2, badgeW, badgeH, badgeH / 2);
        badgeBg.lineStyle(2, matched ? 0x27ae60 : (partial ? 0xe67e22 : 0xe74c3c), 0.8);
        badgeBg.strokeRoundedRect(T_STATUS - badgeW / 2, -badgeH / 2, badgeW, badgeH, badgeH / 2);
        rowC.add(badgeBg);

        rowC.add(this.scene.add.text(T_STATUS, 0,
            matched ? '✓  DONE' : (partial ? '~  PARTIAL' : '✗  MISSING'),
            {
                fontFamily: config.fonts.text, fontSize: '18px', fontStyle: 'bold',
                color: matched ? C_GREEN_TXT : (partial ? C_AMBER_TXT : C_RED_TXT),
            }
        ).setOrigin(0.5, 0.5));

        // hit zone for hover
        const hit = this.scene.add.rectangle(T_EDGE - 8 + tableW / 2, 0, tableW + 8, ROW_H - 4, 0, 0);
        hit.setInteractive();
        hit.on('pointerover', () => drawHover(true));
        hit.on('pointerout', () => drawHover(false));
        rowC.add(hit);

        // pulse matched rows after slide-in
        if (matched) {
            this.scene.time.delayedCall(180 + i * 68 + 340, () => {
                this.scene.tweens.add({
                    targets: rowC, scaleX: 1.016, scaleY: 1.016,
                    duration: 140, yoyo: true, ease: 'Sine.easeInOut',
                });
            });
        }
    }

    // ── done button ───────────────────────────────────────────────────────────

    _buildDoneButton () {
        const btnW = 230;
        const btnH = 58;
        const btnY = PANEL_H / 2 - 44;

        const draw = (hover) => {
            g.clear();
            g.fillStyle(0x000000, 0.14);
            g.fillRoundedRect(-btnW / 2 + 3, btnY - btnH / 2 + 5, btnW, btnH, btnH / 2);
            g.fillStyle(hover ? 0x27ae60 : 0x2ecc71, 1);
            g.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, btnH / 2);
            g.fillStyle(0xffffff, 0.22);
            g.fillRoundedRect(-btnW / 2 + 4, btnY - btnH / 2 + 3, btnW - 8, btnH / 2 - 3,
                { tl: btnH / 2, tr: btnH / 2, bl: 0, br: 0 });
            g.lineStyle(2.5, hover ? 0x1a9150 : 0x27ae60, 0.9);
            g.strokeRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, btnH / 2);
        };

        const g = this.scene.add.graphics();
        draw(false);
        this.add(g);

        const lbl = this.scene.add.text(0, btnY, '🎯  DONE', {
            fontFamily: config.fonts.text, fontSize: '28px', fontStyle: 'bold',
            color: C_WHITE, stroke: '#1a7a3a', strokeThickness: 2,
        }).setOrigin(0.5, 0.5);
        this.add(lbl);

        const hit = this.scene.add.rectangle(0, btnY, btnW, btnH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            draw(true);
            this.scene.tweens.add({ targets: lbl, scale: 1.06, duration: 80, ease: 'Quad.easeOut' });
        });
        hit.on('pointerout', () => {
            draw(false);
            this.scene.tweens.add({ targets: lbl, scale: 1, duration: 80, ease: 'Quad.easeOut' });
        });
        hit.on('pointerup', () => this._close());
        this.add(hit);
    }

    // ── close ─────────────────────────────────────────────────────────────────

    _close () {
        this._destroyConfetti();
        this.scene.tweens.add({
            targets: this, alpha: 0, scale: 0.88, duration: 200, ease: 'Quad.easeIn',
            onComplete: () => { this.setVisible(false); this._onClose?.(); },
        });
    }
}
