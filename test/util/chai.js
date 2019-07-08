import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import deepEqualInAnyOrder from 'deep-equal-in-any-order';

export const expect = chai.expect;
export const should = chai.should();

// register chai plugins
chai.use( chaiAsPromised );
chai.use(deepEqualInAnyOrder);
