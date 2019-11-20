// tables[0] = new Table(0, '10-ти местный стол', eventEmitter(0), 10, 2, 1, 200, 40, false);

module.exports = [{
    count: 10,
    sb: 1,
    minBuyIn: 10,
    maxBuyIn: 30,
    type: 'light'
}, {
    count: 10,
    sb: 2,
    minBuyIn: 40,
    maxBuyIn: 200,
    type: 'middle'
},
{
    count: 10,
    sb: 5,
    minBuyIn: 500,
    maxBuyIn: 1500,
    type: 'hard'
},
{
    count: 10,
    sb: 10,
    minBuyIn: 2000,
    maxBuyIn: 1000000,
    type: 'unlim'
},
// 6-H
{
    count: 6,
    sb: 2,
    minBuyIn: 20,
    maxBuyIn: 80,
    type: 'light'
}, {
    count: 6,
    sb: 4,
    minBuyIn: 60,
    maxBuyIn: 400,
    type: 'middle'
},
{
    count: 6,
    sb: 8,
    minBuyIn: 700,
    maxBuyIn: 2000,
    type: 'hard'
},
{
    count: 6,
    sb: 15,
    minBuyIn: 2000,
    maxBuyIn: 1000000,
    type: 'unlim'
},

// 2-H

{
    count: 2,
    sb: 3,
    minBuyIn: 40,
    maxBuyIn: 200,
    type: 'light'
}, {
    count: 2,
    sb: 5,
    minBuyIn: 100,
    maxBuyIn: 800,
    type: 'middle'
},
{
    count: 2,
    sb: 10,
    minBuyIn: 1000,
    maxBuyIn: 3000,
    type: 'hard'
},
{
    count: 2,
    sb: 20,
    minBuyIn: 2000,
    maxBuyIn: 1000000,
    type: 'unlim'
}
];