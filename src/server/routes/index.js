import express from 'express';
import { aggregate } from '../datasource/aggregate';

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

export default router;
