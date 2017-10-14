# parsergenerator
LR(1) Parser Generator written in TypeScript

## install
requirements: git, npm
```
$ git clone https://github.com/Tatamo/parsergenerator.git
$ cd parsergenerator
$ npm install
$ npm run build
```
## usage
```
$ node ./dist/test.js < ./grammar
```

TODO: easy to use

edit [grammar](/grammar) and run the following code:
```TypeScript
import {grammar_parser, ParserGenerator} from "src/"; // edit path properly if needed
import {readFileSync} from "fs";

const grammar = grammar_parser.parse(readFileSync("./grammar", "utf8") as string);
const parser = new ParserGenerator(grammar).getParser();
const input = readFileSync("/dev/stdin", "utf8") as string;
console.log(parser.parse(input));
```
this program parses input (from stdin) and shows its AST.

[grammar](/grammar) is grammar file and it expresses the grammar of itself.
