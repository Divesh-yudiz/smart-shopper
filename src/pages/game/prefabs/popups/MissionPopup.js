import Phaser from 'phaser';
import config from '../../utils/config.js';
import { resolveItem } from '../../../../utils/gameApi.js';

// ── layout constants ───────────────────────────────────────────────────────────
const PW = 920;    // panel width
const CR = 22;     // corner radius
const HEADER_H = 90;     // orange header height

// Card grid
const COLS = 3;
const CW = 262;   // card width
const CH = 210;   // card height
const CGX = 17;    // horizontal gap between cards
const CGY = 14;    // vertical gap between rows
const IR = 44;    // product icon circle radius

// ── palette ────────────────────────────────────────────────────────────────────
const C_BG = 0xfef9e4;   // warm cream panel fill
const C_BORDER = 0xf5a623;   // orange panel border
const C_HEADER = 0xf5a623;   // header fill
const C_CARD = 0xffffff;   // card fill
const C_CARD_BD = 0xe8d5a0;   // card border (light tan)
const C_ICON_BG = 0xf5eed6;   // product circle fill
const C_QTY_BG = 0xf5a623;   // qty badge fill (orange)
const C_GREEN = 0x27ae60;   // button / price green
const C_WHITE = '#ffffff';
const C_NAVY = '#1e3a5f';
const C_ORANGE = '#f5a623';
const C_GRNSTR = '#27ae60';

function formatName (key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
        .replace(/\b\w/g, c => c.toUpperCase());
}

