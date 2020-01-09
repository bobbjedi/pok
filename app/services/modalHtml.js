const el = document.createElement('div');
el.id = 'global-wrap';
el.classList.add('modal-wrap');
document.body.appendChild(el);

export default (html, cb) =>{
    el.innerHTML = '<div class="modal">' + html + '</div>';
    el.style.display = 'block';
    el.onclick = () =>{
        el.style.display = 'none';
        el.innerHTML = '';
        cb && cb();
    };
};