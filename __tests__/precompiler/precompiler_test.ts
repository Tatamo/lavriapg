import {PreCompiler} from "../../src/precompiler/precompiler";
import {test_calc_language_raw_string} from "../data/sample_language";
import {AbstractCallbackController} from "../../src/parser/callback";
import {ILexer} from "../../dist/lexer/lexer";
import * as fs from "fs";

class CustomCallbackController extends AbstractCallbackController {
	callLex(id: number, value: any, lexer: ILexer) {
		const rule = this.language.lex[id];
		if (rule.token == "DIGITS") {
			return +value;
		}
		return null;
	}
	callGrammar(id: number, children: Array<any>, lexer: ILexer) {
		const rule = this.language.grammar[id];
		if (rule.ltoken == "ATOM") {
			if (children.length == 1) {
				return children[0];
			}
			else {
				return children[1];
			}
		}
		else if (rule.ltoken == "TERM") {
			if (children.length == 1) {
				return children[0];
			}
			else {
				return children[0] * children[2];
			}
		}
		else if (rule.ltoken == "EXP") {
			if (children.length == 1) {
				return children[0];
			}
			else {
				return children[0] + children[2];
			}
		}
	}
}

describe("precompiler test", () => {
	const precompiler = new PreCompiler("../../../dist");
	const source = precompiler.exec(test_calc_language_raw_string);
	fs.writeFileSync("./__tests__/data/tmp/precompiler_result.ts", source);
	const p = require("../data/tmp/precompiler_result.ts");
	test("parse \"1+1\" by using compiled parser", () => {
		expect(() => p.parser.parse("1+1")).not.toThrow();
	});
	test("parse \"1+1\" equals to 2 by using compiled parser and custom callback controller", () => {
		p.parser.setCallbackController(new CustomCallbackController(p.language));
		expect(p.parser.parse("1+1")).toBe(2);
	});
	fs.unlinkSync("./__tests__/data/tmp/precompiler_result.ts");
});
