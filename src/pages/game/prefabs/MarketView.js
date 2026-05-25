import Phaser from 'phaser';
import config from '../utils/config.js';
import { getMarketLayout, getRackPlacements, getRackVerticalLayout, getRacksForView } from '../utils/rackConfig.js';
import ProductRack from './ProductRack.js';

const { rackWidth: RACK_W, labelHeight: LABEL_H } = getMarketLayout();
const { rackCenterY: DEFAULT_RACK_CENTER_Y } = getRackVerticalLayout(getMarketLayout().ceilingHeight);

const DRAG_THRESHOLD = 10;

// ─── MarketView ───────────────────────────────────────────────────────────────
/**
 * Horizontal side-by-side rack layout for a 1920 × 1080 landscape canvas.
 * Shows 3 racks at once; drag left/right to scroll through all racks.
 *
 * @param {Phaser.Scene} scene
 * @param {Array}    racksData       - from getRacksForView(); defaults to MARKET_CONFIG
 * @param {Function} onProductClick  - (product, rackId, rackIndex) callback
 */
export default class MarketView extends Phaser.GameObjects.Container {
    constructor(scene, racksData = getRacksForView(), onProductClick = () => {}) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this._onProductClick = onProductClick;
        this._pointerDown = false;
        this._hasDragged = false;
        this._dragStartX = 0;
        this._innerStartX = 0;

        const rackIds = racksData.map((r) => r.id);
        const { placements, scrollWidth, scrollStep } = getRackPlacements(rackIds);
        this._placements = placements;
        this._scrollStep = scrollStep;

        this._minX = Math.min(0, -(scrollWidth - config.width));
        this._maxX = 0;

        // 1. Scrollable inner container
        this._inner = scene.add.container(0, 0);
        this.add(this._inner);

        // Mask: clip to canvas so off-screen racks are hidden & non-interactive
        const maskGfx = scene.make.graphics({ add: false });
        maskGfx.fillStyle(0xffffff);
        maskGfx.fillRect(0, 0, config.width, config.height);
        this._inner.setMask(maskGfx.createGeometryMask());

        // 2. Background image (scrolls with racks)
        this._buildBackground(scrollWidth);

        // 3. Category label badges + racks inside inner
        const { showCategoryLabel } = getMarketLayout();

        placements.forEach((rackCfg, i) => {
            const rx = rackCfg.centerX;
            if (showCategoryLabel) {
                this._buildCategoryLabel(rx, rackCfg.labelCenterY, rackCfg.category, rackCfg.headerColor);
            }
            const rack = new ProductRack(scene, rx, rackCfg.rackCenterY, {
                rackId: rackCfg.id,
                category: rackCfg.category,
                headerColor: rackCfg.headerColor,
                layout: rackCfg.layout,
                products: rackCfg.products,
                onProductClick: (p) => this._onProductClick(p, rackCfg.id, i),
            });
            this._inner.add(rack);
        });

        // 4. Scroll arrows
        this._buildArrows();

        // 5. Input
        this._setupInput();
    }

    // ── Category label badge ──────────────────────────────────────────────────
    _buildCategoryLabel(cx, cy, category, color) {
        const W = RACK_W;
        const H = LABEL_H;
        const R = 14;

        const bg = this.scene.add.graphics();
        // Drop shadow
        bg.fillStyle(0x000000, 0.2);
        bg.fillRoundedRect(cx - W / 2 + 3, cy - H / 2 + 4, W, H, R);
        // Badge fill
        bg.fillStyle(color);
        bg.fillRoundedRect(cx - W / 2, cy - H / 2, W, H, R);
        // Top shine
        bg.fillStyle(0xffffff, 0.18);
        bg.fillRoundedRect(cx - W / 2, cy - H / 2, W, H * 0.45,
            { tl: R, tr: R, bl: 0, br: 0 });

        this._inner.add(bg);

        const label = this.scene.add.text(cx, cy, category, {
            fontFamily: 'Arial',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#00000066',
            strokeThickness: 3,
            align: 'center',
        });
        label.setOrigin(0.5, 0.5);
        this._inner.add(label);
    }

    // ── Background image (scrolls with inner, covers full content area) ───────
    _buildBackground(totalW) {
        const bg = this.scene.add.image(totalW / 2, config.height / 2, 'game_bg');
        bg.setDisplaySize(totalW, config.height);
        this._inner.addAt(bg, 0);
    }

    // ── Left / right scroll arrows ────────────────────────────────────────────
    _buildArrows() {
        const arrowY = DEFAULT_RACK_CENTER_Y;
        const style = { fontFamily: 'Arial', fontSize: '72px', color: '#ffffff', alpha: 0.55 };

        this._arrowLeft = this.scene.add.text(18, arrowY, '‹', style).setOrigin(0, 0.5);
        this._arrowRight = this.scene.add.text(config.width - 18, arrowY, '›', style).setOrigin(1, 0.5);

        [this._arrowLeft, this._arrowRight].forEach((a) => {
            a.setInteractive({ useHandCursor: true });
            a.on('pointerover', () => a.setAlpha(1));
            a.on('pointerout', () => a.setAlpha(0.55));
        });
        this._arrowLeft.on('pointerup', () => this._scrollBy(this._scrollStep));
        this._arrowRight.on('pointerup', () => this._scrollBy(-this._scrollStep));

        this.add(this._arrowLeft);
        this.add(this._arrowRight);
        this._updateArrows();
    }

    _updateArrows() {
        this._arrowLeft?.setVisible(this._inner.x < this._maxX);
        this._arrowRight?.setVisible(this._inner.x > this._minX);
    }

    _scrollBy(dx) {
        const targetX = Phaser.Math.Clamp(this._inner.x + dx, this._minX, this._maxX);
        this.scene.tweens.add({
            targets: this._inner,
            x: targetX,
            duration: 320,
            ease: 'Cubic.easeOut',
            onComplete: () => this._updateArrows(),
        });
        this._updateArrows();
    }

    // ── Drag-to-scroll ────────────────────────────────────────────────────────
    _setupInput() {
        this.scene.input.on('pointerdown', (ptr) => {
            this._pointerDown = true;
            this._hasDragged = false;
            this._dragStartX = ptr.x;
            this._innerStartX = this._inner.x;
        });
        this.scene.input.on('pointermove', (ptr) => {
            if (!this._pointerDown || !ptr.isDown) return;
            const dx = ptr.x - this._dragStartX;
            if (!this._hasDragged && Math.abs(dx) > DRAG_THRESHOLD) this._hasDragged = true;
            if (this._hasDragged) {
                this._inner.x = Phaser.Math.Clamp(this._innerStartX + dx, this._minX, this._maxX);
                this._updateArrows();
            }
        });
        this.scene.input.on('pointerup', () => {
            if (!this._pointerDown) return;
            this._pointerDown = false;
            if (this._hasDragged) this._snapToBounds();
        });
    }

    _snapToBounds() {
        const clamped = Phaser.Math.Clamp(this._inner.x, this._minX, this._maxX);
        if (clamped !== this._inner.x) {
            this.scene.tweens.add({
                targets: this._inner,
                x: clamped,
                duration: 200,
                ease: 'Cubic.easeOut',
                onComplete: () => this._updateArrows(),
            });
        }
    }
}
