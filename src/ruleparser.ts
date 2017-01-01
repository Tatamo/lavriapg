import {LexDefinitions, SyntaxDefinitions, GrammarDefinition, Grammar} from "./grammar";
import {Token, SYMBOL_EOF} from "./token";
import {ParsingOperation, ParsingTable} from "./parsingtable";
import {ParserGenerator} from "./parsergenerator";
import {Parser, ParserCallbackArg} from "./parser";
import {ParserFactory} from "./factory";

var lex: LexDefinitions = [
	{token:"EXCLAMATION", pattern:"!"},
	{token:"VBAR", pattern:"|"},
	{token:"DOLLAR", pattern:"$"},
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
		pattern: ["STARTSECT"]
	},
	{
		ltoken: "SECT",
		pattern: ["NORMALSECT"]
	},
	{
		ltoken: "STARTSECT",
		pattern: ["DOLLAR", "LABEL", "COLON", "DEF", "SEMICOLON"]
	},
	{
		ltoken: "NORMALSECT",
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

export var grammar:GrammarDefinition = {lex: lex, syntax: syntax, start_symbol: "GRAMMAR"};

// ASTからGrramaDefinitionを構築
export var constructGrammar = (()=>{
	let start_symbol = null;
	return (arg:ParserCallbackArg)=>{
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
					if(start_symbol === null){
						// 開始記号の指定がない場合、最初の規則に設定
						start_symbol = children[1][0].ltoken;
					}
					return new Grammar(children[0], children[1], start_symbol);
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
					return children[0];
				case "STARTSECT":
					// 開始記号がまだ指定されていない場合はこれを開始記号とする
					if(start_symbol === null) {
						start_symbol = children[1];
					}
					let result_s = [];
					children[3].forEach((pattern)=>{
						result_s.push({ltoken: children[1], pattern: pattern});
					});
					return result_s;
				case "NORMALSECT":
					let result_n = [];
					children[2].forEach((pattern)=>{
						result_n.push({ltoken: children[0], pattern: pattern});
					});
					return result_n;
				case "SYNTAX":
					if(pattern.length == 2) return children[0].concat(children[1]);
					else return children[0];
			}
			return null;
		}
	};
})();


