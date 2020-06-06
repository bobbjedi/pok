import top from './topPath.html';
import bottom from './bottomPath.html';
import card from './cardPath.html';
import bon from './bon.html';
import seatVar from './seatVar.html';
import settings from './settings.html';

export default (count) => {
    let bon_ = bon.replace('<!--bottomPath-->', bottom)
        .replace('<!--topPath-->', top)
        .replace('<!--settings-->', settings)
        .replace('<!--cardPath-->', card);
    const nums = counts[count];
    for (const s in nums) {
        const c = nums[s];
        const seat = seatVar.replace(/\%s\%/g, s).replace(/\%c\%/, c).replace(/\%class\%/, classes[c]);
        bon_ = bon_.replace('<!--set' + c + '-->', seat);
    };
    return bon_;
};

const counts = {
    10: { // seat / cell
        0: 0,
        1: 1,
        2: 2,
        3: 3,
        4: 4,
        5: 5,
        6: 6,
        7: 7,
        8: 8,
        9: 9
    },
    8: { // seat / cell
        0: 0,
        1: 1,
        2: 2,
        3: 3,
        4: 5,
        5: 6,
        6: 7,
        7: 8
    },
    6: {
        0: 1,
        1: 2,
        5: 9,
        2: 4,
        4: 7,
        3: 6
    },
    2: {
        0: 9,
        1: 4
    }
};
//cell : classes
const classes = {
    0: 'top left',
    3: 'top right',
    8: 'bottom left',
    5: 'bottom right'
};
