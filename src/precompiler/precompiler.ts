import {Language} from "../def/language";
import {SYMBOL_EOF} from "../def/token";
import {ParserGenerator} from "../parsergenerator/parsergenerator";
import {language_parser} from "./ruleparser";


export class PreCompiler {
	constructor(private import_path: string = "@tatamo/parsergenerator") {
		if (import_path[import_path.length - 1] != "/") this.import_path += "/";
	}
	// 構文ファイルを受け取り、それを処理できるパーサを構築するためのソースコードを返す
	public exec(input: string): string {
		const grammar: Language = language_parser.parse(input);
		const parsing_table = new ParserGenerator(grammar).getParsingTable();
		let result = "";

		result += 'import {Token, SYMBOL_EOF} from "' + this.import_path + 'def/token";\n';
		result += 'import {Language} from "' + this.import_path + 'def/language";\n';
		result += 'import {ParsingOperation, ParsingTable} from "' + this.import_path + 'def/parsingtable";\n';
		result += 'import {Parser} from "' + this.import_path + 'parser/parser";\n';
		result += 'import {ParserFactory} from "' + this.import_path + 'parser/factory";\n\n';

		/*
		result += 'import {Token, SYMBOL_EOF, Language, ParsingOperation, ParsingTable, Parser, ParserFactory} from "' + this.import_path +'";\n\n';
	   */

		result += "export const grammar: Language = {\n";
		result += "\t" + "lex: [\n";
		for (let i = 0; i < grammar.lex.length; i++) {
			const token = grammar.lex[i].token;
			const pattern = grammar.lex[i].pattern;
			result += "\t\t" + "{token: " + (token === null ? "null" : ('"' + (token as string)) + '"') + ", pattern: ";
			if (pattern instanceof RegExp) {
				result += pattern.toString();
			}
			else {
				result += '"' + pattern + '"';
			}
			result += "}";
			if (i != grammar.lex.length - 1) result += ",";
			result += "\n";
		}
		result += "\t" + "],\n";
		result += "\t" + "syntax: [\n";
		for (let i = 0; i < grammar.syntax.length; i++) {
			const ltoken = grammar.syntax[i].ltoken;
			const pattern = grammar.syntax[i].pattern;
			result += "\t\t" + "{\n";
			result += "\t\t\t" + 'ltoken: "' + (ltoken as string) + '",\n';
			result += "\t\t\t" + "pattern: [";
			for (let ii = 0; ii < pattern.length; ii++) {
				result += '"' + (pattern[ii] as string) + '"';
				if (ii != pattern.length - 1) result += ", ";
			}
			result += "]\n";
			result += "\t\t" + "}";
			if (i != grammar.syntax.length - 1) result += ",";
			result += "\n";
		}
		result += "\t" + "],\n";
		result += "\t" + 'start_symbol: "' + (grammar.start_symbol as string) + '"\n';
		result += "};\n\n";
		result += "export const parsing_table:ParsingTable = [\n";
		for (let i = 0; i < parsing_table.length; i++) {
			result += "\t" + "new Map<Token, ParsingOperation>([\n";
			parsing_table[i].forEach((value, key) => {
				result += "\t\t" + "[" + (key == SYMBOL_EOF ? "SYMBOL_EOF" : ('"' + (key as string)) + '"') + ", " + JSON.stringify(value) + "],\n";
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
