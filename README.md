# LavRia
TypeScript LALR(1) Parser Generator

## install
requirement: npm
```
$ mkdir pg
$ cd pg
$ npm init
$ npm install lavriapg --save
```

### sample
```
$ echo 1+1 | node ./node_modules/lavriapg/dist/sample.js
```

## usage
edit [language](/language) and run the following code:
```TypeScript
// TypeScript
import {language_parser, ParserGenerator} from "lavriapg";
import {readFileSync} from "fs";

const input = readFileSync("/dev/stdin", "utf8") as string;
const language = language_parser.parse(readFileSync("./node_modules/lavriapg/language", "utf8") as string); // set the language file path
const parser = new ParserGenerator(language).getParser();
console.log(parser.parse(input));
```

```JavaScript
// JavaScript(CommonJS)
const pg = require("lavriapg");
const fs = require("fs");
const input = fs.readFileSync("/dev/stdin", "utf8");
const language = pg.language_parser.parse(fs.readFileSync("./node_modules/lavriapg/language", "utf8")); // set the language file path
const parser = new pg.ParserGenerator(language).getParser();
console.log(parser.parse(input));
```
this program parses input (from stdin) that has the lex and grammar rules defined by [language](/language) and shows its AST.

[language](/language) is language file and it expresses itself.
