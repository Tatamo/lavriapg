# parsergenerator
LR(1) Parser Generator written in TypeScript

## install
requirement: npm
```
$ mkdir pg
$ cd pg
$ npm init
$ npm install @tatamo/parsergenerator --save
```

### sample
```
$ echo 1+1 | node ./node_modules/@tatamo/parsergenerator/dist/sample.js
```

## usage
edit [grammar](/grammar) and run the following code:
```TypeScript
// TypeScript
import {grammar_parser, ParserGenerator} from "@tatamo/parsergenerator";
import {readFileSync} from "fs";

const input = readFileSync("/dev/stdin", "utf8") as string;
const grammar = grammar_parser.parse(readFileSync("./node_modules/@tatamo/parsergenerator/grammar", "utf8") as string); // set the grammar file path
const parser = new ParserGenerator(grammar).getParser();
console.log(parser.parse(input));
```

```JavaScript
// JavaScript(CommonJS)
const pg = require("@tatamo/parsergenerator");
const fs = require("fs");
const input = fs.readFileSync("/dev/stdin", "utf8");
const grammar = pg.grammar_parser.parse(fs.readFileSync("./node_modules/@tatamo/parsergenerator/grammar", "utf8")); // set the grammar file path
const parser = new pg.ParserGenerator(grammar).getParser();
console.log(parser.parse(input));
```
this program parses input (from stdin) that has the grammar rule defined by [grammar](/grammar) and shows its AST.

[grammar](/grammar) is grammar file and it expresses the grammar of itself.
