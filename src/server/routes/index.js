import express from 'express';
import { aggregate } from '../datasource/aggregate';
import { eSearch, eSummary, eSearchSummaries } from '../datasource/eutils';

const router = express.Router();


/* GET home page. */
router.get('/', function(req, res) {
  res.redirect('/api/docs');
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
  const { namespace, q, organismOrdering } = req.body;

  aggregate.search(q, namespace, organismOrdering).then(ents => res.json(ents));
});

// TODO docs
router.get('/search', function(req, res){
  const { namespace, q, organismOrdering } = req.query;

  aggregate.search(q, namespace, organismOrdering).then(ents => res.json(ents));
});

// TODO swagger docs
router.post('/get', function(req, res){
  const { namespace, id } = req.body;

  aggregate.get(namespace, id).then(searchRes => res.json(searchRes));
});

// DEBUG
router.post('/esearch', function(req, res, next){
  const { term } = req.body;
  eSearch({ term })
    .then( data => res.json( data ) )
    .catch( next );
});

router.post('/esummary', function(req, res, next){
  const opts = req.body;
  eSummary(opts)
    .then( data => res.json( data ) )
    .catch( next );
});

router.post('/esearchsummaries', function(req, res, next){
  const opts = req.body;
  eSearchSummaries(opts)
    .then( data => res.json( data ) )
    .catch( next );
});

export default router;
