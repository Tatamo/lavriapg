import {Token} from "./definition";
import * as Immutable from "immutable";

export type ShiftOperation = {type: "shift", to: number};
export type ReduceOperation = {type: "reduce", syntax: number};
export type ConflictedOperation = {type: "conflict", shift_to:Array<number>, reduce_syntax:Array<number>};
export type AcceptOperation = {type: "accept"};
export type GotoOperation = {type : "goto", to: number};
export type ParsingOperation = ShiftOperation|ReduceOperation|ConflictedOperation|AcceptOperation|GotoOperation;
export type ParsingTable = Array<Immutable.Map<Token, ParsingOperation>>;

