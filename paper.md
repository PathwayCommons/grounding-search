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

The identification of sub-cellular biological entities is an important consideration in the use and creation of bioinformatics analysis tools and accessible biological research apps.  When research information is uniquely and unambiguously identified, it enables data to be accurately retrieved, cross-referenced, and integrated.  In practice, biological entities are “identified” when they are associated with a matching record from a knowledge base that specialises in collecting and organising information of that type (e.g. gene sequences).  Our search service increases the efficiency and ease of use for identifying biological entities.  This identification may be used to power research apps and tools where colloquial entity names may be provided as input.

# Statement of need

Outside of the field of bioinformatics, biologists are seldom aware of the concept of grounding data to database identifiers.  When an author labels a biological entity as ‘IL6’, for instance, he or she may not consider that this label is ambiguous.  Is this IL6 for Homo sapiens or for Mus musculus?  If for Mus musculus, there is more than one gene that is called by that name.  By mapping the user’s entity to a database identifier, e.g. 7157 in NCBI Gene, the data becomes disambiguated.

Because many biologists are unaware of the utility of database identifiers, they often have the perception that the common or canonical name of an entity is essentially a sufficient identifier on its own.  These users can be confused by traditional grounding interfaces, where it is the user's responsibility to manually select a particular identifier from a long list.  This sort of grounding interface is incongruent with users' mental model:  What purpose could this list of entities have, when the entity has already been identified by name?

Our search service allows the user to identify an entity by name, as per his or her mental model.  This makes grounding accessible to a wider set of researchers, with high ease of use.  The service returns its results quickly, i.e. in less than 100 milliseconds, so that the result may be shown to a user interactively and without impeding the user’s actions.  As output, the service returns a ranked list of possible groundings, in descending order of relevance.  The first entry in this list is, with high confidence, the intended identifier corresponding to the user’s input.  The remainder of the list exists only for the purposes of allowing the user to recover from an incorrect first identifier.

In the rare case where the service does not return the first result as expected, the user may manually indicate a correction — e.g. ‘I meant this IL6, not that one’.  In order to facilitate this, each identifier in the results list have included a corresponding set of descriptions and metadata that allow the user to manually specify the intended identifier.  To verify the accuracy of the service’s results, a test suite was created.  The tests included entity names selected from PubMed Central, Pathway Commons, and Biofactoid pilots.  Primarily, the test cases were prioritised based on popularity to ensure that commonly-researched entities would be correctly assigned by the service.  In all, there are currently over 765 test cases.  Of those test cases, 91% return the expected result as the first entry in the returned list.  In nearly 98% of cases, the expected result was within the top ten entries in the returned list.

Modern research apps and tools motivate the need for robust, reusable grounding tools that allow for easily identifying biological entities from their common names.  Our grounding service can be used to provide users with an easy-to-use experience in line with their mental model of biological entities.

# Citations

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

