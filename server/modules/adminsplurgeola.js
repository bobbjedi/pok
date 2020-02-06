const log = require('../helpers/log');
const sha256 = require('sha256');
const {usersDb, depositsDb, actionsStatDb} = require('./DB');
const $u = require('../helpers/utils');
const Store = require('./Store');

const {withdraw} = require('./minter');

module.exports = (app) => {
    app.get('/adminsplurgeola', async (req, res) => {
        let checkUser;
        try {
            const action = req.query.action;
            const GET = JSON.parse(req.query.data);
            const User = await $u.getUserFromQ({token: GET.token});
            if (User.login !== 'Dev'){
                return error(null, res);
            }
            // роуты
            switch (action) {
            case ('updUsers'):
                success(await usersDb.db.syncFind({}), res);
                break;

            case ('getTx'):
                success(await depositsDb.db.syncFind({user_id: GET._id}), res);
                break;

            case ('actionsStatDb'):
                success(await actionsStatDb.db.syncFind({}), res);
                break;

            case ('editUser'):
                const editedUser = GET.user;
                const userToEdit = await $u.getUserFromQ({_id: editedUser._id, login: editedUser.login});
                if (!userToEdit){
                    return error('НЕ нашел юзера', res);
                }
                Object.assign(userToEdit, editedUser);
                await userToEdit.save();
                success({1: 1}, res);
                break;

            case ('gamesPaused'):
                Store.isGamesPaused = !Store.isGamesPaused;
                success({1: 1}, res);
                break;

            case ('roomCreate'):
                GET.creator_user_id = User._id;
                const createdRoomId = $u.createCustomTable(GET);
                if (createdRoomId){
                    success({createdRoomId}, res);
                } else {
                    error('Произошла ошибка, попробуйте еще раз!', res);
                }
                break;

            case ('createMtt'):
                console.log('createMtt>', GET);
                let msg = 'Ok';
                if (!Store.system.mtt.isRegOppened){
                    Store.createMtt(GET);
                } else {
                    msg = 'MTT уже есть';
                }
                success({msg}, res);
                break;

            case ('rmMtt'):
                console.log('rmMtt>', GET);
                Store.rmMtt(GET.isReturn);
                success({}, res);
                break;

            case ('startMtt'):
                console.log('startMtt>', GET);
                if (Store.system.mtt.isRegOppened){
                    Store.startMtt();
                    return success({}, res);
                } 
                return error('МТТ не создан', res);
                break;

            case ('multReturnChips'):
                console.log('multReturnChips>', GET);
                $u.multSendCoins(GET.logins, GET.amount, GET.coinName);
                return success({}, res);
                break;
                
            default:
                error('error endpoint', res);
                break;
            }

        } catch (e) {
            console.log({e});
            error('Error api code 1', res);
        }
    });
};

function error(msg, res) {
    try {
        msg && log.error(msg);
        res.json({success: false,
            msg,
        });
    } catch (e) {
        console.log(e);
    }
}
async function success(data, res) {
    try {
        res.json({
            success: true,
            result: data
        });
    } catch (e) {
        console.log(e);
    }
}


