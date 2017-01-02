import {Token, SYMBOL_EOF} from "./token";
import {LexDefinitions, SyntaxDefinitions, GrammarDefinition} from "./grammar";
import {ParsingOperation, ParsingTable} from "./parsingtable";
import {ParserGenerator} from "./parsergenerator";
import {grammar_grammar, grammar_parser} from "./ruleparser";

export class PreCompiler{
	constructor(){
	}
	// 構文ファイルを受け取り、それを処理できるパーサを構築するためのソースコードを返す
	public exec(input: string):string{
		let grammar:GrammarDefinition = grammar_parser.parse(input);
		let parsing_table = new ParserGenerator(grammar).getParsingTable();
		let result = "";

		result += 'import {Token, SYMBOL_EOF} from "./token";\n'
		result += 'import {GrammarDefinition} from "./grammar";\n';
		result += 'import {ParsingOperation, ParsingTable} from "./parsingtable";\n';
		result += 'import {Parser} from "./parser";\n';
		result += 'import {ParserFactory} from "./factory";\n\n';
		result += "export const grammar: GrammarDefinition = {\n";
		result += "\t" + "lex: [\n";
		for(let i=0; i<grammar.lex.length; i++){
			let token = grammar.lex[i].token;
			let pattern = grammar.lex[i].pattern;
			result += "\t\t" + "{token: " + (token===null?"null":('"'+<string>token)+'"') + ", pattern: ";
			if(pattern instanceof RegExp){
				result += pattern.toString();
			}
			else{
				result += '"' + pattern + '"';
			}
			result += "}";
			if(i != grammar.lex.length-1) result += ",";
			result += "\n";
		}
		result += "\t" + "],\n";
		result += "\t" + "syntax: [\n";
		for(let i=0; i<grammar.syntax.length; i++){
			let ltoken = grammar.syntax[i].ltoken;
			let pattern = grammar.syntax[i].pattern;
			result += "\t\t" + "{\n";
			result += "\t\t\t" + 'ltoken: "' + <string>ltoken + '",\n';
			result += "\t\t\t" + "pattern: [";
			for(let ii=0; ii<pattern.length; ii++){
				result += '"' + <string>pattern[ii] + '"';
				if(ii != pattern.length-1) result += ", ";
			}
			result += "]\n";
			result += "\t\t" + "}";
			if(i != grammar.syntax.length-1) result += ",";
			result += "\n";
		}
		result += "\t" + "],\n";
		result += "\t" + 'start_symbol: "' + <string>grammar.start_symbol + '"\n';
		result += "};\n\n";
		result += "export const parsing_table:ParsingTable = [\n";
		for(let i=0; i<parsing_table.length; i++){
			result += "\t" + "new Map<Token, ParsingOperation>([\n";
			parsing_table[i].forEach((value, key)=>{
				result += "\t\t" + "[" + (key==SYMBOL_EOF?"SYMBOL_EOF":('"'+<string>key)+'"') + ", " + JSON.stringify(value) + "],\n";
			});
			result = result.slice(0, -2);
			result += " ]),\n";
		}
		result = result.slice(0, -2);
		result += "\n];\n\n";
		result += "export const parser:Parser = ParserFactory.create(grammar, parsing_table);\n";
		return result;
	}
}
