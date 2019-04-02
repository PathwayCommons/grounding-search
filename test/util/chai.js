const chai = require('chai')
  , expect = chai.expect
  , should = chai.should();
const chaiAsPromised = require('chai-as-promised');

// register chai plugin for promises
chai.use( chaiAsPromised );

module.exports = { expect, should };
