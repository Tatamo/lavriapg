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
// JavaScript(CommonJS)
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

this program parses input (from stdin) that has the lex and grammar rules defined by [language](/language) and shows its AST.
```TypeScript
// TypeScript
const input = readFileSync("./node_modules/lavriapg/language", "utf8") as string;
const language = language_parser.parse(input); // set the language file path

const replacer = (key: string, value: any) => {
  if (typeof value === "function") return value.toString();
  if (value instanceof RegExp) return value.toString();
  return value;
};

console.log(JSON.stringify(language, replacer, 2));

const parser = new ParserGenerator(language).getParser();
console.log(JSON.stringify(parser.parse(input), replacer, 2));
```

[language](/language) is language file and it expresses itself.