export var grammar_parsing_table:ParsingTable = [
new Map<Token,ParsingOperation>([
	['GRAMMAR', { type: 'goto', to: 1 }],
	['LEX', { type: 'goto', to: 2 }],
	['LEXSECT', { type: 'goto', to: 3 }],
	['LABEL', { type: 'shift', to: 4 }],
	['EXCLAMATION', { type: 'shift', to: 5 }] ]),
new Map<Token,ParsingOperation>([
	[ SYMBOL_EOF, { type: 'accept' }] ]),
new Map<Token,ParsingOperation>([
	['SYNTAX', { type: 'goto', to: 6 }],
	['LEXSECT', { type: 'goto', to: 7 }],
	['SECT', { type: 'goto', to: 8 }],
	['LABEL', { type: 'shift', to: 9 }],
	['EXCLAMATION', { type: 'shift', to: 5 }],
	['STARTSECT', { type: 'goto', to: 10 }],
	['NORMALSECT', { type: 'goto', to: 11 }],
	['DOLLAR', { type: 'shift', to: 12 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR', { type: 'reduce', syntax: 3 }],
	['LABEL', { type: 'reduce', syntax: 3 }],
	['EXCLAMATION', { type: 'reduce', syntax: 3 }] ]),
new Map<Token,ParsingOperation>([
	['LEXDEF', { type: 'goto', to: 13 }],
	['STRING', { type: 'shift', to: 14 }],
	['REGEXP', { type: 'shift', to: 15 }] ]),
new Map<Token,ParsingOperation>([
	['LEXDEF', { type: 'goto', to: 16 }],
	['LABEL', { type: 'shift', to: 17 }],
	['STRING', { type: 'shift', to: 14 }],
	['REGEXP', { type: 'shift', to: 15 }] ]),
new Map<Token,ParsingOperation>([
	['SECT', { type: 'goto', to: 18 }],
	['STARTSECT', { type: 'goto', to: 10 }],
	['NORMALSECT', { type: 'goto', to: 11 }],
	['DOLLAR', { type: 'shift', to: 12 }],
	['LABEL', { type: 'shift', to: 19 }],
	[SYMBOL_EOF, { type: 'reduce', syntax: 1 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR', { type: 'reduce', syntax: 2 }],
	['LABEL', { type: 'reduce', syntax: 2 }],
	['EXCLAMATION', { type: 'reduce', syntax: 2 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF, { type: 'reduce', syntax: 10 }],
	['DOLLAR', { type: 'reduce', syntax: 10 }],
	['LABEL', { type: 'reduce', syntax: 10 }] ]),
new Map<Token,ParsingOperation>([
	['LEXDEF', { type: 'goto', to: 13 }],
	['COLON', { type: 'shift', to: 20 }],
	['STRING', { type: 'shift', to: 14 }],
	['REGEXP', { type: 'shift', to: 15 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF, { type: 'reduce', syntax: 11 }],
	['DOLLAR', { type: 'reduce', syntax: 11 }],
	['LABEL', { type: 'reduce', syntax: 11 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF, { type: 'reduce', syntax: 12 }],
	['DOLLAR', { type: 'reduce', syntax: 12 }],
	['LABEL', { type: 'reduce', syntax: 12 }] ]),
new Map<Token,ParsingOperation>([
	[ 'LABEL', { type: 'shift', to: 21 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR', { type: 'reduce', syntax: 4 }],
	['LABEL', { type: 'reduce', syntax: 4 }],
	['EXCLAMATION', { type: 'reduce', syntax: 4 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR', { type: 'reduce', syntax: 7 }],
	['LABEL', { type: 'reduce', syntax: 7 }],
	['EXCLAMATION', { type: 'reduce', syntax: 7 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR', { type: 'reduce', syntax: 8 }],
	['LABEL', { type: 'reduce', syntax: 8 }],
	['EXCLAMATION', { type: 'reduce', syntax: 8 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR', { type: 'reduce', syntax: 5 }],
	['LABEL', { type: 'reduce', syntax: 5 }],
	['EXCLAMATION', { type: 'reduce', syntax: 5 }] ]),
new Map<Token,ParsingOperation>([
	['LEXDEF', { type: 'goto', to: 22 }],
	['STRING', { type: 'shift', to: 14 }],
	['REGEXP', { type: 'shift', to: 15 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF, { type: 'reduce', syntax: 9 }],
	['DOLLAR', { type: 'reduce', syntax: 9 }],
	['LABEL', { type: 'reduce', syntax: 9 }] ]),
new Map<Token,ParsingOperation>([
	[ 'COLON', { type: 'shift', to: 20 }] ]),
new Map<Token,ParsingOperation>([
	['DEF', { type: 'goto', to: 23 }],
	['PATTERN', { type: 'goto', to: 24 }],
	['LABEL', { type: 'shift', to: 25 }] ]),
new Map<Token,ParsingOperation>([
	[ 'COLON', { type: 'shift', to: 26 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR', { type: 'reduce', syntax: 6 }],
	['LABEL', { type: 'reduce', syntax: 6 }],
	['EXCLAMATION', { type: 'reduce', syntax: 6 }] ]),
new Map<Token,ParsingOperation>([
	[ 'SEMICOLON', { type: 'shift', to: 27 }] ]),
new Map<Token,ParsingOperation>([
	['VBAR', { type: 'shift', to: 28 }],
	['SEMICOLON', { type: 'reduce', syntax: 16 }] ]),
new Map<Token,ParsingOperation>([
	['PATTERN', { type: 'goto', to: 29 }],
	['LABEL', { type: 'shift', to: 25 }],
	['VBAR', { type: 'reduce', syntax: 18 }],
	['SEMICOLON', { type: 'reduce', syntax: 18 }] ]),
new Map<Token,ParsingOperation>([
	['DEF', { type: 'goto', to: 30 }],
	['PATTERN', { type: 'goto', to: 24 }],
	['LABEL', { type: 'shift', to: 25 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF, { type: 'reduce', syntax: 14 }],
	['DOLLAR', { type: 'reduce', syntax: 14 }],
	['LABEL', { type: 'reduce', syntax: 14 }] ]),
new Map<Token,ParsingOperation>([
	['DEF', { type: 'goto', to: 31 }],
	['PATTERN', { type: 'goto', to: 24 }],
	['LABEL', { type: 'shift', to: 25 }] ]),
new Map<Token,ParsingOperation>([
	['VBAR', { type: 'reduce', syntax: 17 }],
	['SEMICOLON', { type: 'reduce', syntax: 17 }] ]),
new Map<Token,ParsingOperation>([
	[ 'SEMICOLON', { type: 'shift', to: 32 }] ]),
new Map<Token,ParsingOperation>([
	[ 'SEMICOLON', { type: 'reduce', syntax: 15 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF, { type: 'reduce', syntax: 13 }],
	['DOLLAR', { type: 'reduce', syntax: 13 }],
	['LABEL', { type: 'reduce', syntax: 13 }] ])
];

// 予めParsingTableを用意しておくことで高速化
//export var grammar_parser:Parser = new ParserGenerator(grammar).getParser(constructGrammar);
export var grammar_parser:Parser = ParserFactory.create(new Grammar(lex, syntax, "GRAMMAR"), grammar_parsing_table, constructGrammar);

