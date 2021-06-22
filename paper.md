---
title: 'A flexible search system for high-accuracy identification of biological molecules and entities'
tags:
  - biological entities
  - biological molecules
  - grounding
  - identifiers
  - identification
  - search
  - JavaScript
  - Docker
authors:
  - name: Max Franz
    orcid: 0000-0003-0169-0480
    affiliation: 1
  - name: Jeff Wong
    affiliation: 1
    orcid: TODO
  - name: Metin Can Siper
    orcid: TODO
    affiliation: 2
  - name: Emek Demir
    orcid: TODO
    affiliation: 2
  - name: Gary Bader^[Corresponding author]
    orcid: TODO
    affiliation: 1
affiliations:
 - name: University of Toronto
   index: 1
 - name: University of Oregon
   index: 2
 - name: Harvard University
   index: 3
date: 1 August 2021
bibliography: paper.bib
---

# Summary

The identification of sub-cellular biological entities is an important consideration in the use and creation of bioinformatics analysis tools and accessible biological research apps.  When research information is uniquely and unambiguously identified, it enables data to be accurately retrieved, cross-referenced, and integrated.  In practice, biological entities are “identified” when they are associated with a matching record from a knowledge base that specialises in collecting and organising information of that type (e.g. gene sequences).  Our search service increases the efficiency and ease of use for identifying biological entities, as compared to prior approaches.  This identification may be used to power research apps and tools where colloquial entity names may be provided as input, such as Biofactoid.

# Statement of need

Outside of the field of bioinformatics, biologists are seldom aware of the concept of grounding data to database identifiers.  When an author labels a biological entity as ‘IL6’, for instance, he or she may not consider that this label is ambiguous.  Is this IL6 for Homo sapiens or for Mus musculus?  If for Mus musculus, there is more than one gene that is called by that name.  By mapping the user’s entity to a database identifier, e.g. 7157 in NCBI Gene, the data becomes disambiguated.

Because many biologists are unaware of the utility of database identifiers, they often have the perception that the common or canonical name of an entity is essentially a sufficient identifier on its own.  These users can be confused by traditional grounding interfaces, where it is the user's responsibility to manually select a particular identifier from a long list.  This sort of grounding interface is incongruent with users' mental model:  What purpose could this list of entities have, when the entity has already been identified by name?

Our search service allows the user to identify an entity by name, as per his or her mental model.  This makes grounding accessible to a wider set of researchers, with high ease of use.  The service returns its results quickly, i.e. in less than 100 milliseconds, so that the result may be shown to a user interactively and without impeding the user’s actions.  As output, the service returns a ranked list of possible groundings, in descending order of relevance.  The first entry in this list is, with high confidence, the intended identifier corresponding to the user’s input.  The remainder of the list exists only for the purposes of allowing the user to recover from an incorrect first identifier.  The service is customisable to accommodate various use cases, e.g. interactive grounding interfaces that can dynamically build up heuristics during a user's session with the system.

# Performance evaluation

In the rare case where the service does not return the first result as expected, the user may manually indicate a correction — e.g. ‘I meant this IL6, not that one’.  In order to facilitate this, each identifier in the results list have included a corresponding set of descriptions and metadata that allow the user to manually specify the intended identifier.  To verify the accuracy of the service’s results, a test suite was created.  The tests included entity names selected from PubMed Central, Pathway Commons, and Biofactoid pilots.  Primarily, the test cases were prioritised based on popularity to ensure that commonly-researched entities would be correctly assigned by the service.  In all, there are currently over 765 test cases.  Of those test cases, 91% return the expected result as the first entry in the returned list.  In nearly 98% of cases, the expected result was within the top ten entries in the returned list.

# Mechanism

The database is built using a dynamic indexing approach, with Elasticsearch.  The system includes facilities to download the latest set of identifiers and associated metadata from NCBI Gene, ChEBI, and UniProt.  This indexing process is exposed as a top-level command, integrated with the search server itself, so that data sources can automatically be kept fresh on a regular basis.  The indices of the grounding service can be exported to an external repository (e.g. Zenodo) and directly imported in order to provide a means of referencing a particular version of an index and to eliminate the need to manually build an index for researchers that reuse the grounding service.

The grounding service operates by making queries on the database, with the query string normalised.  A fuzzy query and a precise query are made to the database to ensure that both exact matches and near matches are included in the initial results.  These initial results are processed with a multithreaded ranking approach.  The Sørensen–Dice coefficient is used to rank the initial results based on each entity's official name and synonyms, considering each entity's best-case score.  For tie-breaking, a series of further metrics are used to order the results.  These metrics include an organism ranking preference, molecular charge, and the Sørensen–Dice coefficient of the official name.  Finally, the data source (namespace) filter may be applied, if specified, in order to include results only of a particular type (e.g. small molecules from ChEBI).

# Usage

With a complete index, the grounding service’s server can be started.  The server exposes a REST-like API to allow for client applications to query the index.  The main endpoint in the API is search.  A search contains a number of input parameters, the user’s typed entity name chief among them.  Other parameters are implicit.  They may be implicitly specified by the user, or they may be specified by the client application.  The target namespace is an implicit parameter that filters the search result by a particular data source (e.g. NCBI Gene).  When unspecified, no namespace filtering is applied.  A second implicit parameter is an organism ranking, which can inform the service of the relative likelihood of a search’s pertinence to a particular organism.  An organism ranking based on general popularity is used by default.

# Discussion

An existing app, Biofactoid, provides an example of how this grounding service empowers novice users to invisibly ground entities to database identifiers.  Biofactoid users typically take a few minutes — typically less than five — to summarise the interactions with a paper.  The database identifiers in author’s Biofactoid documents have been accurate thus far, and these novice users require no training in or understanding of database identifiers in order to create these documents.

Apps that previously required a user to explicitly specify an organism may instead use heuristics paired with the grounding service's API in order to provide intelligent results without user intervention.  On the other hand, organism-specific apps, may leverage the organism ordering to provide results only for the relevant organism.

Further, more natural search systems may emerge as a result of the approaches of this grounding service.  A biological data search engine may allow for natural language queries, powered by the grounding service.  A user may type a search, such as ‘interactions of tnf in human’, in order to get relevant results.  If the user types an ambiguous query, such as ‘tnf’, the search engine may use the ranked results to provide intelligent follow-up questions: ‘Did you mean tnf (mouse)?’  These results and follow-up questions may go so far as to be user-personalised.  A user that predominantly searches for mouse genes may have the search engine provide custom-tailored results, based on a search history used to inform the grounding service.

Modern research apps and tools motivate the need for robust, reusable grounding tools that allow for easily identifying biological entities from their common names.  Our grounding service can be used to provide users with an easy-to-use experience in line with their mental model of biological entities.


# Citations

*This section will be deleted.  Keep it for now so it can be used as a reference.*

Citations to entries in paper.bib should be in
[rMarkdown](http://rmarkdown.rstudio.com/authoring_bibliographies_and_citations.html)
format.

If you want to cite a software repository URL (e.g. something on GitHub without a preferred
citation) then you can do it with the example BibTeX entry below for @fidgit.

For a quick reference, the following citation commands can be used:
- `@author:2001`  ->  "Author et al. (2001)"
- `[@author:2001]` -> "(Author et al., 2001)"
- `[@author1:2001; @author2:2001]` -> "(Author1 et al., 2001; Author2 et al., 2002)"


# Acknowledgements

TODO

# References

