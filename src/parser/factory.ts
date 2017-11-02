import {Language} from "../def/language";
import {ParsingTable} from "../def/parsingtable";
import {Lexer} from "../lexer/lexer";
import {Parser} from "./parser";

export class ParserFactory {
	public static create(language: Language, parsing_table: ParsingTable): Parser {
		const lexer = new Lexer(language.lex);
		return new Parser(lexer, language.grammar, parsing_table, "grammar");
	}
	public static createAST(language: Language, parsing_table: ParsingTable): Parser {
		const lexer = new Lexer(language.lex);
		return new Parser(lexer, language.grammar, parsing_table, "default");
	}
}
