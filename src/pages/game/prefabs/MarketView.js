import Phaser from 'phaser';
import { getRackBannerAsset } from '../config/bannerAssets.js';
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
    constructor(scene, racksData = getRacksForView(), onProductClick = () => { }) {
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

        // 3. Bay banners + product racks
        const { showCategoryLabel, showBanners } = getMarketLayout();

        placements.forEach((rackCfg, i) => {
            const rx = rackCfg.centerX;
            if (showBanners) {
                const bannerX = rackCfg.bannerCenterX ?? rx;
                this._buildRackBanner(bannerX, rackCfg.bannerCenterY, rackCfg.id, rackCfg.sectionWidth, i);
            }
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

    // ── Category banner (colored plate + icon) ────────────────────────────────
    _buildRackBanner (cx, cy, rackId, sectionWidth, bayIndex = 0) {
        const banner = getRackBannerAsset(rackId);
        if (!banner) return;

        const layout = getMarketLayout();
        const { bannerWidthRatio, bannerIconScale, bannerAnimate = true } = layout;
        const plateKey = banner.plateKey;
        const iconKey = banner.iconKey;

        if (!this.scene.textures.exists(plateKey) || !this.scene.textures.exists(iconKey)) {
            console.warn(`[MarketView] Banner textures missing for rack "${rackId}"`);
            return;
        }

        const container = this.scene.add.container(cx, cy);
        const plate = this.scene.add.image(0, 0, plateKey);
        plate.setOrigin(0.5, 0.5);

        const targetW = sectionWidth * bannerWidthRatio;
        const plateScale = targetW / plate.width;
        plate.setScale(plateScale);

        const icon = this.scene.add.image(0, -6, iconKey);
        icon.setOrigin(0.5, 0.5);
        const iconMul = (banner.iconScale ?? 1) * bannerIconScale;
        const iconScale = plateScale * iconMul;
        icon.setScale(iconScale);

        container.add(plate);
        if (bannerAnimate) {
            this._addBannerSparkles(container, plateScale, bayIndex);
        }
        container.add(icon);
        container.setDepth(2);
        this._inner.add(container);

        if (bannerAnimate) {
            this._animateRackBanner(container, icon, cy, bayIndex, iconScale);
        }
    }

    /** Small twinkles around the plate (like reference banner stars) */
    _addBannerSparkles (container, plateScale, bayIndex) {
        const halfW = plateScale * 95;
        const halfH = plateScale * 38;
        const spots = [
            { x: -halfW * 0.92, y: -halfH * 0.55, size: 5, phase: 0 },
            { x: halfW * 0.88, y: -halfH * 0.45, size: 4, phase: 180 },
            { x: -halfW * 0.55, y: halfH * 0.35, size: 4, phase: 90 },
            { x: halfW * 0.62, y: halfH * 0.4, size: 5, phase: 270 },
            { x: -halfW * 0.2, y: -halfH * 0.75, size: 3, phase: 45 },
            { x: halfW * 0.25, y: -halfH * 0.7, size: 3, phase: 120 },
        ];

        const baseDelay = bayIndex * 65;

        spots.forEach((spot, i) => {
            const sparkle = this.scene.add.graphics();
            this._drawSparkleShape(sparkle, spot.size);
            sparkle.setPosition(spot.x, spot.y);
            sparkle.setAlpha(0);
            sparkle.setScale(0.2);
            container.add(sparkle);

            const cycle = 700 + i * 140;
            this.scene.tweens.add({
                targets: sparkle,
                alpha: 0.95,
                scale: 1.15,
                angle: spot.phase + 90,
                duration: cycle,
                delay: baseDelay + i * 110,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        });
    }

    _drawSparkleShape (graphics, size) {
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(0, 0, size * 0.35);
        graphics.lineStyle(Math.max(1, size * 0.2), 0xfffde8, 0.95);
        graphics.beginPath();
        graphics.moveTo(0, -size);
        graphics.lineTo(0, size);
        graphics.moveTo(-size, 0);
        graphics.lineTo(size, 0);
        graphics.strokePath();
        graphics.lineStyle(Math.max(1, size * 0.15), 0xffffff, 0.7);
        graphics.beginPath();
        graphics.moveTo(-size * 0.7, -size * 0.7);
        graphics.lineTo(size * 0.7, size * 0.7);
        graphics.moveTo(size * 0.7, -size * 0.7);
        graphics.lineTo(-size * 0.7, size * 0.7);
        graphics.strokePath();
    }

    /** Pop-in on banner + gentle icon sway (no plate movement) */
    _animateRackBanner (container, icon, _baseY, bayIndex, iconScale) {
        const stagger = bayIndex * 65;
        container.setScale(0.72);
        container.setAlpha(0);

        this.scene.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: 420,
            delay: stagger,
            ease: 'Back.easeOut',
        });

        icon.setAngle(-15);
        this.scene.tweens.add({
            targets: icon,
            angle: 15,
            duration: 1800,
            delay: stagger + 380,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.scene.tweens.add({
            targets: icon,
            scaleX: iconScale * 1.05,
            scaleY: iconScale * 1.05,
            duration: 1800,
            delay: stagger + 520,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    // ── Category label badge ──────────────────────────────────────────────────
    _buildCategoryLabel (cx, cy, category, color) {
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
    _buildBackground (totalW) {
        const bg = this.scene.add.image(totalW / 2, config.height / 2, 'game_bg');
        bg.setDisplaySize(totalW, config.height);
        this._inner.addAt(bg, 0);
    }

    // ── Left / right scroll arrows ────────────────────────────────────────────
    _buildArrows () {
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

    _updateArrows () {
        this._arrowLeft?.setVisible(this._inner.x < this._maxX);
        this._arrowRight?.setVisible(this._inner.x > this._minX);
    }

    _scrollBy (dx) {
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
    _setupInput () {
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

    _snapToBounds () {
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
