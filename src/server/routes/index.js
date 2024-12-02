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
 *     description: Search for a grounding
 *     tags:
 *       - grounding-search
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: Search parameters (JSON)
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             q:
 *               type: string
 *               description: The biological entity name to search for.
 *               example: "p53"
 *               required: true
 *             organismOrdering:
 *               type: array
 *               description: An array of taxon IDs used to indicate tie-breaking ordering preferences (i.e. earlier entries in the array are ranked earlier in the resulting list in cases of tie-breaking).  By default, an ordering based on popularity is used.
 *               example: ["9606", "10090"]
 *               required: false
 *             namespace:
 *               type: array
 *               description: An array of datasource namespaces to use as a filter (i.e. "ncbi", "chebi", or "uniprot").  By default, only NCBI and ChEBI are used.
 *               example: ["ncbi", "chebi"]
 *               required: false
 *     responses:
 *       200:
 *         description: Search results (JSON array)
 */
// e.g. POST /search { q: 'p53' }
router.post('/search', function(req, res){
  const { namespace, q, organismOrdering } = req.body;

  aggregate.search(q, namespace, organismOrdering).then(ents => res.json(ents));
});

// for internal use / quick testing, e.g. http://localhost:3000/search?q=pcna
router.get('/search', function(req, res){
  let { namespace, q, organismOrdering } = req.query;

  organismOrdering = organismOrdering || '';

  aggregate.search(q, namespace, organismOrdering.split(',')).then(ents => res.json(ents));
});

/**
 * @swagger
 * /get:
 *   post:
 *     description: Get the metadata for a specified grounding
 *     tags:
 *       - grounding-search
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: Query parameters (JSON)
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             namespace:
 *               type: string
 *               description: The database namespace of the grounding (i.e. one of "ncbi", "chebi", or "uniprot").
 *               example: "ncbi"
 *               required: true
 *             id:
 *               type: string
 *               description: The database identifier of the grounding.
 *               example: "7157"
 *               required: true
 *     responses:
 *       200:
 *         description: The metadata for the grounding
 *       404:
 *         description: The grounding was not found
 */
router.post('/get', function(req, res, next){
  const { namespace, id } = req.body;

  aggregate
    .get(namespace, id)
    .then(searchRes => res.json(searchRes))
    .catch(next);
});

/**
 * @swagger
 * /map:
 *   post:
 *     description: Map a database identier from one namespace to another namespace (e.g. NCBI to Uniprot)
 *     tags:
 *       - grounding-search
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: Query parameters (JSON)
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             dbfrom:
 *               type: string
 *               description: The MIRIAM database prefix of the provided ID.
 *               example: "ncbigene"
 *               required: true
 *             id:
 *               type: string
 *               description: The provided ID to map to the "dbto" database.
 *               example: "7157"
 *               required: true
 *             dbto:
 *               type: string
 *               description: The MIRIAM database prefix of the database to map to.
 *               example: "uniprot"
 *               required: true
 *     responses:
 *       200:
 *         description: The metadata for the grounding
 */
router.post('/map', function(req, res){
  const { dbfrom, id, dbto } = req.body;
  aggregate.map( dbfrom, id, dbto  ).then( searchRes => res.json( searchRes ) );
});

export default router;
