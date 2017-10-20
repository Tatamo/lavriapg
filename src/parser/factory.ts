import {Language} from "../def/language";
import {ParsingTable} from "../def/parsingtable";
import {Lexer} from "../lexer/lexer";
import {Parser, ParserCallback} from "./parser";

export class ParserFactory {
	public static create(language: Language, parsing_table: ParsingTable, default_fallback?: ParserCallback): Parser {
		const lexer = new Lexer(language.lex);
		return new Parser(lexer, language.syntax, parsing_table, default_fallback);
	}
}
