# LavRia
TypeScript LALR(1) Parser Generator

## Installation
```
$ mkdir pg
$ cd pg
$ npm init
$ npm install lavriapg --save
```

### Examples
```
$ echo 1+1 | node ./node_modules/lavriapg/dist/sample.js
```

[language](/language) and [json_language](/json_language) are sample language definitions.
`language_parser` parses the language definition file to generate a parser.

Run the following code to see how it works:
```TypeScript
// TypeScript
import {language_parser, ParserGenerator} from "lavriapg";
import {readFileSync} from "fs";

const input = `{
  "foo": 123.45,
  "bar": [ true, false, null ],
  "baz": {
    "nested": "hello"
  },
  "x": "/1{}"
}`;

const language = language_parser.parse(readFileSync("./node_modules/lavriapg/json_language", "utf8") as string);
const parser = new ParserGenerator(language).getParser();
console.log(JSON.stringify(parser.parse(input), undefined, 2));
```

```JavaScript
// JavaScript (CommonJS)
const pg = require("lavriapg");
const fs = require("fs");
const input = `{
  "foo": 123.45,
  "bar": [ true, false, null ],
  "baz": {
    "nested": "hello"
  },
  "x": "/1{}"
}`;
const language = pg.language_parser.parse(fs.readFileSync("./node_modules/lavriapg/json_language", "utf8"));
const parser = new pg.ParserGenerator(language).getParser();
console.log(JSON.stringify(parser.parse(input), undefined, 2));
```

## Usage
[language](/language) is its own language definition:
```TypeScript
// TypeScript
const input = readFileSync("./node_modules/lavriapg/language", "utf8") as string;
const language = language_parser.parse(input);

const replacer = (key: string, value: any) => {
  if (typeof value === "function") return value.toString();
  if (value instanceof RegExp) return value.toString();
  return value;
};

console.log(JSON.stringify(language, replacer, 2));

const parser = new ParserGenerator(language).getParser();
console.log(JSON.stringify(parser.parse(input), replacer, 2));
```

`language_parser` parses [language](/language) to generate a language definition.
The parser generated from that definition behaves just like `language_parser`.
