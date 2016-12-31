import {Token, SYMBOL_EOF, LexDefinitionSection, LexDefinitions, TokenList, SyntaxDefinitions, SyntaxDefinitionSection} from "./definition";
import {Lexer} from "./lexer";
import {ParserGenerator} from "./parsergenerator";
import {Parser} from "./parser";
import {ASTNode} from "./ast";

export var def:LexDefinitions = [
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

export var syntax: SyntaxDefinitions = [
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

export var bnflexdef:LexDefinitions = [
        {token:"RULENAME", pattern:/[a-zA-Z][a-zA-Z0-9_]*/},
        {token:"LBRACKET", pattern:"<"},
        {token:"RBRACKET", pattern:">"},
        {token:"PLUS", pattern:"+"},
        {token:"MINUS", pattern:"-"},
        {token:"IDA", pattern:"::="},
        {token:"OR", pattern:"|"},
        {token:"LINE_END", pattern:/[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]*(\r\n|\r|\n)+/},
        //{token:"EOL", pattern:/(\r\n|\r|\n)/},
        {token:"WHITESPACE", pattern:/[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
        {token:"DQUOTEDSTRING", pattern:/"(\"|[^"])*?"/},
        {token:"SQUOTEDSTRING", pattern:/'(\'|[^'])*?'/},
        {token:"INVALID", pattern:/./}
];


export var bnfsyntax: SyntaxDefinitions = [
	{
		ltoken: "SYNTAX",
		pattern: ["RULE"]
	},
	{
		ltoken: "SYNTAX",
		pattern: ["RULE", "SYNTAX"]
	},
	{
		ltoken: "RULE",
		pattern: ["OPT_WHITESPACE", "LBRACKET", "RULENAME", "RBRACKET", "OPT_WHITESPACE", "IDA", "OPT_WHITESPACE", "EXP", "LINE_END"]
	},
	{
		ltoken: "OPT_WHITESPACE",
		pattern: ["WHITESPACE"]
	},
	{
		ltoken: "OPT_WHITESPACE",
		pattern: []
	},
	{
		ltoken: "EXP",
		pattern: ["LIST"]
	},
	{
		ltoken: "EXP",
		pattern: ["LIST", "OPT_WHITESPACE", "OR", "OPT_WHITESPACE", "EXP"]
	},
	{
		ltoken: "LIST",
		pattern: ["TERM"]
	},
	{
		ltoken: "LIST",
		pattern: ["LIST", "OPT_WHITESPACE", "TERM"]
	},
	{
		ltoken: "TERM",
		pattern: ["LITERAL"]
	},
	{
		ltoken: "TERM",
		pattern: ["LBRACKET", "RULENAME", "RBRACKET"]
	},
	{
		ltoken: "LITERAL",
		pattern: ["DQUOTEDSTRING"]
	},
	{
		ltoken: "LITERAL",
		pattern: ["SQUOTEDSTRING"]
	},
];

export var bnf_lexer = new Lexer(bnflexdef);
export var bnf_parser = new ParserGenerator("SYNTAX", bnfsyntax, bnflexdef).getParser();


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


export var AST2SyntaxDef = (ast: ASTNode)=>{
	let isValidNode = (node: ASTNode, type:string, length:Array<number>):boolean =>{
		if(node.type != type) return false;
		let flg_hit = false;
		length.forEach((len)=>{
			if(node.children.length == len){
				flg_hit = true;
			}
		});
		return flg_hit;
	};
	let result:SyntaxDefinitions = [];
	let read_syntax = (node:ASTNode) =>{
		if(!isValidNode(node, "SYNTAX", [1,2])) return -1;
		//let new_item:SyntaxDefinitionSection = {ltoken:null, pattern:null};

		let rule = node.children[0];
		if(!isValidNode(rule, "RULE", [9])) return -1;
		let label = rule.children[2];
		if(!isValidNode(label, "RULENAME", [0])) return -1;
		
		let ltoken = label.value;

		let exp = rule.children[7];

		let pattern = [];
		if(!isValidNode(exp, "EXP", [1, 5])) return -1;
		let read_expression = (exp:ASTNode)=>{
			let pattern_sec = [];
			let list = exp.children[0];
			if(!isValidNode(list, "LIST", [1, 3])) return -1;
			while(true){
				let term = list.children.length == 1?list.children[0]:list.children[3];
				if(!isValidNode(term, "TERM", [1, 3])) return -1;
				if(term.children.length == 1){
					let literal = term.children[0];
					if(!isValidNode(literal, "LITERAL", [1])) return -1;
					let str = literal.children[0];
					if(!isValidNode(str, "DQUOTEDSTRING", [0]) && !isValidNode(str, "SQUOTEDSTRING", [0])) return -1;
					pattern_sec.push(str.value.slice(1,-1));
				}
				else if(term.children.length == 3){
					let rulename = term.children[1];
					if(!isValidNode(rulename, "RULENAME", [0])) return -1;
					pattern_sec.push(rulename.value);
				}
				if(list.children.length == 3){
					list = list.children[0];
				}
				else{
					break;
				}
			}
			pattern.push(pattern_sec);
			return 1;
		};
		while(exp.children.length == 5){
			if(read_expression(exp) != 1) return -1;
			exp = exp.children[4];
		}
		if(read_expression(exp) != 1) return -1;
		result.push({ltoken: ltoken, pattern:pattern});

		if(node.children.length == 1){
			return 1;
		}
		else{
			return read_syntax(node.children[1]);
		}
	};
	if(read_syntax(ast) == -1){
		console.log("convert error occured");
	}
	return result;
};
