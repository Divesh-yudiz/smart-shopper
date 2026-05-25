const _ = {};

_.randomFromArray = (arr = []) => {
    return arr[Math.floor(Math.random() * arr.length)];
}

_.sumArray = (arr = []) => {
    return arr.reduce((acc, cur) => acc + cur, 0);
}

_.averageArray = (arr = []) => {
    return _.sumArray(arr) / arr.length;
}

_.maxArray = (arr = []) => {
    return Math.max(...arr);
}

_.minArray = (arr = []) => {
    return Math.min(...arr);
}

_.shuffleArray = (arr = []) => {
    return arr.sort(() => Math.random() - 0.5);
}

_.randomBetween = (min = 0, max = 0) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

_.delay = (ttl = 0) => new Promise((resolve) => setTimeout(resolve, ttl));

_.appendZero = (number) => {
    return number < 10 ? '0' + number : number;
};

_.isEmail = (email) => {
    const regeX = /[a-z0-9._%+-]+@[a-z0-9-]+[.]+[a-z]{2,5}$/;
    return !regeX.test(email);
};

_.getFirstCapital = (string = '') => {
    const strings = string.split(' ');
    const map = [];
    for (const str of strings) {
        if (str == '') continue;
        map.push(str[0].toUpperCase() + str.substring(1));
    }
    return map.join(' ');
};

_.appendSuffix = (string = '', length = 10, suffix = '..') => {
    return string.length > length ? string.substring(0, length) + suffix : string;
};

_.appendMoneySymbolFront = (amount, symbol = '₹') => {
    return symbol + amount;
};

_.milliSecondsToMinute = (seconds) => {
    const minutes = Math.floor(seconds / 60000);
    const remainingSeconds = Math.floor((seconds % 60000) / 1000);
    return _.appendZero(minutes) + ':' + _.appendZero(remainingSeconds);
}

_.secondsToMinute = (seconds) => {
    return _.appendZero(Math.floor(seconds / 60)) + ':' + _.appendZero(Math.floor(seconds % 60));
}

_.appendMoneySymbolBack = (amount, symbol = '₹') => {
    return amount + symbol;
};

_.getSeats = (mySeat = 0) => {
    const aSeats = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    if (mySeat === 0) return aSeats;
    const firstPart = aSeats.slice(mySeat);
    const secondPart = aSeats.slice(0, mySeat);
    const rearrangedSeats = [...firstPart, ...secondPart];
    return rearrangedSeats;
}

_.formatCurrency = (amount = 0) => {
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(1) + 'B';
    } else if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        return amount.toLocaleString('en-US');
    } else {
        return amount;
    }
};
export default _;