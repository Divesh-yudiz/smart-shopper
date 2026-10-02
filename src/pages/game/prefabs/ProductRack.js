import Phaser from 'phaser';
import { getShelfRowsForRack } from '../config/shelfLayouts.js';
import { addCauseText } from '../utils/gameText.js';
import { getMarketLayout, normalizeRowBottomSpaces } from '../utils/rackConfig.js';

const { rackWidth: RACK_W, rackHeight: RACK_H, productIconScale: DEFAULT_ICON_SCALE } = getMarketLayout();
export { RACK_W, RACK_H };

const PROD_GAP = 6;

/** Wide enough for names like "Dish Washing Soap" at full label size. */
const PRICE_TAG_W = 196;
/**
 * Produce bays show three products on one shelf, each with its own plaque.
 * Narrow enough that those three sit side by side without overlapping.
 */
const PRICE_TAG_ITEM_W = 112;
const PRICE_TAG_H = 36;
const PRICE_TAG_RADIUS = 12;
/** Light oak plaque — matches the shelf timber without burying the name. */
const PRICE_TAG_WOOD = 0xE6BE74;
const PRICE_TAG_WOOD_EDGE = 0x8C5528;
const PRICE_TAG_SALE = 0xFFD24A;
const PRICE_TAG_SALE_EDGE = 0xC98412;
/** Default hang below shelf plank; lower = up, higher = down (per-row override in shelfLayouts.js) */
const DEFAULT_PRICE_TAG_OFFSET_Y = 10;
/** Leave room so the plaque from the shelf above does not cover the product. */
const DEFAULT_TAG_CLEARANCE = PRICE_TAG_H + DEFAULT_PRICE_TAG_OFFSET_Y + 6;

const DEFAULT_LAYOUT = {
    productsPerRow: 4,
    shelfRows: 4,
    gridXOffset: 0,
    gridYOffset: 0,
    rowGap: 0,
    rowBottomSpace: 0,
    insetLeft: 50,
    insetRight: 36,
    shelfSurfaceInset: 10,
    rowYAdjust: [],
    rowXAdjust: [],
    iconScale: null,
    shelfHeightFactor: 0.88,
    iconAspect: 1,
    iconSlotFill: 0.92,
    keepAspect: true,
    spreadFullBay: false,
    rowSidePad: 24,
    tagClearance: DEFAULT_TAG_CLEARANCE,
};

function paintShelfTag(graphics, fill, edge, width = PRICE_TAG_W) {
    graphics.clear();
    graphics.fillStyle(0x5A3818, 0.28);
    graphics.fillRoundedRect(
        -width / 2 + 1,
        -PRICE_TAG_H / 2 + 2,
        width,
        PRICE_TAG_H,
        PRICE_TAG_RADIUS,
    );
    graphics.fillStyle(fill, 1);
    graphics.fillRoundedRect(-width / 2, -PRICE_TAG_H / 2, width, PRICE_TAG_H, PRICE_TAG_RADIUS);
    graphics.lineStyle(2, edge, 1);
    graphics.strokeRoundedRect(
        -width / 2 + 1,
        -PRICE_TAG_H / 2 + 1,
        width - 2,
        PRICE_TAG_H - 2,
        PRICE_TAG_RADIUS - 1,
    );
}

function shelfLabelText(product, rowCfg) {
    return rowCfg?.label ?? product?.label ?? '-';
}

