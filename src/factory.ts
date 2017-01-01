import {GrammarDefinition} from "./grammar";
import {ParsingTable} from "./parsingtable";
import {Lexer} from "./lexer";
import {ParserCallback, Parser} from "./parser";

export class ParserFactory{
	public static create(grammar: GrammarDefinition, parsing_table: ParsingTable, default_fallback?: ParserCallback):Parser{
		let lexer = new Lexer(grammar.lex);
		return new Parser(lexer, grammar.syntax, parsing_table, default_fallback);
	}
}
