import {Token} from "./token";

/**
 * Shiftオペレーション
 */
export type ShiftOperation = { type: "shift", to: number };

/**
 * Reduceオペレーション
 */
export type ReduceOperation = { type: "reduce", grammar_id: number };

/**
 * Shift/Reduceコンフリクト
 */
export type ConflictedOperation = { type: "conflict", shift_to: Array<number>, reduce_grammar: Array<number> };

/**
 * Acceptオペレーション
 */
export type AcceptOperation = { type: "accept" };

/**
 * Gotoオペレーション
 */
export type GotoOperation = { type: "goto", to: number };

/**
 * 構文解析器の実行する命令群
 */
export type ParsingOperation = ShiftOperation | ReduceOperation | ConflictedOperation | AcceptOperation | GotoOperation;

/**
 * 構文解析表
 */
export type ParsingTable = Array<Map<Token, ParsingOperation>>;
