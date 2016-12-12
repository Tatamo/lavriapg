declare function require(x: string): any;

import * as Lexer from "lexer"
import {ParserGenerator} from "./parsergenerator";
import {def} from "./syntaxdef";

import * as Immutable from "immutable";

/*
var map1 = Immutable.Map<string|symbol, number>({a:1, b:1, c:1});
var map2 = Immutable.Map<string|symbol, number>({a:1, b:1, c:1});

var s = Symbol("s");
var m = Symbol("m");
map1 = map1.set(s,1);
map2 = map2.set(m,1);

console.log(map1 !== map2);
console.log(Object.is(map1, map2) === false);
console.log(Immutable.is(map1, map2) === true);
console.log(map1,map2);
*/
/*
var set1 = Immutable.OrderedSet<number>([1, 2]);
var set2 = Immutable.OrderedSet<number>([1, 2]);
set1 = set1.add(2);
console.log(Immutable.is(set1, set2));
*/
/*
var lst = Immutable.List<number>([1,2,3,4,5]);
lst.forEach((v)=>{
	if(v == 3) return;
	console.log(v);
});
let i = lst.findKey((v)=>{return v == 3});
console.log(i);
console.log(lst.get(i+1));
console.log(lst.slice(i));
*/

new ParserGenerator.ParserGenerator("EXP", def, Lexer.def);
