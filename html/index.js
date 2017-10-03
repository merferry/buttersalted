// 1. define global variables
const Html = document.querySelector('html');
const Editor = ace.edit('sql-value');
const Header = document.querySelector('header');
const Navs = document.querySelectorAll('nav li > a');
const Sections = document.querySelectorAll('section');
const Thead = document.querySelector('#ans thead');
const Tbody = document.querySelector('#ans tbody');
const Types = document.querySelector('#types');
const FoodInputs = document.querySelector('#food form .inputs');
const Forms = {
  'sql': document.querySelector('#sql form'),
  'food': document.querySelector('#food form'),
  'group': document.querySelector('#group form'),
  'term': document.querySelector('#term form'),
  'type': document.querySelector('#type form'),
  'unit': document.querySelector('#unit form')
};

const stringBefore = function(str, sep) {
  const i = str.search(sep);
  return i>=0? str.substring(0, i) : str;
};

const stringAfter = function(str, sep) {
  const i = str.search(sep);
  return i>=0? str.substring(i+1) : str;
};

const ansRender = function(ans) {
  console.log('ansRender');
  // 1. set table head, body from data
  m.render(Thead, ans.length? m('tr', Object.keys(ans[0]).map((k) => m('th', k))) : null);
  m.render(Tbody, ans.length? ans.map((r) => m('tr', Object.values(r).map((v) => m('td', v)))) : null);
  // 3. show toast message (if empty)
  if(!ans.length) iziToast.info({'title': 'Empty Query', 'message': 'no values returned'});
};

const ansError = function(err) {
  console.log('ansError');
  // 1. clear table
  m.render(Thead, null);
  m.render(Tbody, null);
  // 2. show toast message
  iziToast.error({'title': 'Query Error', 'message': err.message});
};

const formGet = function(frm) {
  // 1. set object from form elements
  const E = frm.elements, z = {};
  for(var i=0, I=E.length; i<I; i++)
    if(E[i].name) z[E[i].name] = E[i].value;
  return z;
};

const formSet = function(frm, val) {
  // 1. set form elements from object
  const E = frm.elements;
  for(var i=0, I=E.length; i<I; i++)
    if(E[i].name && val[E[i].name]) E[i].value = val[E[i].name];
  return frm;
};

const formKv = function(frm, katt, vatt, val) {
  console.log('formKv');
  // 1. setup input vnodes, key functions
  const Inp = [], Fn = [];
  // 2. define a new key-value generator
  const newKv = function(key, val) {
    console.log('newKv', key, val, Inp, Fn);
    // a. define key, onchange function
    const fn = () => key;
    const onchange = function() {
      // i. update key from key input
      key = this.value;
      const i = Fn.indexOf(fn);
      console.log('Fn', Fn, 'Inp', Inp, 'fn', fn, 'i', i);
      Inp[i].children[1].attrs.name = key;
      console.log('onchange', key, val, Inp, Fn);
      // ii. add new key-value if last filled up
      if(key && Fn[Fn.length-1]()) newKv('', '');
      // iii. remove key-value if key empty and not last
      if(!key && Fn.length>1) {
        Inp.splice(i, 1);
        Fn.splice(i, 1);
      }
      console.log('render', frm, window.a=Inp);
      m.render(frm, Inp.map(v => v));
    };
    // b. push vnode for key-value
    Inp.push(m('div.input', [
      m('input', Object.assign({'value': key, 'onchange': onchange}, katt)),
      m('input', Object.assign({'name': key, 'value': val}, vatt))
    ]));
    // c. push key function
    Fn.push(fn);
  };
  // 3. load key-values based on object, and render
  val = Object.assign(val||{}, {'': ''});
  for(var k in val)
    newKv(k, val[k]);
  console.log('renderOnce', frm, Inp);
  m.render(frm, Inp);
};

const formSql = function() {
  console.log('formSql');
  Html.classList.add('query');
  const value = Editor.getValue();
  location.href = location.origin+'/#!/?value='+value;
  m.request({'method': 'GET', 'url': '/sql/'+value}).then(ansRender, ansError);
  return false;
};

const formJson = function() {
  console.log('formJson');
  Html.classList.add('query');
  const data = formGet(this);
  const id = this.parentElement.id;
  location.href = location.origin+`/#!/${id}?${m.buildQueryString(data)}`;
  m.request({'method': 'GET', 'url': `/json/${id}`, 'data': data}).then(ansRender, ansError);
  return false;
};

const setupPage = function(e) {
  console.log('setupPage');
  // 1. define food key, value attributes
  const katt = {'list': 'types', 'placeholder': 'Column name, like: Id'};
  const vatt = {'type': 'text', 'placeholder': 'Column name, like: %'};
  // 2. get path, prefix, and query
  const path = stringAfter(location.hash.replace(/\/?#?\!?\/?/, ''), '/');
  const pre = stringBefore(path, /[\/\?]/).toLowerCase()||'sql';
  const sqry = path.split('?')[1]||'';
  const qry = sqry? m.parseQueryString(sqry) : {};
  // 3. update html class list (updates ui)
  Html.classList.value = pre;
  if(sqry) Html.classList.add('query');
  if(e) return;
  // 3. prepare forms if just loaded
  if(pre==='sql') Editor.setValue(qry.value||'');
  else if(pre!=='food') formSet(Forms[pre], qry);
  formKv(FoodInputs, katt, vatt, pre==='food'? qry : {});
  // 4. submit form if have query
  if(sqry) Forms[pre].onsubmit();
};

const setup = function() {
  console.log('setup');
  // 1. enable form multi submit
  const submit = document.querySelectorAll('form [type=submit]');
  for(var i=0, I=submit.length; i<I; i++)
    submit[i].onclick = function() { this.form.submitted = this.name; };
  // 2. setup types data list
  m.request({'method': 'GET', 'url': '/json/type'}).then((ans) => {
    m.render(Types, ans.map((r) => m('option', r.id)));
  });
  // 2. setup ace editor
  Editor.setTheme('ace/theme/sqlserver');
  Editor.getSession().setMode('ace/mode/pgsql');
  Editor.focus();
  // 3. setup sql interface
  Forms.sql.onsubmit = formSql;
  for(var k in Forms)
    Forms[k].onsubmit = formJson;
  // 4. setup page
  window.addEventListener('hashchange', setupPage);
  setupPage();
};

// 2. begin setup
setup();
