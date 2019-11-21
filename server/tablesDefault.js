// tables[0] = new Table(0, '10-ти местный стол', eventEmitter(0), 10, 2, 1, 200, 40, false);

module.exports = [{
    count: 10,
    sb: 0.1,
    type: 'light'
}, {
    count: 10,
    sb: 2,
    type: 'middle'
},
{
    count: 10,
    sb: 4,
    type: 'hard'
},
{
    count: 10,
    sb: 8,
    maxBuyIn: 1000000,
    type: 'unlim'
},
// 6-H
{
    count: 6,
    sb: 0.2,
    type: 'light'
}, {
    count: 6,
    sb: 3,
    type: 'middle'
},
{
    count: 6,
    sb: 6,
    type: 'hard'
},
{
    count: 6,
    sb: 12,
    maxBuyIn: 1000000,
    type: 'unlim'
},

// 2-H

{
    count: 2,
    sb: 0.5,
    // minBuyIn: 40,
    // maxBuyIn: 200,
    type: 'light'
}, {
    count: 2,
    sb: 4,
    // minBuyIn: 100,
    // maxBuyIn: 800,
    type: 'middle'
},
{
    count: 2,
    sb: 8,
    // minBuyIn: 1000,
    // maxBuyIn: 3000,
    type: 'hard'
},
{
    count: 2,
    sb: 16,
    // minBuyIn: 2000,
    maxBuyIn: 1000000,
    type: 'unlim'
}
];