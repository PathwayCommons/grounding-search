const express = require('express');
const router = express.Router();
const uniprot = require('../datasource/uniprot');
const chebi = require('../datasource/chebi');
const aggregate = require('../datasource/aggregate');

const handleReq = (source, req, res) => {
  source.search(req.body.q).then(searchRes => res.json(searchRes));
};

/* GET home page. */
router.get('/', function(req, res) {
  res.redirect('/api/docs');
});

/**
 * @swagger
 * /uniprot:
 *   post:
 *     description: uniprot search service
 *     tags:
 *       - grounding-search
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: q
 *         description: Search text
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Uniprot get query results
 */
// e.g. POST /uniprot { q: 'p53' }
router.post('/uniprot', function(req, res){
  handleReq(uniprot, req, res);
});

/**
 * @swagger
 * /chebi:
 *   post:
 *     description: chebi search service
 *     tags:
 *       - grounding-search
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: q
 *         description: Search text
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Chebi get query results
 */
// e.g. POST /chebi { q: 'iron' }
router.post('/chebi', function(req, res){
  handleReq(chebi, req, res);
});

/**
 * @swagger
 * /search:
 *   post:
 *     description: aggregate search service
 *     tags:
 *       - grounding-search
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: q
 *         description: Search text
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Aggregate get query results
 */
// e.g. POST /search { q: 'p53' }
router.post('/search', function(req, res){
  handleReq(aggregate, req, res);
});

module.exports = router;
