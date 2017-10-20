import {Language} from "../def/grammar";
import {ParsingTable} from "../def/parsingtable";
import {Lexer} from "../lexer/lexer";
import {Parser, ParserCallback} from "./parser";

export class ParserFactory {
	public static create(grammar: Language, parsing_table: ParsingTable, default_fallback?: ParserCallback): Parser {
		const lexer = new Lexer(grammar.lex);
		return new Parser(lexer, grammar.syntax, parsing_table, default_fallback);
	}
}
