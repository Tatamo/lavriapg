import {Language} from "../def/language";
import {ParsingTable} from "../def/parsingtable";
import {Lexer} from "../lexer/lexer";
import {Parser} from "./parser";
import {ASTConstructor, DefaultCallbackController} from "./callback";

export class ParserFactory {
	public static create(language: Language, parsing_table: ParsingTable): Parser {
		const callback_controller = new DefaultCallbackController(language);
		const lexer = new Lexer(language.lex);
		const parser = new Parser(lexer, language.grammar, parsing_table);
		parser.setCallbackController(callback_controller);
		return parser;
	}
	public static createAST(language: Language, parsing_table: ParsingTable): Parser {
		const callback_controller = new ASTConstructor(language);
		const lexer = new Lexer(language.lex);
		const parser = new Parser(lexer, language.grammar, parsing_table);
		parser.setCallbackController(callback_controller);
		return parser;
	}
}
