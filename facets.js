/**
 * facets.js
 *
 * @author      Richard Butler <rich@smartcasual.io>
 * @license     MIT <https://github.com/richardbutler/facets/blob/master/LICENSE>
 * @version     0.1.0
 */

/*global module */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['trilby'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('trilby'));
    } else {
        // Browser globals (root is window)
        root.facets = factory(root.trilby);
    }
}(this, function(trilby) {

    /**
     * Creates a facets instance, takes an optional config object:
     * 
     *      var store = facets({
     *          fields: ['title', 'label'] // Only offer these fields as filterable/sortable
     *      })
     *      .data(data);
     *
     * @class   facets
     * @param   {Object} [config]   The config object
     * @return  {Object}            The facets instance
     */
    function facets(config) {
        config = config || {};

        var f = {},
            data,
            fields,
            sortFields = trilby();
        
        function getFacet() {
            return f;
        }

        /**
         * Sets or retrieves the data for this store.
         *
         * @param   {Array}         [d]     The data collection
         * @return  {Array|Object}          The data collection, or the facets instance
         */
        f.data = function(d) {
            var options;
            
            if (typeof d === 'undefined') {
                return data;
            }
            
            data = trilby(d);
            options = collate(data);

            // Normalise the fields into objects
            var normalisedFields = (config.fields || Object.keys(options)).map(function(field) {
                return (typeof field === 'string') ? {
                    name: field,
                    type: 'string'
                } : field;
            });
            
            // Collate the options for each field
            fields = normalisedFields.reduce(function(fields, fieldConfig) {
                var fieldName = fieldConfig.name;
                
                fieldConfig.facets = getFacet;
                
                fields[fieldName] = field(fieldConfig, options[fieldName]);
                
                return fields;
            }, {});
            
            return f;
        };

        /**
         * Adds field names to the sorting stack.
         *
         * @param   {String|Array}  field   A field name, or an array of field names
         * @return  {Object}                The facets instance
         */
        f.sortsOn = function(field) {
            sortFields.add(field);
            return f;
        };
        
        /**
         * Retrives a field object by name.
         *
         * @param   {String}    fieldName   A field name
         * @return  {Object}                The facets instance
         */
        f.field = function(fieldName) {
            return fields[fieldName];
        };
        
        /**
         * Returns all of the collated field objects.
         *
         * @return {Array}  The fields.
         */
        f.fields = function() {
            return Object.keys(fields).map(f.field);
        };
        
        /**
         * Generates a new facets object, with the supplied sort and filter
         * options applied, as a hard-filter/sort.
         *
         * @return {Object}     The new facets instance
         */
        f.exec = function() {
            var filtered = data.slice();
            
            if (sortFields.length) {
                // Run a recursive sort using all the supplied sorting functions
                var sortFns,
                    sortIndex = 0;
                
                sortFns = sortFields
                    .map(f.field)
                    .invoke('sort')
                    .filter(facets.filter.maybe());
                
                function sortFn(fn) {
                    return function(a, b) {
                        var result = fn(a, b);
                        if (result === 0) {
                            var next = sortFns[++sortIndex];
                            return next ? sortFn(next)(a, b) : 0;
                        }
                        return result;
                    };
                }
                
                filtered = filtered.sort(sortFn(sortFns[0]));
            }
            
            // Filter by filter function for each field, if supplied
            f.fields().forEach(function(field) {
                field.filters().forEach(function(fn) {
                    filtered = filtered.filter(fn);
                });
            });
            
            return facets(config).data(filtered);
        };
        
        return f;
    }

    /**
     * A simple hash providing various filter function helpers, to be supplied
     * to `option().filter(fn)`.
     */
    facets.filter = {
        
        /**
         * Generates a filter function for the given range.
         * 
         * @param   {Number}    min     The min value (>=)
         * @param   {Number}    max     The max value (<=)
         * @return  {Function}
         */
        range: function(min, max) {
            return function(item) {
                return Number(item) >= min && Number(item) <= max;
            };
        },
        
        /**
         * Generates a filter function for an exact match.
         * 
         * @param   {Object}    value   Any value to match against.
         * @return  {Function}
         */
        equals: function(value) {
            return function(item) {
                return item === value;
            };
        },
        
        /**
         * Generates a greater-than filter function.
         *
         * @param   {Number}    value   The minimum value (item > value).
         * @return  {Function}
         */
        greaterThan: function(value) {
            return function(item) {
                return item > value;
            };
        },

        /**
         * Generates a less-than filter function.
         *
         * @param   {Number}    value   The maximum value (item < value).
         * @return  {Function}
         */
        lessThan: function(value) {
            return function(item) {
                return item < value;
            };
        },

        /**
         * Generates a simple text search matcher. Also supports array fields.
         *
         * @param   {String}    search              The string to search on
         * @param   {Boolean}   [caseSensitive]     Whether to worry about casing or not
         * @return  {Function}
         */
        contains: function(search, caseSensitive) {
            function correctCase(value) {
                return caseSensitive ? value : value.toLowerCase();
            }

            search = correctCase(search);
            
            return function(value) {
                return (Array.isArray(value) ?
                    value.map(correctCase) : correctCase(value))
                    .indexOf(search) >= 0;
            };
        },

        /**
         * Generates a maybe filter function - i.e. is the value "truthy"?
         * 
         * @return  {Function}
         */
        maybe: function() {
            return function(value) {
                return !!value;
            };
        }
    };

    /**
     * Collation decorators for different field data types.
     * 
     * @private
     */
    var fieldDecorators = {
        'number': function(field, options) {
            options.forEach(function(option) {
                var value = Number(option.value);
                
                field.min = (typeof field.min === 'undefined') ? value : Math.min(field.min, value);
                field.max = (typeof field.max === 'undefined') ? value : Math.max(field.max, value);
            });
        },
        'default': function(field, options) {
            // Index all options by value
            var optionIndex = options.reduce(function(index, option) {
                index[option.value] = option;
                return index;
            }, {});
            
            /**
             * Retrieve all options for this field.
             *
             * @return {Array}
             */
            field.options = function(i) {
                return typeof i === 'undefined' ? options : options[i];
            };

            /**
             * Retrieve an option by its value.
             * @param   {String} value
             * @return  {Object}
             */
            field.option = function(value) {
                return optionIndex[value];
            };

            /**
             * Index this field - pre-filter the data based on the value of this
             * field. Calls `results()` on each option object.
             *
             * @return {Object}     The field object
             */
            field.index = function() {
                options.invoke('results');
                return this;
            };

            /**
             * Sorts all the options for this field, alphabetically.
             *
             * @return {Object}     The field instance
             * @private
             */
            field.sortOptions = function() {
                options.sort(function(a, b) {
                    return defaultSortFunction(a.value, b.value);
                });
                return field;
            };
            
            // Run the options sort
            field.sortOptions();
        }
    };

    /**
     * Create a field object, which is a chainable configuration for a single
     * data field.
     * 
     * @param   {Object}    config      Configuration for the field
     * @param   {Array}     options     The options available for this field
     * @return  {Object}                The field object
     */
    function field(config, options) {
        var field = {},
            sortFunction,
            filterFunctions = trilby(),
            fieldDecorator = fieldDecorators[config.type] || fieldDecorators['default'];
    
        if (options === true) {
            throw new Error('Sound the alarm');
        }
        
        // Mix in the config
        Object.keys(config).forEach(function(key) {
            field[key] = config[key];
        });
        
        // If we have a map function, use it
        function correctValue(value) {
            return (typeof field.map === 'function') ? field.map(value) : value;
        }
        
        function createOption(value) {
            return option(field, value, config.facets().data());
        }
        
        // Wrap options
        options = trilby(options).map(correctValue).map(createOption);
        
        /**
         * Retrieves or assigns the sort function for this field. The sort
         * function is wrapped in a function that supplies the relevant values
         * for this field, so in the signature `function(a, b)`, `a` and `b`
         * will be the values of this field's key in the data item, rather
         * than the data item itself. This allows for much cleaner and DRYer
         * sorting functions.
         * 
         * @param   {Function}          fn  The sort function to apply.
         * @return  {Object|Function}       The field instance or the sort function.
         */
        field.sort = function(fn) {
            if (typeof fn === 'function') {
                sortFunction = fn;
                return field;
            }
            return function(a, b) {
                var fn = sortFunction || defaultSortFunction;
                return fn(correctValue(a[field.name]), correctValue(b[field.name]));
            };
        };
        
        /**
         * Retrieves or assigns one or more filter functions for this field. The
         * filter function is wrapped in a function that supplies the relevant
         * values for this field, so in the signature `function(item)`, `item`
         * will be the values of this field's key in the data item, rather
         * than the data item itself. This allows for much cleaner and DRYer
         * filter functions.
         * 
         * @param   {Array|Function}    fns     The filter function(s)
         * @return  {Object|Array}              The field instance or the array of filter functions
         */
        field.filters = function(fns) {
            if (arguments.length) {
                filterFunctions.add(trilby(fns));
                return field;
            }
            return filterFunctions.map(wrapFilter);
        };
        
        function wrapFilter(fn) {
            return function(item) {
                return fn(correctValue(item[field.name]));
            }
        }

        // Decorate this field, if applicable
        if (typeof fieldDecorator === 'function') {
            fieldDecorator(field, options);
        }
        
        return field;
    }
    
    function option(field, value, data) {
        var option = {},
            results;
        
        option.field = field;
        option.value = value;
        
        option.results = function() {
            if (!results) {
                results = data.filter(facets.filter.equals(value), field.name);
            }

            return results;
        };
        
        option.count = function() {
            return option.results().length;
        };
        
        return option;
    }

    /**
     * Collates the list of available options for each field - essentially
     * extracts the unique values for each field.
     * 
     * @param   {Array}     data    The collection of items to collate
     * @return  {Object}            A hash in the format `field => [options]`
     * @private
     */
    function collate(data) {
        return data.reduce(function(options, row) {
            Object.keys(row).forEach(function(fieldName) {
                if (!(fieldName in options)) {
                    options[fieldName] = data.pluck(fieldName).unique();
                }
            });
            
            return options;
        }, {});
    }

    /**
     * @private
     */
    function defaultSortFunction(a, b) {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }

    return facets;
}));