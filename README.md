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
edit [language](/language) and run the following code:
```TypeScript
// TypeScript
import {language_parser, ParserGenerator} from "@tatamo/parsergenerator";
import {readFileSync} from "fs";

const input = readFileSync("/dev/stdin", "utf8") as string;
const grammar = language_parser.parse(readFileSync("./node_modules/@tatamo/parsergenerator/language", "utf8") as string); // set the grammar file path
const parser = new ParserGenerator(grammar).getParser();
console.log(parser.parse(input));
```

```JavaScript
// JavaScript(CommonJS)
const pg = require("@tatamo/parsergenerator");
const fs = require("fs");
const input = fs.readFileSync("/dev/stdin", "utf8");
const grammar = pg.grammar_parser.parse(fs.readFileSync("./node_modules/@tatamo/parsergenerator/language", "utf8")); // set the grammar file path
const parser = new pg.ParserGenerator(grammar).getParser();
console.log(parser.parse(input));
```
this program parses input (from stdin) that has the lex and grammar rules defined by [language](/language) and shows its AST.

[language](/language) is language file and it expresses itself.
