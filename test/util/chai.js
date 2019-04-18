import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

export const expect = chai.expect;
export const should = chai.should();

// register chai plugin for promises
chai.use( chaiAsPromised );
