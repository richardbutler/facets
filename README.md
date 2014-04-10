# facets

Chainable sorting and filtering for JavaScript collections.

## Support

Facets makes no apologies for requiring ECMAScript 5 support. For legacy browser support, you'll need to enlist the help of something like [es5shim](https://github.com/es-shims/es5-shim).

## Installation

Via NPM:

```npm install facets```

Via Bower:

```bower install facets```

## Docs

To follow. For now, see the [tests](test/facets.spec.js) and the [annotated source](facets.js).

## Example

```js
var facets = require('facets');

var john = { name: 'John', gender: 'male', age: 44 },
	dave = { name: 'Dave', gender: 'male', age: 67 },
	mandy = { name: 'Mandy', gender: 'female', age: 71 };

var retiredMales = facets()
    .data([john, dave, mandy]);

// Useful for displaying counts in facet lists ahead of time, e.g. "Male (2)"
console.log(retiredMales.field('gender').option('male').results()); // => [john, dave]

retiredMales.field('gender')
    .filters(facets.filter.equals('male'));

retiredMales.field('age')
    .filters(facets.filter.greaterThan(65));

// Executes a filter
console.log(retiredMales.exec().data()); // => [dave]
```
