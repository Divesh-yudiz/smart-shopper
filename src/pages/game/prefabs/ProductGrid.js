import Phaser from 'phaser';
import config from '../utils/config.js';

const COLS = 4;
const ROWS = 4;
const CELL_SIZE = 190;
const GAP = 20;
const CORNER_RADIUS = 16;
const GRID_WIDTH = COLS * CELL_SIZE + (COLS - 1) * GAP;
const GRID_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * GAP;

const DEFAULT_PRODUCTS = Array.from({ length: ROWS * COLS }, (_, i) => ({
    id: i,
    label: `Item ${i + 1}`,
    color: Phaser.Display.Color.HSVColorWheel()[Math.floor((i / (ROWS * COLS)) * 360)].color,
}));

export default class ProductGrid extends Phaser.GameObjects.Container {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x  - centre X of the grid
     * @param {number} y  - centre Y of the grid
     * @param {Array}  products  - array of { id, label, color, textureKey? }
     * @param {Function} onProductClick - called with (product, index) on tap
     */
    constructor(scene, x = config.centerX, y = config.centerY, products = DEFAULT_PRODUCTS, onProductClick = () => { }) {
        super(scene, x, y);
        scene.add.existing(this);

        this.products = products;
        this.onProductClick = onProductClick;
        this._cells = [];

        this._buildGrid();
    }

    _buildGrid () {
        const startX = -GRID_WIDTH / 2 + CELL_SIZE / 2;
        const startY = -GRID_HEIGHT / 2 + CELL_SIZE / 2;

        this.products.slice(0, ROWS * COLS).forEach((product, index) => {
            const col = index % COLS;
            const row = Math.floor(index / COLS);

            const cx = startX + col * (CELL_SIZE + GAP);
            const cy = startY + row * (CELL_SIZE + GAP);

            const cell = this._createCell(product, cx, cy, index);
            this._cells.push(cell);
            this.add(cell);
        });
    }

    _createCell (product, cx, cy, index) {
        const container = this.scene.add.container(cx, cy);

        // Card background
        const bg = this.scene.add.graphics();
        this._drawCardBg(bg, product.color ?? 0x4a90d9, false);
        container.add(bg);

        // Product image (if textureKey provided and texture exists)
        if (product.textureKey && this.scene.textures.exists(product.textureKey)) {
            const img = this.scene.add.image(0, -20, product.textureKey);
            img.setDisplaySize(CELL_SIZE - 30, CELL_SIZE - 70);
            container.add(img);
        }

        // Label text
        const label = this.scene.add.text(0, CELL_SIZE / 2 - 35, product.label, {
            fontFamily: 'Cause',
            fontSize: '28px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: CELL_SIZE - 20 },
        });
        label.setOrigin(0.5, 0.5);
        container.add(label);

        // Hit area (invisible rectangle covering the full cell)
        const hitZone = this.scene.add.rectangle(0, 0, CELL_SIZE, CELL_SIZE, 0xffffff, 0);
        hitZone.setInteractive({ useHandCursor: true });
        container.add(hitZone);

        // Interactions
        const baseScale = 1;
        const hoverScale = 1.06;
        const pressScale = 0.94;

        hitZone.on('pointerover', () => {
            this.scene.tweens.add({
                targets: container,
                scaleX: hoverScale,
                scaleY: hoverScale,
                duration: 80,
                ease: 'Quad.easeOut',
            });
            this._drawCardBg(bg, product.color ?? 0x4a90d9, true);
        });

        hitZone.on('pointerout', () => {
            this.scene.tweens.add({
                targets: container,
                scaleX: baseScale,
                scaleY: baseScale,
                duration: 80,
                ease: 'Quad.easeOut',
            });
            this._drawCardBg(bg, product.color ?? 0x4a90d9, false);
        });

        hitZone.on('pointerdown', () => {
            this.scene.tweens.add({
                targets: container,
                scaleX: pressScale,
                scaleY: pressScale,
                duration: 60,
                ease: 'Quad.easeIn',
            });
        });

        hitZone.on('pointerup', () => {
            this.scene.tweens.add({
                targets: container,
                scaleX: baseScale,
                scaleY: baseScale,
                duration: 80,
                ease: 'Elastic.easeOut',
                easeParams: [1.2, 0.8],
                onComplete: () => {
                    this.onProductClick(product, index);
                },
            });
        });

        return container;
    }

    _drawCardBg (graphics, color, hovered) {
        graphics.clear();
        // Drop shadow
        graphics.fillStyle(0x000000, 0.25);
        graphics.fillRoundedRect(-CELL_SIZE / 2 + 4, -CELL_SIZE / 2 + 6, CELL_SIZE, CELL_SIZE, CORNER_RADIUS);
        // Card fill
        graphics.fillStyle(color, 1);
        graphics.fillRoundedRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, CORNER_RADIUS);
        // Highlight stroke on hover
        if (hovered) {
            graphics.lineStyle(4, 0xffffff, 0.9);
            graphics.strokeRoundedRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, CORNER_RADIUS);
        }
    }

    /**
     * Update the product list and re-render the grid.
     * @param {Array} products
     */
    updateProducts (products) {
        this._cells.forEach(c => c.destroy());
        this._cells = [];
        this.removeAll(false);
        this.products = products;
        this._buildGrid();
    }

    /**
     * Highlight (pulse) a specific cell by index.
     * @param {number} index
     */
    highlightCell (index) {
        const cell = this._cells[index];
        if (!cell) return;
        this.scene.tweens.add({
            targets: cell,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 120,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
    }
}
