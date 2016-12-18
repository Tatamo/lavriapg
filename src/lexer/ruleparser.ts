import {Token, SYMBOL_EOF, LexDefinitionSection, LexDefinitions, TokenList, Lexer} from "./lexer";
import {SyntaxDefinitions} from "../syntaxdef";
import {ParserGenerator} from "../parsergenerator";
import {Parser} from "../parser";
import {ASTNode} from "../ast";

export var lexerlexdef:LexDefinitions = [
        {token:"LABEL", pattern:/^[A-Z][A-Z0-9_]*/m},
        {token:"REGEXP", pattern:/\/.*\/[gimuy]*/},
        {token:"STRING", pattern:/".*"/},
        {token:"ENDLINE", pattern:/[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]*(\r\n|\r|\n)+/},
        {token:"WHITESPACE", pattern:/[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
        {token:"INVALID", pattern:/./}
];

export var lexersyntax: SyntaxDefinitions = [
	{
		ltoken: "LEXRULE",
		pattern: ["SECTION", "LEXRULE"]
	},
	{
		ltoken: "LEXRULE",
		pattern: ["SECTION"]
	},
	{
		ltoken: "SECTION",
		pattern: ["LABEL", "WHITESPACE", "DEFINITION", "ENDLINE"]
	},
	{
		ltoken: "DEFINITION",
		pattern: ["STRING"]
	},
	{
		ltoken: "DEFINITION",
		pattern: ["REGEXP"]
	}
];

export var lexrule_lexer = new Lexer(lexerlexdef);
export var lexrule_parser = new ParserGenerator("LEXRULE", lexersyntax, lexerlexdef).getParser();

export var AST2LexDef = (ast: ASTNode)=>{
	let result:LexDefinitions = [];
	let read_lexrule = (node:ASTNode) =>{
		if(node.type != "LEXRULE" || !(node.children.length == 1 || node.children.length == 2)){
			return -1;
		}
		let new_item:LexDefinitionSection = {token:null, pattern:null};

		let sec = node.children[0];
		if(sec.type != "SECTION" || sec.children.length != 4) return -1;
		let label = sec.children[0];
		if(label.type != "LABEL" || label.value == null) return -1;

		new_item.token = label.value;

		let def_wrapper = sec.children[2];
		if(def_wrapper.type != "DEFINITION" || def_wrapper.children.length != 1) return -1;
		let def = def_wrapper.children[0];
		if(def.type == "STRING" && def.value != null){
			new_item.pattern = def.value.slice(1,-1);
		}
		else if(def.type == "REGEXP" && def.value != null){
			let tmp = def.value.split("/");
			let flags = tmp[tmp.length-1];
			let p = def.value.slice(1, -1-flags.length);
			new_item.pattern = new RegExp(p, flags);
		}
		else return -1;
		result.push(new_item);
		if(node.children.length == 1){
			return 1;
		}
		else{
			return read_lexrule(node.children[1]);
		}
	};
	if(read_lexrule(ast) == -1){
		console.log("convert error occured");
	}
	return result;
};
