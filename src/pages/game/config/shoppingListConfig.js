/**
 * Shopping list targets — icons + collect progress (collected / required).
 * textureKey must match preloaded product textures.
 */

export const SHOPPING_LIST_ENTRIES = Object.freeze([
    Object.freeze({
        key: 'milk',
        textureKey: 'product_beverages_milk',
        required: 1,
        collected: 0,
    }),
    Object.freeze({
        key: 'tomatos',
        textureKey: 'product_fruits_tomatos',
        required: 4,
        collected: 0,
    }),
    null,
    null,
    null,
    null,
]);

export const SHOPPING_LIST_SLOT_COUNT = 6;