function buildGridLayout(
    {
        productsPerRow,
        shelfRows,
        gridXOffset = 0,
        gridYOffset = 0,
        rowGap = 0,
        rowBottomSpace = 0,
        rowBottomSpaces,
        insetLeft = 50,
        insetRight = 36,
        shelfSurfaceInset = 10,
        rowYAdjust = [],
        rowXAdjust = [],
        iconScale,
        shelfHeightFactor = 0.88,
        iconAspect = 1,
        iconSlotFill = 0.92,
        keepAspect = true,
        spreadFullBay = false,
        rowSidePad = 24,
        shelfPlankOffset,
        tagClearance = DEFAULT_TAG_CLEARANCE,
    },
    rackWidth = RACK_W,
    rackHeight = RACK_H
) {
    const rowBottoms = rowBottomSpaces ?? normalizeRowBottomSpaces(rowBottomSpace, shelfRows, 0);
    const totalRowGaps = Math.max(0, shelfRows - 1) * rowGap;
    const totalRowBottom = rowBottoms.reduce((sum, space) => sum + space, 0);
    const sectionH = (rackHeight - totalRowGaps - totalRowBottom) / shelfRows;
    const usableW = rackWidth - insetLeft - insetRight;
    const productW = (usableW - PROD_GAP * (productsPerRow - 1)) / productsPerRow;
    const colX = Array.from({ length: productsPerRow }, (_, i) =>
        -(rackWidth / 2) + insetLeft + productW / 2 + i * (productW + PROD_GAP) + gridXOffset
    );

    const plankOffset = shelfPlankOffset;

    /** Y where product bottom sits (on shelf plank). */
    const rowY = (n) => {
        const rowTop = -(rackHeight / 2) + n * (sectionH + rowGap);
        const plankLine = rowTop + sectionH - rowBottoms[n] - shelfSurfaceInset;
        if (plankOffset != null) {
            return plankLine + plankOffset + (rowYAdjust[n] ?? 0) + gridYOffset;
        }
        const adjust = rowYAdjust[n] ?? 0;
        return plankLine + adjust + gridYOffset;
    };

    return {
        rackWidth,
        rackHeight,
        productsPerRow,
        shelfRows,
        productW,
        sectionH,
        colX,
        rowY,
        rowGap,
        rowBottomSpaces: rowBottoms,
        rowYAdjust,
        rowXAdjust,
        insetLeft,
        insetRight,
        gridXOffset,
        iconScale: iconScale ?? DEFAULT_ICON_SCALE,
        shelfHeightFactor,
        iconAspect,
        iconSlotFill,
        keepAspect,
        spreadFullBay,
        rowSidePad,
        shelfPlankOffset,
        tagClearance,
    };
}

const PALETTE = [0xE74C3C, 0xF39C12, 0x27AE60, 0x2980B9, 0x8E44AD, 0xE67E22, 0x16A085, 0xC0392B, 0xD35400];

function normalizeProductMap(products, category, count) {
    if (!products) return defaultProducts(category, count);
    if (Array.isArray(products)) {
        const map = {};
        products.forEach((p) => {
            if (p.key) map[p.key] = p;
        });
        return Object.keys(map).length ? map : Object.fromEntries(products.map((p, i) => [i, p]));
    }
    return products;
}

function defaultProducts(category, count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        label: `${category} ${i + 1}`,
        price: +(Math.random() * 4 + 0.5).toFixed(2),
        color: PALETTE[i % PALETTE.length],
    }));
}

