const log = require('../helpers/log');
const sha256 = require('sha256');
const {usersDb, restorePswdDb} = require('./DB');
const $u = require('../helpers/utils');
const publicApi = require('./publicApi');
const minter = require('./minter');

module.exports = (app) => {
    app.get('/api', async (req, res) => {
        let checkUser;
        try {
            const action = req.query.action;
            const GET = JSON.parse(req.query.data);
            const User = await $u.getUserFromQ({token: GET.token});
            // роуты
            switch (action) {
            case ('getUser'):
                if (User) {
                    await updateIp(User, req);
                    //TODO: приделать время жизни токена
                    User.isLogged = true;
                    clearUser(User);
                    success(User, res);
                } else {
                    error(null, res);
                }
                break;

            case ('login'):
                checkUser = await usersDb.findOne({$and: [{login: GET.login}, {password: sha256(GET.password.toString())}]});
                if (!checkUser){
                    error('This login and password not found', res);
                    return;
                }
                success(await assignUser(checkUser, req), res);
                break;

            case ('registration'):
                const newUser = await $u.createUser(GET);
                if (newUser.error){
                    return error(newUser.error, res);
                }
                console.log({newUser});
                success(await assignUser(newUser.user, req), res);
                break;

            case ('withdraw'):
                const resWithdraw = await minter.withdraw(User, GET.amount);
                if (resWithdraw){
                    success({}, res);
                } else {
                    error('Произошла ошибка, попробуйте еще раз!', res);
                }
                break;

            case ('roomCreate'):
                GET.creator_user_id = User._id;
                console.log('GET>', GET);
                const createdRoomId = $u.createCustomTable(GET);
                if (createdRoomId){
                    success({createdRoomId}, res);
                } else {
                    error('Произошла ошибка, попробуйте еще раз!', res);
                }
                break;
                
            case ('restorePswd'):
                const {pswd} = GET;
                if (!pswd || pswd.length < 3){
                    return error('Пароль слишком короткий!', res);
                }
                const newPswd = $u.createPswd(pswd);
                const controlWord = $u.createPswd(newPswd + new Date().getTime()).substr(-8);
                new restorePswdDb({password: newPswd, controlWord, time: $u.unix()}, 1);
                success({controlWord}, res);
                break;

            case ('goInTourn'):
                const resGoInError = await $u.playerGoInTourn(User);
                if (!resGoInError){
                    success({message: 'Заявка принята'}, res);
                } else {
                    error(resGoInError, res);
                }
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

    app.post('/upload', async (req, res) => {
        if (!req.files || Object.keys(req.files).length === 0) {
            console.log('No files were uploaded.')
            return res.status(400).send('No files were uploaded.');
        }
        // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
        let sampleFile = req.files.sampleFile;
        let token = req.body.token;
        const user = await $u.getUserFromQ({token});
        if (!user){
            return res.redirect('/#eui');
        }
        console.log('Upload img', user.login);
        // Use the mv() method to place the file somewhere on your server
        sampleFile.mv('./public/avatars/' + user.login + '.jpg', function(err) {
            if (err){
                return res.status(500).send(err);
            }
            console.log('./public/avatars/' + user.login + '.jpg');
            return res.redirect('/#sui');
        });
    });


    app.get('/public', async (req, res) => {
        publicApi(req, res);
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

async function assignUser (user, req){
    try {
        const token = sha256(new Date().toString() + Math.random());
        user.token = token;
        await user.save();
        clearUser(user);
        return user;
    } catch (e){
        log.error('assignUser: ' + e);
        console.log(e);
    }
}


async function updateIp(user, req){
    let needSave = false;
    // console.log('ip', req.ipInfo);
    if (user){
        if (!user.ips){
            needSave = true;
            user.ips = [req.ip];
            user.agents = [req.headers['user-agent']];
        } else {
            if (!user.ips.includes(req.ip)){
                needSave = true;
                user.ips.push(req.ip);
            };
            if (!user.agents.includes(req.headers['user-agent'])){
                needSave = true;
                user.agents.push(req.headers['user-agent']);
            };
        }
    }
    needSave && await user.save();
}


function clearUser(user){
    delete user._id;
    delete user.password;
    delete user.ips;
    delete user.agents;
}