export default class MissionPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, config.centerX, config.centerY);
        scene.add.existing(this);
        this.setDepth(550);
        this.setVisible(false);
    }

    open ({ shoppingList = [], category = '', shoppingTotal = 0, budget = 0,
        onStart = () => { }, onItemSelect = null } = {}) {
        this._onStart = onStart;
        this._onItemSelect = onItemSelect;
        this._addedKeys = new Set();

        const items = shoppingList.filter(Boolean);
        this._rows = Math.max(1, Math.ceil(items.length / COLS));

        // Dynamic panel height based on content
        const cardsH = this._rows * CH + Math.max(0, this._rows - 1) * CGY;
        this._PH = HEADER_H        // orange header
            + 56              // category badge
            + 46              // "items to collect" label
            + cardsH          // card grid
            + 100             // footer (divider + 2 info rows)
            + 92;             // button + bottom pad
        this._PT = -this._PH / 2;

        this.removeAll(true);

        // dim overlay
        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.55);
        ov.setInteractive();
        this.add(ov);

        this._drawPanel();
        this._drawHeader(category);
        this._drawItems(items);
        this._drawFooter(shoppingTotal, budget);
        this._drawButton();

        this.setVisible(true);
        this.setAlpha(0);
        this.setScale(0.88);
        this.scene.tweens.add({
            targets: this, alpha: 1, scale: 1,
            duration: 380, ease: 'Back.easeOut',
        });
    }

    // ── panel background ──────────────────────────────────────────────────────

    _drawPanel () {
        const g = this.scene.add.graphics();

        // soft drop shadow
        g.fillStyle(0x000000, 0.20);
        g.fillRoundedRect(-PW / 2 + 6, this._PT + 8, PW, this._PH, CR);

        // orange border (slightly larger rect behind)
        g.fillStyle(C_BORDER, 1);
        g.fillRoundedRect(-PW / 2 - 5, this._PT - 5, PW + 10, this._PH + 10, CR + 5);

        // cream body
        g.fillStyle(C_BG, 1);
        g.fillRoundedRect(-PW / 2, this._PT, PW, this._PH, CR);

        this.add(g);
    }

    // ── orange header ─────────────────────────────────────────────────────────

    _drawHeader (category) {
        const PT = this._PT;
        const g = this.scene.add.graphics();

        // header fill
        g.fillStyle(C_HEADER, 1);
        g.fillRoundedRect(-PW / 2, PT, PW, HEADER_H, { tl: CR, tr: CR, bl: 0, br: 0 });

        // top shine strip
        g.fillStyle(0xffffff, 0.18);
        g.fillRoundedRect(-PW / 2 + 8, PT + 4, PW - 16, HEADER_H * 0.43, {
            tl: CR - 2, tr: CR - 2, bl: 0, br: 0,
        });
        this.add(g);

        // title  "★  YOUR SHOPPING MISSION!  ★"
        const titleY = PT + HEADER_H / 2;
        this.add(this.scene.add.text(0, titleY, '★  YOUR SHOPPING MISSION!  ★', {
            fontFamily: config.fonts.text,
            fontSize: '36px',
            fontStyle: 'bold',
            color: C_WHITE,
            stroke: '#9a3412',
            strokeThickness: 3,
        }).setOrigin(0.5, 0.5));

        // category badge
        if (category) {
            const badgeY = PT + HEADER_H + 30;
            const bH = 42;
            const bg = this.scene.add.graphics();

            // measure text to get badge width
            const tempT = this.scene.add.text(0, -9999, `🎯  ${category}`, {
                fontFamily: config.fonts.text, fontSize: '22px', fontStyle: 'bold',
            });
            const bW = Math.max(220, tempT.width + 48);
            tempT.destroy();

            bg.fillStyle(0xb06010, 1);
            bg.fillRoundedRect(-bW / 2, badgeY - bH / 2, bW, bH, bH / 2);
            bg.fillStyle(0xffffff, 0.10);
            bg.fillRoundedRect(-bW / 2 + 4, badgeY - bH / 2 + 3, bW - 8, bH / 2 - 3, {
                tl: bH / 2, tr: bH / 2, bl: 0, br: 0,
            });
            this.add(bg);

            this.add(this.scene.add.text(0, badgeY, `🎯  ${category}`, {
                fontFamily: config.fonts.text,
                fontSize: '22px',
                fontStyle: 'bold',
                color: '#ffd88a',
            }).setOrigin(0.5, 0.5));
        }
    }

    // ── item grid ─────────────────────────────────────────────────────────────

    _drawItems (items) {
        const cardsTop = this._PT + HEADER_H + 56 + 46;   // after badge + label space

        // "🛒 Items to collect" label
        const labelY = this._PT + HEADER_H + 56 + 22;
        this.add(this.scene.add.text(0, labelY, '🛒  Items to collect', {
            fontFamily: config.fonts.text,
            fontSize: '22px',
            color: C_NAVY,
        }).setOrigin(0.5, 0.5));

        const gridW = COLS * CW + (COLS - 1) * CGX;
        const startX = -gridW / 2;

        items.forEach((item, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const cx = startX + col * (CW + CGX) + CW / 2;
            const cy = cardsTop + row * (CH + CGY) + CH / 2;
            this._drawCard(cx, cy, item);
        });
    }

    _drawCard (cx, cy, item) {
        const left = cx - CW / 2;
        const top = cy - CH / 2;
        const g = this.scene.add.graphics();

        // card shadow
        g.fillStyle(0x000000, 0.07);
        g.fillRoundedRect(left + 3, top + 4, CW, CH, 14);

        // white card body
        g.fillStyle(C_CARD, 1);
        g.fillRoundedRect(left, top, CW, CH, 14);

        // card border
        g.lineStyle(1.5, C_CARD_BD, 1);
        g.strokeRoundedRect(left, top, CW, CH, 14);

        // centred product circle
        const iconY = top + 16 + IR;
        g.fillStyle(C_ICON_BG, 1);
        g.fillCircle(cx, iconY, IR + 5);
        g.lineStyle(1.5, 0xd4b87a, 0.55);
        g.strokeCircle(cx, iconY, IR + 5);

        this.add(g);

        // product image (icon version)
        const resolved = resolveItem(item.sItemKey);
        if (resolved?.textureKey && this.scene.textures.exists(resolved.textureKey)) {
            const img = this.scene.add.image(cx, iconY, resolved.textureKey);
            const isFruit = resolved.textureKey?.startsWith('product_fruits_') &&
                !resolved.textureKey?.includes('tomato');
            const sizeMul = isFruit ? 1.9 : 1.65;
            img.setDisplaySize((IR + 5) * sizeMul, (IR + 5) * sizeMul);
            this.add(img);
        }

        // item name — centred below circle
        this.add(this.scene.add.text(cx, iconY + IR + 14, formatName(item.sItemKey), {
            fontFamily: config.fonts.text,
            fontSize: '19px',
            fontStyle: 'bold',
            color: C_NAVY,
            align: 'center',
            wordWrap: { width: CW - 20 },
        }).setOrigin(0.5, 0));

        // bottom row: qty badge left │ price right
        const rowY = top + CH - 26;
        const qW = 60, qH = 28;

        const qg = this.scene.add.graphics();
        qg.fillStyle(C_QTY_BG, 1);
        qg.fillRoundedRect(left + 14, rowY - qH / 2, qW, qH, qH / 2);
        this.add(qg);

        this.add(this.scene.add.text(left + 14 + qW / 2, rowY, `×${item.nQuantity}`, {
            fontFamily: config.fonts.text,
            fontSize: '17px',
            fontStyle: 'bold',
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.text(left + CW - 14, rowY, `AED ${item.nPrice}`, {
            fontFamily: config.fonts.text,
            fontSize: '20px',
            fontStyle: 'bold',
            color: C_GRNSTR,
        }).setOrigin(1, 0.5));

        // ── tap-to-add interaction ─────────────────────────────────────────────
        if (this._onItemSelect) {
            const flash = this.scene.add.graphics();
            this.add(flash);

            const hit = this.scene.add.rectangle(cx, cy, CW, CH, 0, 0);
            hit.setInteractive({ useHandCursor: true });

            hit.on('pointerover', () => {
                if (this._addedKeys.has(item.sItemKey)) return;
                flash.clear();
                flash.fillStyle(C_GREEN, 0.10);
                flash.fillRoundedRect(left, top, CW, CH, 14);
            });
            hit.on('pointerout', () => {
                if (this._addedKeys.has(item.sItemKey)) return;
                flash.clear();
            });
            hit.on('pointerup', () => {
                if (this._addedKeys.has(item.sItemKey)) return;
                this._addedKeys.add(item.sItemKey);
                this._onItemSelect(item, this.x + cx, this.y + cy);

                flash.clear();
                flash.fillStyle(C_GREEN, 0.18);
                flash.fillRoundedRect(left, top, CW, CH, 14);
                flash.lineStyle(2.5, C_GREEN, 1);
                flash.strokeRoundedRect(left, top, CW, CH, 14);

                this.add(this.scene.add.text(cx + CW / 2 - 18, top + 18, '✓', {
                    fontSize: '22px', fontStyle: 'bold', color: C_GRNSTR,
                }).setOrigin(0.5, 0.5));
            });
            this.add(hit);
        }
    }

    // ── footer ────────────────────────────────────────────────────────────────

    _drawFooter (shoppingTotal, budget) {
        const cardsTop = this._PT + HEADER_H + 56 + 46;
        const gridBot = cardsTop + this._rows * (CH + CGY) - CGY;
        const divY = gridBot + 22;

        // dashed line
        const g = this.scene.add.graphics();
        g.fillStyle(0xd4b87a, 0.80);
        for (let x = -PW / 2 + 52; x < PW / 2 - 52; x += 12) {
            g.fillCircle(x, divY, 2.2);
        }
        this.add(g);

        let ty = divY + 30;
        const lx = -PW / 2 + 80;
        const rx = PW / 2 - 80;

        const row = (label, value, valColor) => {
            this.add(this.scene.add.text(lx, ty, label, {
                fontFamily: config.fonts.text, fontSize: '24px', color: C_NAVY,
            }).setOrigin(0, 0.5));
            this.add(this.scene.add.text(rx, ty, value, {
                fontFamily: config.fonts.text, fontSize: '24px', fontStyle: 'bold', color: valColor,
            }).setOrigin(1, 0.5));
            ty += 38;
        };

        if (shoppingTotal > 0) row('Mission Cost', `AED ${shoppingTotal}`, C_ORANGE);
        if (budget > 0) row('Your Budget', `AED ${budget}`, C_GRNSTR);
    }

    // ── let's go button ───────────────────────────────────────────────────────

    _drawButton () {
        const btnW = 320;
        const btnH = 66;
        const btnY = this._PH / 2 - 50;

        const g = this.scene.add.graphics();
        const draw = (hover) => {
            g.clear();
            g.fillStyle(0x000000, 0.18);
            g.fillRoundedRect(-btnW / 2 + 3, btnY - btnH / 2 + 4, btnW, btnH, btnH / 2);
            g.fillStyle(hover ? 0x219a52 : C_GREEN, 1);
            g.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, btnH / 2);
            g.fillStyle(0xffffff, 0.16);
            g.fillRoundedRect(-btnW / 2 + 4, btnY - btnH / 2 + 3, btnW - 8, btnH / 2 - 3, {
                tl: btnH / 2, tr: btnH / 2, bl: 0, br: 0,
            });
        };
        draw(false);
        this.add(g);

        const lbl = this.scene.add.text(0, btnY, "🚀  Let's Go!", {
            fontFamily: config.fonts.text,
            fontSize: '32px',
            fontStyle: 'bold',
            color: C_WHITE,
            stroke: '#14532d',
            strokeThickness: 2,
        }).setOrigin(0.5, 0.5);
        this.add(lbl);

        this.scene.tweens.add({
            targets: lbl, scaleX: 1.04, scaleY: 1.04,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        const hit = this.scene.add.rectangle(0, btnY, btnW, btnH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            draw(true);
            this.scene.tweens.killTweensOf(lbl);
            this.scene.tweens.add({ targets: lbl, scaleX: 1.07, scaleY: 1.07, duration: 80, ease: 'Quad.easeOut' });
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

    // ── close ─────────────────────────────────────────────────────────────────

    _close () {
        this.scene.tweens.add({
            targets: this, alpha: 0, scale: 0.92,
            duration: 200, ease: 'Quad.easeIn',
            onComplete: () => { this.setVisible(false); this._onStart?.(); },
        });
    }
}
