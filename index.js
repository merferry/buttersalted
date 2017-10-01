'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const pg = require('pg');
const pgconfig = require('pg-connection-string');
const Data = require('./data');
const Json = require('./json');
const Pipe = require('./pipe')
const Sql = require('./sql');

const E = process.env;
const X = express();
const HTML = path.join(__dirname, 'html');
const server = http.createServer(X);
const dbpool = new pg.Pool(pgconfig(E.DATABASE_URL));
const data = new Data(dbpool);
const json = Json(data);
const pipe = Pipe(data);
const sql = new Sql(dbpool);
server.listen(E.PORT||80);
data.setup().catch((err) => {
  console.error(err);
});

X.use(bodyParser.json());
X.use(bodyParser.urlencoded({'extended': true}));
X.use('/json', json);
X.use('/pipe', pipe);
X.use('/sql', sql);
X.use('/', express.static(HTML, {'index': false, 'extensions': ['html']}));
X.use((err, req, res, next) => {
  res.status(400).send(err.message);
  console.error(err);
});
// product
// ingredient
/*
- PATCH ID DIFFERENT FROM QUERY ID
- RAW THINGS LOOK GOOD
- TOOLS LIKE MYFITNESSPAL
- REPLACE TERMS SQL
- USE LIMITS
- FACE THE ROOKIES
*/