export default class ProductRack extends Phaser.GameObjects.Container {
    constructor(scene, x, y, {
        rackId,
        category = 'Products',
        layout,
        products,
        onProductClick = () => { },
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        const layoutConfig = { ...DEFAULT_LAYOUT, ...layout };
        if (layoutConfig.rows?.length) {
            const mappedMax = layoutConfig.rows.reduce(
                (max, row, i) => Math.max(max, (row.shelfRow ?? i) + 1),
                layoutConfig.rows.length
            );
            const explicitRows = layoutConfig.shelfRows;
            layoutConfig.shelfRows =
                explicitRows != null && explicitRows >= mappedMax ? explicitRows : mappedMax;
        }
        this._layout = buildGridLayout(layoutConfig);
        this._rackId = rackId;
        this._onProductClick = onProductClick;
        this._pendingShelfTags = [];
        this._productCards = [];

        const productMap = normalizeProductMap(products, category, this._layout.shelfRows * this._layout.productsPerRow);
        const shelfRows = layoutConfig.rows?.length
            ? layoutConfig.rows
            : (rackId ? getShelfRowsForRack(rackId) : []);

        if (shelfRows.length) {
            this._buildRowProducts(productMap, shelfRows);
        } else {
            this._buildGridProducts(Array.isArray(productMap) ? productMap : Object.values(productMap));
        }

        this._tagLayer = scene.add.container(0, 0);
        this.add(this._tagLayer);
        this._shelfTags = [];
        this._flushShelfPriceTags();
    }

    /**
     * Hang a SALE tag on the left of a flash-sale item's shelf row.
     * @returns {{x:number,y:number}|null} position in this rack's local space
     */
    highlightSaleProduct(sItemKey) {
        if (!sItemKey) return null;
        const matches = this._productCards.filter(({ product }) => (
            product?.sItemKey === sItemKey || product?.key === sItemKey
        ));
        if (!matches.length) return null;

        if (!this._saleHighlighted) {
            this._saleHighlighted = true;
            this._addSaleBadge(matches);
            this._markSalePriceTags(sItemKey);
        }

        const first = matches[0].container;
        return { x: first.x, y: first.y };
    }

    _addSaleBadge(matches) {
        const w = 92;
        const h = 34;
        // Product cards live in this rack's local space (x grows to the right).
        // The sprite origin is the shelf floor, so the row's left edge is the
        // leftmost card minus half its icon width.
        let left = matches[0].container;
        for (const { container } of matches) {
            if (container.x < left.x) left = container;
        }
        const img = left.list?.find((child) => child?.type === 'Image');
        const iconW = Math.abs(img?.displayWidth ?? 0);
        const iconH = Math.abs(img?.displayHeight ?? 0);
        // Keep the tag on this row: a little right of the first item and above its middle.
        const x = left.x - iconW / 2 + 34;
        const y = left.y - iconH / 2 - 32;

        const badge = this.scene.add.container(x, y);
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x3CC45A, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
        const label = addCauseText(this.scene, 0, -1, 'SALE', {
            fontSize: '18px',
            fontStyle: '800',
            color: '#ffffff',
        });
        label.setOrigin(0.5, 0.5);
        badge.add([bg, label]);
        this.add(badge);
    }

    _markSalePriceTags(sItemKey) {
        for (const entry of this._shelfTags ?? []) {
            if (entry.sItemKey !== sItemKey) continue;
            entry.paint?.(PRICE_TAG_SALE, PRICE_TAG_SALE_EDGE);
        }
    }

    _rowSpan(layout) {
        const { insetLeft, insetRight, rackWidth, gridXOffset, spreadFullBay, rowSidePad = 24 } = layout;
        if (spreadFullBay) {
            const padL = layout.rowSidePadLeft ?? rowSidePad;
            const padR = layout.rowSidePadRight ?? rowSidePad;
            const usableW = rackWidth - padL - padR;
            return { usableW, startX: -(rackWidth / 2) + padL + gridXOffset };
        }
        const usableW = rackWidth - insetLeft - insetRight;
        return { usableW, startX: -(rackWidth / 2) + insetLeft + gridXOffset };
    }

    _buildGridProducts(products) {
        const { shelfRows, productsPerRow, colX, rowY, productW } = this._layout;
        const max = shelfRows * productsPerRow;
        const rowCenterX = (colX[0] + colX[productsPerRow - 1]) / 2;

        for (let row = 0; row < shelfRows; row++) {
            const rowProducts = [];
            for (let col = 0; col < productsPerRow; col++) {
                const index = row * productsPerRow + col;
                if (index >= max) break;
                rowProducts.push(products[index]);
            }
            if (!rowProducts.length) continue;

            rowProducts.forEach((product, col) => {
                this.add(this._createCard(product, colX[col], rowY(row), productW, this._layout.sectionH));
            });
            this._queueShelfRowPriceTag(rowCenterX, rowY(row), rowProducts[0]);
        }
    }

    _buildRowProducts(productMap, rows) {
        const catalog = productMap;
        const layout = this._layout;
        const { rowY, sectionH } = layout;
        const { usableW, startX: rowStartX } = this._rowSpan(layout);

        const rowXAdjust = layout.rowXAdjust ?? [];

        rows.forEach((rowCfg, rowIndex) => {
            if (rowCfg.skip) return;

            const shelfRowIndex = rowCfg.shelfRow ?? rowIndex;
            const shelfY = rowY(shelfRowIndex) + (rowCfg.offsetY ?? 0);
            const rowOffsetX = (rowCfg.offsetX ?? 0) + (rowXAdjust[shelfRowIndex] ?? 0);

            if (rowCfg.stacks?.length) {
                this._buildMixedShelfRow(
                    catalog,
                    rowCfg.stacks,
                    shelfY,
                    sectionH,
                    usableW,
                    rowStartX + rowOffsetX,
                    rowCfg.gap,
                    rowCfg
                );
                return;
            }

            const product = catalog[rowCfg.product];
            if (!product) {
                console.warn(`[ProductRack] Unknown product "${rowCfg.product}" on shelf ${rowIndex}`);
                return;
            }

            const count = Math.max(1, rowCfg.count ?? 1);
            const gap = rowCfg.gap ?? PROD_GAP;
            const sizeCount = Math.max(1, rowCfg.fitWidthCount ?? count);
            const sizeSlotW = sizeCount > 1
                ? (usableW - gap * (sizeCount - 1)) / sizeCount
                : usableW;

            const scale = rowCfg.iconScale ?? this._layout.iconScale ?? DEFAULT_ICON_SCALE;
            const heightFactor = rowCfg.shelfHeightFactor ?? this._layout.shelfHeightFactor ?? 0.88;
            const slotFill = rowCfg.iconSlotFill ?? this._layout.iconSlotFill ?? 0.92;
            const maxW = Math.max(24, sizeSlotW * slotFill * scale);
            const maxH = Math.max(28, sectionH * heightFactor * scale);
            const visualW = Math.min(maxW, maxH * this._productAspect(product));

            // If the product object allots a span (spanCount slots of this bay),
            // arrange copies inside that width. Otherwise pack by drawn icon
            // width. Never shrink the item — only the gap may tighten.
            const spanCount = Number.isFinite(rowCfg.spanCount) ? rowCfg.spanCount : null;
            const allottedW = spanCount > 0
                ? Math.min(usableW, (usableW / spanCount) * Math.max(spanCount, count))
                : usableW;
            let packedGap = gap;
            let packedRowW = visualW * count + packedGap * Math.max(0, count - 1);
            if (count > 1 && spanCount > 0) {
                const evenGap = (allottedW - visualW * count) / (count - 1);
                packedGap = Number.isFinite(rowCfg.gap) ? Math.max(gap, evenGap) : evenGap;
                packedRowW = visualW * count + packedGap * (count - 1);
                if (packedRowW > allottedW) {
                    packedGap = evenGap;
                    packedRowW = allottedW;
                }
            } else if (count > 1 && packedRowW > usableW) {
                packedGap = (usableW - visualW * count) / (count - 1);
                packedRowW = usableW;
            }
            const rowW = spanCount > 0 ? allottedW : usableW;
            const startX = rowStartX + (rowW - packedRowW) / 2 + visualW / 2
                + (spanCount > 0 ? (usableW - allottedW) / 2 : 0);
            const step = count > 1 ? visualW + packedGap : 0;

            for (let i = 0; i < count; i++) {
                const cx = startX + i * step;
                this.add(this._createCard(product, cx, shelfY, sizeSlotW, sectionH, rowCfg));
            }

            this._queueShelfRowPriceTag(rowStartX + rowOffsetX + usableW / 2, shelfY, product, rowCfg);
        });
    }

    _buildMixedShelfRow(catalog, stacks, shelfY, sectionH, usableW, rowStartX, gap = PROD_GAP, rowOverrides = {}) {
        const slotCount = Math.max(stacks.length, rowOverrides.slotCount ?? stacks.length);
        const slotW = slotCount > 1 ? (usableW - gap * (slotCount - 1)) / slotCount : usableW;
        const usedW = stacks.length * slotW + Math.max(0, stacks.length - 1) * gap;
        const startX = rowStartX + (usableW - usedW) / 2 + slotW / 2;
        const perItemTags =
            rowOverrides.priceTagPerItem === true ||
            this._rackId === 'fruits';

        let rowPriceProduct = null;

        stacks.forEach((entry, i) => {
            const product = catalog[entry.product];
            if (!product) {
                console.warn(`[ProductRack] Unknown product "${entry.product}" in mixed shelf`);
                return;
            }
            if (!rowPriceProduct) rowPriceProduct = product;
            const cx = startX + i * (slotW + gap);
            const perItem = { ...rowOverrides, ...entry };
            this.add(this._createCard(product, cx, shelfY, slotW, sectionH, perItem));

            if (perItemTags) {
                this._queueShelfRowPriceTag(cx, shelfY, product, perItem);
            }
        });

        if (!perItemTags && rowPriceProduct) {
            this._queueShelfRowPriceTag(rowStartX + usableW / 2, shelfY, rowPriceProduct, rowOverrides);
        }
    }

    _productAspect(product) {
        const key = product?.textureKey;
        if (key && this.scene.textures.exists(key)) {
            const src = this.scene.textures.get(key)?.getSourceImage?.();
            if (src?.width > 0 && src?.height > 0) return src.width / src.height;
        }
        return 0.45;
    }

    _createCard(product, cx, shelfY, productW, sectionH, rowOverrides = {}) {
        const container = this.scene.add.container(cx, shelfY);
        const slotW = Number.isFinite(productW) ? productW : RACK_W / 4;
        const scale = rowOverrides.iconScale ?? this._layout.iconScale ?? DEFAULT_ICON_SCALE;
        const heightFactor = rowOverrides.shelfHeightFactor ?? this._layout.shelfHeightFactor ?? 0.88;
        const slotFill = rowOverrides.iconSlotFill ?? this._layout.iconSlotFill ?? 0.92;
        const keepAspect = rowOverrides.keepAspect ?? this._layout.keepAspect ?? true;

        const maxW = Math.max(24, slotW * slotFill * scale);
        let maxH = Math.max(28, sectionH * heightFactor * scale);
        const clearance = rowOverrides.tagClearance ?? this._layout.tagClearance ?? 0;
        if (clearance > 0) {
            maxH = Math.min(maxH, Math.max(28, sectionH - clearance));
        }

        let iconH = maxH;
        let iconW = maxW;
        if (keepAspect === false) {
            const aspect = rowOverrides.iconAspect ?? this._layout.iconAspect ?? 1;
            if (aspect > 1) {
                iconW = iconH / aspect;
                if (iconW > maxW) {
                    iconW = maxW;
                    iconH = iconW * aspect;
                }
            } else if (aspect < 1) {
                iconH = iconW / aspect;
                if (iconH > maxH) {
                    iconH = maxH;
                    iconW = iconH * aspect;
                }
            }
        }

        if (product.textureKey && this.scene.textures.exists(product.textureKey)) {
            const img = this.scene.add.image(0, 0, product.textureKey);
            img.setOrigin(0.5, 1);
            if (keepAspect !== false && img.width > 0 && img.height > 0) {
                img.setScale(Math.min(iconW / img.width, iconH / img.height));
                img.setAngle(0);
            } else {
                img.setDisplaySize(iconW, iconH);
            }
            container.add(img);
        } else if (product.textureKey) {
            console.warn(`[ProductRack] Texture not loaded: ${product.textureKey}`);
        }

        const hitH = Math.max(iconH, 40);
        const hitZone = this.scene.add.rectangle(0, -hitH / 2, slotW, hitH, 0, 0);
        hitZone.setInteractive({ useHandCursor: true });
        container.add(hitZone);

        let ptrDownX = 0;
        let ptrDownY = 0;

        hitZone.on('pointerover', () => {
            this.scene.tweens.add({ targets: container, scaleX: 1.06, scaleY: 1.06, duration: 80, ease: 'Quad.easeOut' });
        });
        hitZone.on('pointerout', () => {
            this.scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80, ease: 'Quad.easeOut' });
        });
        hitZone.on('pointerdown', (ptr) => {
            ptrDownX = ptr.x;
            ptrDownY = ptr.y;
            this.scene.tweens.add({ targets: container, scaleX: 0.94, scaleY: 0.94, duration: 55 });
        });
        hitZone.on('pointerup', (ptr) => {
            this.scene.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 90,
                ease: 'Elastic.easeOut',
                easeParams: [1.2, 0.8],
            });
            if (Math.abs(ptr.x - ptrDownX) + Math.abs(ptr.y - ptrDownY) < 20) {
                this._onProductClick(product);
            }
        });

        this._productCards.push({ product, container });
        return container;
    }

    /**
     * World-space center of the first shelf card matching this product.
     * @returns {{x:number,y:number}|null}
     */
    getProductWorldPosition(product) {
        if (!product) return null;
        const match = this._productCards.find(({ product: p }) => (
            p === product
            || (p.key && p.key === product.key)
            || (p.textureKey && p.textureKey === product.textureKey)
        ));
        if (!match?.container) return null;
        const matrix = match.container.getWorldTransformMatrix();
        // Cards use origin at shelf floor; lift to roughly icon center.
        return { x: matrix.tx, y: matrix.ty - 40 };
    }

    _queueShelfRowPriceTag(centerX, shelfY, product, rowCfg = {}) {
        if (!product && rowCfg.label == null) return;
        this._pendingShelfTags.push({ centerX, shelfY, product, rowCfg });
    }

    _flushShelfPriceTags() {
        this._pendingShelfTags.forEach((tag) => this._createShelfRowPriceTag(tag));
        this._pendingShelfTags = [];
    }

    /** Wooden nameplate — one per shelf row, or one per product on produce rows. */
    _createShelfRowPriceTag({ centerX, shelfY, product, rowCfg }) {
        const text = shelfLabelText(product, rowCfg);
        const tagOffsetY = rowCfg.priceTagOffsetY ?? DEFAULT_PRICE_TAG_OFFSET_Y;
        const tagY = shelfY + tagOffsetY;
        const perItem = rowCfg.priceTagPerItem === true || this._rackId === 'fruits';
        const tagW = perItem ? PRICE_TAG_ITEM_W : PRICE_TAG_W;

        const tagContainer = this.scene.add.container(centerX, tagY);

        const tag = this.scene.add.graphics();
        const paint = (fill, edge) => paintShelfTag(tag, fill, edge, tagW);
        paint(PRICE_TAG_WOOD, PRICE_TAG_WOOD_EDGE);
        tagContainer.add(tag);

        const label = addCauseText(this.scene, 0, -1, text, {
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#3A2412',
            align: 'center',
        });
        label.setOrigin(0.5, 0.5);
        const maxTextW = tagW - 16;
        if (label.width > maxTextW) label.setScale(maxTextW / label.width);
        tagContainer.add(label);

        const sItemKey = product?.sItemKey ?? product?.key ?? null;
        tagContainer.setData('sItemKey', sItemKey);
        this._shelfTags.push({ sItemKey, label, plate: tag, paint });
        this._tagLayer.add(tagContainer);
    }
}
