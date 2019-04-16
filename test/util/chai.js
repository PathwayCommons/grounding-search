import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

const expect = chai.expect;
const should = chai.should();

// register chai plugin for promises
chai.use( chaiAsPromised );

export { expect, should };
