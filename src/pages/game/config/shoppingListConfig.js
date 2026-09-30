/**
 * Default shopping-list entries (demo / empty preload).
 * In gameplay, Level replaces these with buildShoppingListEntries() from the API.
 * textureKey must match API keys loaded in Preload (api_item_<sItemKey>_normal).
 */
export const SHOPPING_LIST_ENTRIES = Object.freeze([
    Object.freeze({
        key: 'milk',
        textureKey: 'api_item_milk_normal',
        label: 'Milk',
        required: 1,
        collected: 0,
        sItemKey: 'milk',
        rackId: 'beverages',
    }),
    Object.freeze({
        key: 'tomatos',
        textureKey: 'api_item_tomato_normal',
        label: 'Tomatoes',
        required: 1,
        collected: 0,
        sItemKey: 'tomato',
        rackId: 'fruits',
    }),
]);

export const SHOPPING_LIST_SLOT_COUNT = 6;
