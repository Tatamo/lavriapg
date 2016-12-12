declare function require(x: string): any;

import * as Lexer from "lexer"
import {ParserGenerator} from "./parsergenerator";
import {def} from "./syntaxdef";

import * as Immutable from "immutable";

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

/*
var seq = Immutable.Seq<number>([1,2,3,4]);
let flg = true;
seq = Immutable.Seq<number>(seq.sort((front, behind)=>{
	console.log("front:",front,", benind:",behind);
	if(front == 2 && flg) {
		flg = false;
		return 1;
	}
	return 0;
}));
console.log(seq);
*/

new ParserGenerator.ParserGenerator("S", def, Lexer.def);
