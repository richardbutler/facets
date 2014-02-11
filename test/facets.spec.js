/*global describe, beforeEach, it */

var expect  = require('chai-stack').expect,
    trilby  = require('trilby'),
    facets  = require('../'),
    data    = require('./fixtures/nobelprize.json');

describe('facets', function() {
    var store, fields;
    
    //fields = ['Year', 'Country', 'Sex', 'Joint?', 'Institution or individual?'];
    fields = [
        { name: 'Year', type: 'number' },
        'Country',
        'Sex',
        { name: 'Joint?', type: 'boolean', map: function(value) { return value === 'Yes'; } },
        'Institution or individual?'
    ];
    
    beforeEach(function() {
        store = facets({
            fields: fields
        }).data(data);
    });
    
    describe('collating', function() {
        it('should only collate the supplied fields', function() {
            expect(store.fields().length).to.equal(fields.length);
        });
        it('should collate options', function() {
            expect(store.field('Country').options().length).to.equal(42);
        });
        it('should sort options', function() {
            expect(store.field('Country').options(0).value).to.equal('Argentina');
        });
        it('should sort decorate numeric fields', function() {
            expect(store.field('Year').min).to.equal(1901);
            expect(store.field('Year').max).to.equal(2012);
        });
    });
    
    describe('sorting', function() {
        it('should sort the data', function() {
            expect(store.sortsOn('Country').exec().data()[0]['Winner']).to.equal('Carlos Saavedra Lamas');
        });
        it('should do a complex sort', function() {
            var store = facets().data([
                { Year: 2012, Letter: 'A', Value: 1, Winner: 'AB' },
                { Year: 2010, Letter: 'A', Value: 2, Winner: 'BC' },
                { Year: 2010, Letter: 'C', Value: 4, Winner: 'CD' },
                { Year: 2010, Letter: 'C', Value: 3, Winner: 'DE' },
                { Year: 2011, Letter: 'A', Value: 3, Winner: 'EF' }
            ]);
            
            var sorted = store.sortsOn(['Year', 'Letter', 'Value']).exec();
            
            expect(trilby(sorted.data()).pluck('Winner').join(',')).to.equal('BC,DE,CD,EF,AB');
        });
    });

    describe('filtering', function() {
        it('should filter the data and the field options', function() {
            // Filter by Switzerland
            store
                .field('Country')
                .filters(facets.filter.equals('Switzerland'));
            
            var filtered = store.exec();
            expect(filtered.data().length).to.equal(12);
            expect(filtered.field('Country').options().length).to.equal(1);

            // Filter the original store by a second field - joint winners
            store
                .field('Joint?')
                .filters(facets.filter.equals(false));

            var filtered2 = store.exec();
            expect(filtered2.data().length).to.equal(8);
            expect(filtered2.field('Joint?').options().length).to.equal(1);

            // Filter the first filtered collection by the second field, and
            // expect the result to be the same
            filtered
                .field('Joint?')
                .filters(facets.filter.equals(false));
            
            var filtered3 = filtered.exec();
            expect(filtered3.data().length).to.equal(8);
            expect(filtered3.field('Joint?').options().length).to.equal(1);
        });
        it('should filter the data using a range filter', function() {
            // Filter by range 1980-1984
            store
                .field('Year')
                .filters(facets.filter.range(1980, 1984));

            var filtered = store.exec();
            expect(filtered.data().length).to.equal(6);
            expect(filtered.field('Year').min).to.equal(1980);
            expect(filtered.field('Year').max).to.equal(1984);
        });
        it('should handle multiple filters', function() {
            store
                .field('Year')
                .filters(facets.filter.range(1980, 1984));

            store
                .field('Country')
                .filters(facets.filter.equals('Switzerland'));

            var filtered = store.exec();
            expect(filtered.data().length).to.equal(1);
            expect(filtered.field('Year').min).to.equal(1981);
            expect(filtered.field('Year').max).to.equal(1981);
            expect(filtered.field('Country').options().length).to.equal(1);
        });
    });

    describe('indexing', function() {
        it('should calculate results ahead of time', function() {
            expect(store.field('Country').option('Switzerland').results().length).to.equal(12);
        });
        it('should index an option ahead of time', function() {
            expect(store.field('Country').index().option('Sweden').results().length).to.equal(5);
        });
    });
    
    describe('matchers', function() {
        describe('range', function() {
            it('should work', function() {
                var filter = facets.filter.range(5, 10);
                expect(filter(7));
                expect(filter(10));
                expect(!filter(1));
            });
        });
        describe('equals', function() {
            it('should work', function() {
                var filter = facets.filter.equals('foo');
                expect(filter('foo'));
                expect(!filter('bar'));
            });
        });
        describe('greaterThan', function() {
            it('should work', function() {
                var filter = facets.filter.greaterThan(5);
                expect(filter(10));
                expect(!filter(1));
            });
        });
        describe('lessThan', function() {
            it('should work', function() {
                var filter = facets.filter.lessThan(5);
                expect(filter(1));
                expect(!filter(5));
            });
        });
        describe('contains', function() {
            it('should work when case sensitive', function() {
                var filter = facets.filter.contains('Foo', true);
                expect(filter('Foobar'));
                expect(!filter('foobar'));
            });
            it('should work when case insensitive', function() {
                var filter = facets.filter.contains('Foo');
                expect(filter('barFoo'));
                expect(filter('barfoo'));
                expect(!filter('barbaz'));
            });
            it('should work when an array', function() {
                var filter = facets.filter.contains('FoO', true);
                expect(filter(['FoO', 'bar']));
                expect(!filter(['FoOo', 'bar']));
                expect(!filter(['foobar', 'barbaz']));
            });
            it('should work when an array and case insensitive', function() {
                var filter = facets.filter.contains('FoO');
                expect(filter(['Foo', 'Bar']));
                expect(filter(['Foooo', 'Bar']));
                expect(!filter(['Foobar', 'Barbaz']));
            });
        });
        describe('maybe', function() {
            it('should work', function() {
                var filter = facets.filter.maybe();
                expect(filter(true));
                expect(filter(1));
                expect(!filter(false));
                expect(!filter(''));
            });
        });
    });
});