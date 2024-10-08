/* tslint:disable */
/* eslint-disable */
/**
*/
export class Game {
  free(): void;
/**
*/
  reset(): void;
/**
* @returns {Game}
*/
  static init(): Game;
/**
* @returns {string}
*/
  dump(): string;
/**
* @param {string} dump
*/
  from_dump(dump: string): void;
/**
* @returns {boolean}
*/
  is_white_turn(): boolean;
/**
* @returns {boolean}
*/
  is_black_turn(): boolean;
/**
* @returns {number}
*/
  move_num(): number;
/**
* @returns {any}
*/
  js_board(): any;
/**
* @returns {any}
*/
  get_check_coords(): any;
/**
* @param {string} loser_team_str
* @returns {boolean}
*/
  in_check(loser_team_str: string): boolean;
/**
* @param {string} start_sq_str
* @returns {(string)[]}
*/
  get_legal_moves(start_sq_str: string): (string)[];
/**
* @returns {boolean}
*/
  has_last_rank_pawn(): boolean;
/**
* @param {string} piece_type_str
*/
  replace_last_rank_pawn(piece_type_str: string): void;
/**
* @param {string} loser_team_str
* @returns {boolean}
*/
  in_checkmate(loser_team_str: string): boolean;
/**
* @param {string} start_sq_str
* @param {string} target_sq_str
* @returns {any}
*/
  move_piece(start_sq_str: string, target_sq_str: string): any;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_game_free: (a: number, b: number) => void;
  readonly game_reset: (a: number) => void;
  readonly game_init: () => number;
  readonly game_dump: (a: number, b: number) => void;
  readonly game_from_dump: (a: number, b: number, c: number) => void;
  readonly game_is_white_turn: (a: number) => number;
  readonly game_is_black_turn: (a: number) => number;
  readonly game_move_num: (a: number) => number;
  readonly game_js_board: (a: number) => number;
  readonly game_get_check_coords: (a: number) => number;
  readonly game_in_check: (a: number, b: number, c: number) => number;
  readonly game_get_legal_moves: (a: number, b: number, c: number, d: number) => void;
  readonly game_has_last_rank_pawn: (a: number) => number;
  readonly game_replace_last_rank_pawn: (a: number, b: number, c: number) => void;
  readonly game_in_checkmate: (a: number, b: number, c: number) => number;
  readonly game_move_piece: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
