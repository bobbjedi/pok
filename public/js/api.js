import axios from 'axios';
import Store from '../Store';
import config from '../../config';
import ed from '../../common/code_sever';

export default async (obj, cb = () => {}, silent, type = 'api') => {
    obj.data = obj.data || {};
    obj.data.token = type === 'api' && (obj.token || Store.user.token);
    // console.log('Req: ', obj.action, obj.data);
    axios.get(config.domain || '' + '/' + type + '?action=' + obj.action + '&data=' + (await ed.e(JSON.stringify(obj.data))))
        .then(async res => {
            const data = res.data;
            // console.log('Resp:', obj.action + ' -> ', data.result);
            if (data.success) {
                cb(JSON.parse(await ed.d(data.result)));
                return;
            }
            // console.warn(obj.action + ' error: ', data);
            if (!silent) {
                Store.$notify({
                    type: 'error',
                    group: 'foo',
                    title: 'Error ' + obj.action,
                    text: data.msg
                });
            }
        })
        .catch(function (err) {
            console.warn(obj.data.action, err);
        });
};

