/**
 * Local mission catalog for the Choose Mission screen.
 * The list endpoint GET /mini-games/missions is not used.
 */
export const LOCAL_GAME_ID = '69d8eaff08adb0ec7230b6e7';

export const LOCAL_MISSIONS = Object.freeze([
    {
        _id: '6a842c889ec15212e7008604',
        iMiniGameId: LOCAL_GAME_ID,
        nOrder: 1,
        sName: 'Movie Night',
        sDescription: 'Grab snacks and drinks for movie night without going over budget.',
        nBudget: 180,
        nTimeLimit: 120,
        aShoppingList: [
            { sItemKey: 'chilliWafers', sName: 'Chilli Wafers', nQuantity: 1 },
            { sItemKey: 'cola', sName: 'Cola', nQuantity: 1 },
            { sItemKey: 'icecream', sName: 'Icecream', nQuantity: 1 },
            { sItemKey: 'cookies', sName: 'Cookies', nQuantity: 1 },
        ],
    },
    {
        _id: '6a842c889ec15212e7008605',
        iMiniGameId: LOCAL_GAME_ID,
        nOrder: 2,
        sName: 'Kids Fun Party',
        sDescription: 'Pick treats and a small toy for a fun kids party.',
        nBudget: 190,
        nTimeLimit: 120,
        aShoppingList: [
            { sItemKey: 'lollipop', sName: 'Lollipop', nQuantity: 2 },
            { sItemKey: 'teddybear', sName: 'Teddybear', nQuantity: 1 },
            { sItemKey: 'ball', sName: 'Ball', nQuantity: 1 },
            { sItemKey: 'cola', sName: 'Cola', nQuantity: 1 },
            { sItemKey: 'donuts', sName: 'Donuts', nQuantity: 1 },
        ],
    },
    {
        _id: '6a842c889ec15212e7008606',
        iMiniGameId: LOCAL_GAME_ID,
        nOrder: 3,
        sName: 'Birthday Party',
        sDescription: 'Shop cake, sweets, and drinks for a birthday celebration.',
        nBudget: 230,
        nTimeLimit: 130,
        aShoppingList: [
            { sItemKey: 'jelly', sName: 'Jelly', nQuantity: 2 },
            { sItemKey: 'giftCandy', sName: 'Gift Candy', nQuantity: 1 },
            { sItemKey: 'vanillaCake', sName: 'Vanilla Cake', nQuantity: 1 },
            { sItemKey: 'cola', sName: 'Cola', nQuantity: 1 },
        ],
    },
    {
        _id: '6a842c889ec15212e7008607',
        iMiniGameId: LOCAL_GAME_ID,
        nOrder: 4,
        sName: 'Weekly Grocery',
        sDescription: 'Fill a simple grocery list with everyday food items.',
        nBudget: 170,
        nTimeLimit: 120,
        aShoppingList: [
            { sItemKey: 'milk', sName: 'Milk', nQuantity: 2 },
            { sItemKey: 'breads', sName: 'Breads', nQuantity: 1 },
            { sItemKey: 'potato', sName: 'Potato', nQuantity: 3 },
            { sItemKey: 'onion', sName: 'Onion', nQuantity: 2 },
            { sItemKey: 'tomato', sName: 'Tomato', nQuantity: 4 },
        ],
    },
    {
        _id: '6a842c889ec15212e7008608',
        iMiniGameId: LOCAL_GAME_ID,
        nOrder: 5,
        sName: 'Healthy Living',
        sDescription: 'Choose healthier food and drinks while staying on budget.',
        nBudget: 160,
        nTimeLimit: 120,
        aShoppingList: [
            { sItemKey: 'milk', sName: 'Milk', nQuantity: 1 },
            { sItemKey: 'carrot', sName: 'Carrot', nQuantity: 3 },
            { sItemKey: 'orange_juice', sName: 'Orange Juice', nQuantity: 2 },
            { sItemKey: 'cauliflower', sName: 'Cauliflower', nQuantity: 2 },
            { sItemKey: 'breads', sName: 'Breads', nQuantity: 1 },
        ],
    },
]);
