import {LexDefinitions, SyntaxDefinitions, GrammarDefinition} from "./grammar";
import {ParserGenerator} from "./parsergenerator";
import {Parser, ParserCallbackArg} from "./parser";

var lex:LexDefinitions = [
	{token:"EXCLAMATION", pattern:"!"},
	{token:"VBAR", pattern:"|"},
	{token:"COLON", pattern:":"},
	{token:"SEMICOLON", pattern:";"},
	{token:"LABEL", pattern:/[a-zA-Z_][a-zA-Z0-9_]*/},
	{token:"REGEXP", pattern:/\/.*\/[gimuy]*/},
	{token:"STRING", pattern:/".*"/},
	{token:"STRING", pattern:/'.*'/},
	{token:null, pattern:/(\r\n|\r|\n)+/},
	{token:null, pattern:/[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
	{token:"INVALID", pattern:/./},
];

var syntax: SyntaxDefinitions = [
	{
		ltoken: "GRAMMAR",
		pattern: ["LEX", "SYNTAX"]
	},
	{
		ltoken: "LEX",
		pattern: ["LEX",  "LEXSECT"]
	},
	{
		ltoken: "LEX",
		pattern: ["LEXSECT"]
	},
	{
		ltoken: "LEXSECT",
		pattern: ["LABEL", "LEXDEF"]
	},
	{
		ltoken: "LEXSECT",
		pattern: ["EXCLAMATION", "LEXDEF"]
	},
	{
		ltoken: "LEXSECT",
		pattern: ["EXCLAMATION", "LABEL", "LEXDEF"]
	},
	{
		ltoken: "LEXDEF",
		pattern: ["STRING"]
	},
	{
		ltoken: "LEXDEF",
		pattern: ["REGEXP"]
	},
	{
		ltoken: "SYNTAX",
		pattern: ["SYNTAX", "SECT"]
	},
	{
		ltoken: "SYNTAX",
		pattern: ["SECT"]
	},
	{
		ltoken: "SECT",
		pattern: ["LABEL", "COLON", "DEF", "SEMICOLON"]
	},
	{
		ltoken: "DEF",
		pattern: ["PATTERN", "VBAR", "DEF"]
	},
	{
		ltoken: "DEF",
		pattern: ["PATTERN"]
	},
	{
		ltoken: "PATTERN",
		pattern: ["LABEL", "PATTERN"]
	},
	{
		ltoken: "PATTERN",
		pattern: ["LABEL"]
	},
];

export var grammar:GrammarDefinition = {lex: lex, syntax:syntax};

// ASTからGrramaDefinitionを構築
export var constructGrammar = (arg:ParserCallbackArg)=>{
	let token = arg.token;
	if(arg.terminal == true){
		let value = arg.value;
		switch(token){
			case "LABEL":
				return value;
			case "REGEXP":
				let tmp = value.split("/");
				let flags = tmp[tmp.length-1];
				let p = value.slice(1, -1-flags.length);
				return new RegExp(p, flags);
			case "STRING":
				return value.slice(1,-1);
		}
	}
	else {
		let children = arg.children;
		let pattern = arg.pattern;
		switch(token){
			case "GRAMMAR":
				return {lex: children[0], syntax: children[1]};
			case "LEXDEF":
				return children[0];
			case "LEXSECT":
				if(pattern[0] == "EXCLAMATION"){
					if(pattern[1] == "LABEL") return {token:null, pattern:children[2]};
					else return {token:null, pattern:children[1]};
				}
				else return {token:children[0], pattern: children[1]};
			case "LEX":
				if(pattern.length == 2) return children[0].concat([children[1]]);
				else return [children[0]];
			case "PATTERN":
				if(pattern.length == 2) return [children[0]].concat(children[1]);
				else return [children[0]];
			case "DEF":
				if(pattern.length == 3) return [children[0]].concat(children[2]);
				else return [children[0]];
			case "SECT":
				let result = [];
				children[2].forEach((pattern)=>{
					result.push({ltoken: children[0], pattern: pattern});
				});
				return result;
			case "SYNTAX":
				if(pattern.length == 2) return children[0].concat(children[1]);
				else return children[0];
		}
		return null;
	}
};

export var grammar_parser:Parser = new ParserGenerator("GRAMMAR", grammar).getParser(constructGrammar);
