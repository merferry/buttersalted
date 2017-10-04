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

const locationSet = function(hsh) {
  // 1. replace temp handler only if hash changed
  const fn = window.onhashchange;
  if(hsh!==location.hash) window.onhashchange = function() {
    window.onhashchange = fn;
  };
  // 2. update location
  location.href = location.origin+'/'+hsh;
};

const ansRender = function(ans) {
  console.log('ansRender');
  // 1. set table head, body from data
  m.render(Thead, ans.length? m('tr', Object.keys(ans[0]).map((k) => m('th', k))) : null);
  m.render(Tbody, ans.length? ans.map((r) => m('tr', Object.values(r).map((v) => m('td', v)))) : null);
  // 3. show toast message (if empty)
  if(!ans.length) iziToast.warning({'title': 'Empty Query', 'message': 'no values returned'});
};

const ansError = function(err) {
  console.log('ansError');
  // 1. clear table
  m.render(Thead, null);
  m.render(Tbody, null);
  // 2. show toast message
  iziToast.error({'title': 'Query Error', 'message': err.message});
};

const actRender = function(ans) {
  console.log('actRender');
  // 1. show toast message
  iziToast.info({'title': 'Action successful', 'message': ans});
};

const actError = function(err) {
  console.log('actError');
  // 1. show toast message
  iziToast.error({'title': 'Action failed', 'message': err.message});
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

const inpKv = function(e, key, val, katt, vatt) {
  // 1. setup component (empty, yet need to refer it)
  const comp = {};
  // 2. this handles key change
  const onkey = function() {
    // a. get new key
    const k = this.value;
    // b. created if filled, delete if emptied
    if(k && !key) e.create(comp);
    if(!k && key) e.delete(comp);
    // c. update key
    key = k;
  };
  // 3. this handles value change
  const onval = function() {
    // a. update value
    val = this.value;
  };
  // 4. return component
  return Object.assign(comp, {'view': function() { return m('fieldset', [
    m('input', Object.assign({'value': key, 'onchange': onkey}, katt)),
    m('input', Object.assign({'name': key, 'value': val, 'onchange': onval}, vatt))
  ]); }});
};

const formKv = function(frm, katt, vatt, val) {
  console.log('formKv');
  // 1. define components
  const Comps = new Set();
  // 2. handle create and delete of components
  const e = {
    'create': function(c) { Comps.add(inpKv(e, '', '', katt, vatt)); },
    'delete': function(c) { Comps.delete(c); }
  };
  // 3. initialize components from input
  val = Object.assign(val||{}, {'': ''});
  for(var k in val)
    Comps.add(inpKv(e, k, val[k], katt, vatt));
  // 4. handle form reset
  frm.onreset = function() {
    Comps.clear();
    e.create();
  };
  // 5. mount combined component to form
  m.mount(frm, {'view': function() {
    var z = [];
    for(var c of Comps)
      z.push(c.view());
    return z;
  }});
};

const formSql = function() {
  console.log('formSql');
  // 1. switch to query mode, and get form data
  Html.classList.add('query');
  const value = Editor.getValue();
  // 2. update location, and make ajax request
  locationSet('#!/?'+m.buildQueryString({'value': value}));
  m.request({'method': 'GET', 'url': '/sql/'+value}).then(ansRender, ansError);
  return false;
};

const formJson = function() {
  console.log('formJson');
  // 1. switch to query mode, and get form data
  Html.classList.add('query');
  const data = formGet(this);
  const sbt = this.submitted;
  const tab = this.parentElement.id;
  const id = data.id||data.Id;
  // 2. update location, and make ajax request (4 options)
  locationSet('#!/'+tab+'?'+m.buildQueryString(data));
  const req = (h, u) => m.request({'method': h, 'url': '/json/'+u, 'data': data});
  if(sbt==='select') req('GET', tab).then(ansRender, ansError);
  else if(sbt==='insert') req('POST', tab).then(actRender, actError);
  else if(sbt==='update') req('PATCH', tab+'/'+id).then(actRender, actError);
  else if(sbt==='delete') req('DELETE', tab+'/'+id).then(actRender, actError);
  return false;
};

const setupPage = function(e) {
  console.log('setupPage');
  // 1. define food key, value attributes
  const katt = {'list': 'types', 'placeholder': 'Column name, like: Id'};
  const vatt = {'type': 'text', 'placeholder': 'Value, like: 1001'};
  // 2. get path, prefix, and query
  const path = location.hash.replace(/#?\!?\/?/, '')
  const pre = path.split(/[\/\?]/)[0].toLowerCase()||'sql';
  const sqry = path.split('?')[1]||'';
  const qry = sqry? m.parseQueryString(sqry) : {};
  // 3. update html class list (updates ui)
  Html.classList.value = pre;
  if(sqry) Html.classList.add('query');
  // 4. prepare forms if just loaded
  if(pre==='sql') Editor.setValue(qry.value||'');
  else if(pre!=='food') formSet(Forms[pre], qry);
  formKv(FoodInputs, katt, vatt, pre==='food'? qry : {});
  // 5. submit form if have query
  if(sqry) Forms[pre].onsubmit();
};

const setup = function() {
  console.log('setup');
  // 1. enable form multi submit
  const submit = document.querySelectorAll('form [type=submit]');
  for(var i=0, I=submit.length; i<I; i++)
    submit[i].onclick = function() { this.form.submitted = this.value; };
  // 2. setup types data list
  m.request({'method': 'GET', 'url': '/json/type'}).then((ans) => {
    m.render(Types, ans.map((r) => m('option', r.id)));
  });
  // 2. setup ace editor
  Editor.setTheme('ace/theme/sqlserver');
  Editor.getSession().setMode('ace/mode/pgsql');
  Editor.focus();
  // 3. setup sql interface
  for(var k in Forms)
    Forms[k].onsubmit = formJson;
  Forms.sql.onsubmit = formSql;
  // 4. setup page
  window.onhashchange = setupPage;
  setupPage();
};

// 2. begin setup
setup();
