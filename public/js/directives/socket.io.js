import config from '../../../config';
import io from '../libs/socket';

const {domain} = config;

window.socket = io.connect(domain);
