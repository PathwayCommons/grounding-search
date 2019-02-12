const express = require('express');
const router = express.Router();
const uniprot = require('../datasource/uniprot');
const aggregate = require('../datasource/aggregate');

const handleReq = (source, req, res) => {
  source.search(req.body.q).then(searchRes => res.json(searchRes));
};

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index.html');
});

// e.g. POST /uniprot { q: 'p53' }
router.post('/uniprot', function(req, res){
  handleReq(uniprot, req, res);
});

// e.g. POST /search { q: 'p53' }
router.post('/search', function(req, res){
  handleReq(aggregate, req, res);
});

module.exports = router;
