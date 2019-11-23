const log = require('../helpers/log');
const sha256 = require('sha256');
const {usersDb, depositsDb, actionsStatDb} = require('./DB');
const $u = require('../helpers/utils');
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

async function assignUser (user){
    try {
        const token = sha256(new Date().toString());
        user.token = token;
        await user.save();
        delete user._id;
        delete user.password;
        return user;
    } catch (e){
        console.log('assignUser: ' + e);
    }
}


