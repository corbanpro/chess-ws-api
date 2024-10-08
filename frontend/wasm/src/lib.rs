// wasm-pack build --target web

use std::fmt::{Display, Formatter};

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use PieceType::*;
use Team::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

fn get_default_board() -> [[Option<Piece>; 8]; 8] {
    [
        [
            Some(Piece::new(Rook, White)),
            Some(Piece::new(Knight, White)),
            Some(Piece::new(Bishop, White)),
            Some(Piece::new(Queen, White)),
            Some(Piece::new(King, White)),
            Some(Piece::new(Bishop, White)),
            Some(Piece::new(Knight, White)),
            Some(Piece::new(Rook, White)),
        ],
        [Some(Piece::new(Pawn, White)); 8],
        [None, None, None, None, None, None, None, None],
        [None, None, None, None, None, None, None, None],
        [None, None, None, None, None, None, None, None],
        [None, None, None, None, None, None, None, None],
        [Some(Piece::new(Pawn, Black)); 8],
        [
            Some(Piece::new(Rook, Black)),
            Some(Piece::new(Knight, Black)),
            Some(Piece::new(Bishop, Black)),
            Some(Piece::new(Queen, Black)),
            Some(Piece::new(King, Black)),
            Some(Piece::new(Bishop, Black)),
            Some(Piece::new(Knight, Black)),
            Some(Piece::new(Rook, Black)),
        ],
    ]
}

#[derive(Clone, Copy, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct Game {
    board: [[Option<Piece>; 8]; 8],
    white_king_moved: bool,
    white_rook_a_moved: bool,
    white_rook_h_moved: bool,
    black_king_moved: bool,
    black_rook_a_moved: bool,
    black_rook_h_moved: bool,
    en_passant_pawn: Option<Square>,
    turn: Team,
    move_num: u32,
}

#[derive(Debug, Clone, PartialEq, Copy, Serialize, Deserialize)]
struct Piece {
    piece_type: PieceType,
    team: Team,
}

#[derive(Debug, PartialEq, Clone, Copy, Serialize, Deserialize)]
struct Square {
    rank: usize,
    file: usize,
}

#[derive(Debug, Clone, PartialEq, Copy, Serialize, Deserialize)]
enum Team {
    White,
    Black,
}

#[derive(Debug, Clone, PartialEq, Copy, Serialize, Deserialize)]
enum PieceType {
    King,
    Queen,
    Bishop,
    Knight,
    Rook,
    Pawn,
}

impl PieceType {
    fn from(piece_type_str: &str) -> Result<PieceType, String> {
        match piece_type_str {
            "King" => Ok(King),
            "Queen" => Ok(Queen),
            "Bishop" => Ok(Bishop),
            "Knight" => Ok(Knight),
            "Rook" => Ok(Rook),
            "Pawn" => Ok(Pawn),
            _ => Err(piece_type_str.to_string()),
        }
    }
}

impl Team {
    fn from(team_str: &str) -> Result<Team, String> {
        match team_str {
            "Black" => Ok(Black),
            "White" => Ok(White),
            _ => Err(team_str.to_string()),
        }
    }
    fn is_white(&self) -> bool {
        self == &White
    }
    fn is_black(&self) -> bool {
        self == &Black
    }
}

impl Piece {
    fn new(piece_type: PieceType, team: Team) -> Piece {
        Piece { piece_type, team }
    }
    fn team(&self) -> Team {
        self.team
    }
    fn piece_type(&self) -> PieceType {
        self.piece_type
    }
    fn is_king(&self) -> bool {
        self.piece_type() == King
    }
    fn is_pawn(&self) -> bool {
        self.piece_type() == Pawn
    }
}

impl Display for Square {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result<(), std::fmt::Error> {
        let files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        write!(f, "{}{}", files[self.file()], self.rank() + 1)
    }
}

impl Display for Team {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result<(), std::fmt::Error> {
        write!(f, "{:?}", self)
    }
}

impl Square {
    fn rank(&self) -> usize {
        self.rank
    }
    fn file(&self) -> usize {
        self.file
    }
    fn new(rank: usize, file: usize) -> Square {
        Square { rank, file }
    }
    fn from_usize(rank: usize, file: usize) -> Result<Square, String> {
        if rank > 7 || file > 7 {
            return Err("Error: Invalid Square".to_string());
        };
        Ok(Square { rank, file })
    }
    fn from_i32(rank: i32, file: i32) -> Result<Square, String> {
        if rank > 7 || file > 7 || rank < 0 || file < 0 {
            return Err("Error: Invalid Square".to_string());
        };
        let rank = rank as usize;
        let file = file as usize;
        Ok(Square { rank, file })
    }
    fn from(coords: &str) -> Result<Square, String> {
        if coords.chars().count() != 2 {
            return Err("Error: Invalid Coordinates".to_string());
        }
        let mut chars = coords.chars();
        let file_str = chars.next().unwrap();
        let rank_str = chars.next().unwrap();
        let file_strs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        let file = match file_strs.iter().position(|&ele| ele == file_str) {
            Some(file) => file,
            None => return Err("Error: Invalid Coordinates".to_string()),
        };
        let rank = match rank_str.to_string().parse::<usize>() {
            Ok(rank) => rank - 1,
            Err(_) => return Err("Error: Invalid Coordinates".to_string()),
        };
        Square::from_usize(rank, file)
    }
    fn coords(&self) -> String {
        self.to_string()
    }
    fn rank_diff(&self, target_sq: Square) -> usize {
        (self.rank() as i32 - target_sq.rank() as i32).unsigned_abs() as usize
    }
    fn file_diff(&self, target_sq: Square) -> usize {
        (self.file() as i32 - target_sq.file() as i32).unsigned_abs() as usize
    }
}

#[wasm_bindgen]
impl Game {
    fn get_board(&self) -> [[Option<Piece>; 8]; 8] {
        self.board
    }
    fn get_piece(&self, square: Square) -> Option<Piece> {
        self.get_board()[square.rank()][square.file()]
    }
    fn turn(&self) -> Team {
        self.turn
    }
    fn find_team_pieces(&self, team: Team) -> Vec<Square> {
        let mut pieces = vec![];
        for (rank_index, rank) in self.get_board().iter().enumerate() {
            for (file_index, piece) in rank.iter().enumerate() {
                if piece.is_some() && piece.unwrap().team() == team {
                    pieces.push(Square::new(rank_index, file_index))
                }
            }
        }
        pieces
    }
    fn find_king(&self, team: Team) -> Square {
        for (rank_index, rank) in self.get_board().iter().enumerate() {
            for (file_index, piece) in rank.iter().enumerate() {
                if piece.is_some() && piece.unwrap().is_king() && piece.unwrap().team() == team {
                    return Square::new(rank_index, file_index);
                }
            }
        }
        panic!("Didn't find {:?} king", team)
    }
    fn get_diagonal_moves(&self, start_sq: Square) -> Vec<Square> {
        let mut potential_moves = vec![];
        let start_rank = start_sq.rank() as i32;
        let start_file = start_sq.file() as i32;
        //move forward-right
        for distance in 1..8 {
            let new_sq = Square::from_i32(start_rank + distance, start_file + distance);
            if new_sq.is_ok() {
                potential_moves.push(new_sq.clone().unwrap());
            }
            if new_sq.is_err() || self.get_piece(new_sq.unwrap()).is_some() {
                break;
            }
        }
        //move forward-left
        for distance in 1..8 {
            let new_sq = Square::from_i32(start_rank + distance, start_file - distance);
            if new_sq.is_ok() {
                potential_moves.push(new_sq.clone().unwrap());
            }
            if new_sq.is_err() || self.get_piece(new_sq.unwrap()).is_some() {
                break;
            }
        }
        //move backward-right
        for distance in 1..8 {
            let new_sq = Square::from_i32(start_rank - distance, start_file + distance);
            if new_sq.is_ok() {
                potential_moves.push(new_sq.clone().unwrap());
            }
            if new_sq.is_err() || self.get_piece(new_sq.unwrap()).is_some() {
                break;
            }
        }
        //move backward-left
        for distance in 1..8 {
            let new_sq = Square::from_i32(start_rank - distance, start_file - distance);
            if new_sq.is_ok() {
                potential_moves.push(new_sq.clone().unwrap());
            }
            if new_sq.is_err() || self.get_piece(new_sq.unwrap()).is_some() {
                break;
            }
        }
        potential_moves
    }
    fn get_straight_moves(&self, start_sq: Square) -> Vec<Square> {
        let mut potential_moves = vec![];
        let start_rank = start_sq.rank() as i32;
        let start_file = start_sq.file() as i32;
        // move right
        for distance in 1..8 {
            let new_sq = Square::from_i32(start_rank + distance, start_file);
            if new_sq.is_ok() {
                potential_moves.push(new_sq.clone().unwrap());
            }
            if new_sq.is_err() || self.get_piece(new_sq.unwrap()).is_some() {
                break;
            }
        }
        //move left
        for distance in 1..8 {
            let new_sq = Square::from_i32(start_rank - distance, start_file);
            if new_sq.is_ok() {
                potential_moves.push(new_sq.clone().unwrap());
            }
            if new_sq.is_err() || self.get_piece(new_sq.unwrap()).is_some() {
                break;
            }
        }
        // move forward
        for distance in 1..8 {
            let new_sq = Square::from_i32(start_rank, start_file + distance);
            if new_sq.is_ok() {
                potential_moves.push(new_sq.clone().unwrap());
            }
            if new_sq.is_err() || self.get_piece(new_sq.unwrap()).is_some() {
                break;
            }
        }
        //move backward
        for distance in 1..8 {
            let new_sq = Square::from_i32(start_rank, start_file - distance);
            if new_sq.is_ok() {
                potential_moves.push(new_sq.clone().unwrap());
            }
            if new_sq.is_err() || self.get_piece(new_sq.unwrap()).is_some() {
                break;
            }
        }
        potential_moves
    }
    fn get_king_moves(&self, start_sq: Square) -> Vec<Square> {
        let team = self.get_piece(start_sq).unwrap().team();
        let start_rank = start_sq.rank() as i32;
        let start_file = start_sq.file() as i32;

        let mut potential_moves = vec![];
        for rank_movement in [-1, 0, 1] {
            for file_movement in [-1, 0, 1] {
                if rank_movement == 0 && file_movement == 0 {
                    continue;
                }
                let new_rank = start_rank + rank_movement;
                let new_file = start_file + file_movement;
                let new_sq = Square::from_i32(new_rank, new_file);
                if let Ok(new_sq) = new_sq {
                    potential_moves.push(new_sq)
                }
            }
        }

        // castle
        if team.is_white() && !self.white_king_moved {
            if !self.white_rook_a_moved
                && self.get_piece(Square::from("c1").unwrap()).is_none()
                && self.get_piece(Square::from("d1").unwrap()).is_none()
            {
                potential_moves.push(Square::from("c1").unwrap());
            }
            if !self.white_rook_h_moved
                && self.get_piece(Square::from("f1").unwrap()).is_none()
                && self.get_piece(Square::from("g1").unwrap()).is_none()
            {
                potential_moves.push(Square::from("g1").unwrap());
            }
        } else if team.is_black() && !self.black_king_moved {
            if !self.black_rook_a_moved
                && self.get_piece(Square::from("c8").unwrap()).is_none()
                && self.get_piece(Square::from("d8").unwrap()).is_none()
            {
                potential_moves.push(Square::from("c8").unwrap());
            }
            if !self.black_rook_h_moved
                && self.get_piece(Square::from("f8").unwrap()).is_none()
                && self.get_piece(Square::from("g8").unwrap()).is_none()
            {
                potential_moves.push(Square::from("g8").unwrap());
            }
        }

        potential_moves
    }
    fn get_queen_moves(&self, start_sq: Square) -> Vec<Square> {
        let mut diagonal_moves = self.get_diagonal_moves(start_sq);
        let mut straight_moves = self.get_straight_moves(start_sq);
        diagonal_moves.append(&mut straight_moves);
        diagonal_moves
    }
    fn get_bishop_moves(&self, start_sq: Square) -> Vec<Square> {
        self.get_diagonal_moves(start_sq)
    }
    fn get_knight_moves(&self, start_sq: Square) -> Vec<Square> {
        let mut potential_moves = vec![];
        let start_rank = start_sq.rank() as i32;
        let start_file = start_sq.file() as i32;

        for rank_diff in [-2_i32, -1, 1, 2] {
            for file_diff in [-2_i32, -1, 1, 2] {
                if rank_diff.abs() + file_diff.abs() == 3 {
                    let new_sq = Square::from_i32(start_rank + rank_diff, start_file + file_diff);
                    if let Ok(new_sq) = new_sq {
                        potential_moves.push(new_sq)
                    }
                }
            }
        }

        potential_moves
    }
    fn get_rook_moves(&self, start_sq: Square) -> Vec<Square> {
        self.get_straight_moves(start_sq)
    }
    fn get_pawn_moves(&self, start_sq: Square) -> Vec<Square> {
        let team = self.get_piece(start_sq).unwrap().team();
        let mut potential_moves = vec![];

        let start_rank = start_sq.rank() as i32;
        let start_file = start_sq.file() as i32;

        let unmoved_rank = if team.is_white() { 1 } else { 6 };
        let last_rank = if team.is_white() { 7 } else { 0 };
        let move_direction = if team.is_white() { 1 } else { -1 };
        let single_move_rank = start_rank + move_direction;
        let double_move_rank = single_move_rank + move_direction;

        if start_rank != last_rank {
            // in front
            if self
                .get_piece(Square::from_i32(single_move_rank, start_file).unwrap())
                .is_none()
            {
                potential_moves.push(Square::from_i32(single_move_rank, start_file).unwrap());
            }

            // double move
            if start_rank == unmoved_rank
                && self
                    .get_piece(Square::from_i32(double_move_rank, start_file).unwrap())
                    .is_none()
            {
                potential_moves.push(Square::from_i32(double_move_rank, start_file).unwrap());
            }

            // on the right
            if start_file != 7 {
                let right_attack_sq = Square::from_i32(single_move_rank, start_file + 1).unwrap();
                if self.get_piece(right_attack_sq).is_some() {
                    potential_moves.push(right_attack_sq);
                }
            }

            // on the left
            if start_file != 0 {
                let left_attack_sq = Square::from_i32(single_move_rank, start_file - 1).unwrap();
                if self.get_piece(left_attack_sq).is_some() {
                    potential_moves.push(left_attack_sq);
                }
            }
        }

        // en passant
        if self.en_passant_pawn.is_some()
            && start_sq.rank_diff(self.en_passant_pawn.unwrap()) == 0
            && start_sq.file_diff(self.en_passant_pawn.unwrap()) == 1
        {
            potential_moves.push(Square::new(
                single_move_rank as usize,
                self.en_passant_pawn.unwrap().file(),
            ));
        }

        potential_moves
    }
    fn get_possible_moves(&self, start_sq: Square) -> Vec<Square> {
        let start_piece = self.get_piece(start_sq).unwrap();

        let mut possible_moves: Vec<Square> = match start_piece.piece_type() {
            King => self.get_king_moves(start_sq),
            Queen => self.get_queen_moves(start_sq),
            Bishop => self.get_bishop_moves(start_sq),
            Knight => self.get_knight_moves(start_sq),
            Rook => self.get_rook_moves(start_sq),
            Pawn => self.get_pawn_moves(start_sq),
        };

        possible_moves.retain(|target_sq| {
            let target_piece = self.get_piece(*target_sq);
            !(target_piece.is_some() && target_piece.unwrap().team() == start_piece.team())
        });

        possible_moves
    }
    fn move_piece_test(&self, start_sq: Square, target_sq: Square) -> Game {
        let mut test_game = *self;
        let piece = self.board[start_sq.rank][start_sq.file];
        test_game.board[start_sq.rank][start_sq.file] = None;
        test_game.board[target_sq.rank][target_sq.file] = piece;
        test_game.switch_turn();
        test_game
    }
    fn switch_turn(&mut self) {
        match self.turn() {
            Black => self.turn = White,
            White => self.turn = Black,
        }
    }
    fn find_last_rank_pawn(&self) -> Option<(usize, usize)> {
        let white_rank_res = self.get_board()[0]
            .iter()
            .position(|piece| piece.is_some() && piece.unwrap().is_pawn());

        let black_rank_res = self.get_board()[0]
            .iter()
            .position(|piece| piece.is_some() && piece.unwrap().is_pawn());

        if let Some(file) = white_rank_res {
            return Some((0, file));
        } else if let Some(file) = black_rank_res {
            return Some((7, file));
        }

        None
    }
    pub fn reset(&mut self) {
        *self = Game::init();
    }
    pub fn init() -> Game {
        Game {
            board: get_default_board(),
            white_king_moved: false,
            white_rook_a_moved: false,
            white_rook_h_moved: false,
            black_king_moved: false,
            black_rook_a_moved: false,
            black_rook_h_moved: false,
            en_passant_pawn: None,
            turn: White,
            move_num: 0,
        }
    }
    pub fn dump(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
    pub fn from_dump(&mut self, dump: String) {
        let replacement_game: Self = serde_json::from_str(&dump).unwrap();
        *self = replacement_game;
    }
    pub fn is_white_turn(&self) -> bool {
        self.turn() == White
    }
    pub fn is_black_turn(&self) -> bool {
        self.turn() == Black
    }
    pub fn move_num(&self) -> u32 {
        self.move_num
    }
    pub fn js_board(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.get_board()).unwrap()
    }
    pub fn get_check_coords(&self) -> JsValue {
        let mut king_coords = vec![];
        let mut attacking_pieces = vec![];

        for loser_team in [White, Black] {
            let winner_team = if loser_team.is_white() { Black } else { White };

            let winning_piece_squares = self.find_team_pieces(winner_team);
            let loser_king_sq = &self.find_king(loser_team);
            for winner_piece_sq in winning_piece_squares {
                if self
                    .get_possible_moves(winner_piece_sq)
                    .contains(loser_king_sq)
                {
                    king_coords.push(loser_king_sq.coords());
                    attacking_pieces.push(winner_piece_sq.coords());
                };
            }
        }

        king_coords.append(&mut attacking_pieces);

        serde_wasm_bindgen::to_value(&king_coords).unwrap()
    }
    pub fn in_check(&self, loser_team_str: &str) -> bool {
        let loser_team = Team::from(loser_team_str);
        if loser_team.is_err() {
            console_log!(
                "invalid team passed to in_checkmate: {:?}",
                loser_team.unwrap()
            );
            panic!("invalid piece selected")
        }
        let loser_team = loser_team.unwrap();
        let winner_team = if loser_team.is_white() { Black } else { White };

        let winning_piece_squares = self.find_team_pieces(winner_team);
        let loser_king_sq = &self.find_king(loser_team);
        for winner_piece_sq in winning_piece_squares {
            if self
                .get_possible_moves(winner_piece_sq)
                .contains(loser_king_sq)
            {
                return true;
            };
        }
        false
    }
    pub fn get_legal_moves(&self, start_sq_str: &str) -> Vec<String> {
        // validate input
        let start_sq = Square::from(start_sq_str);
        if start_sq.is_err() {
            console_log!(
                "invalid coordinates or team passed to get_legal_moves coords: {}",
                start_sq_str,
            );
            panic!("invalid coordinates passed to get_legal_moves");
        }
        let start_sq = start_sq.unwrap();
        let team = self.get_piece(start_sq).unwrap().team();

        // make sure the player owns the piece they are trying to move
        let start_piece = self.get_piece(start_sq);
        if start_piece.is_none() {
            return vec![];
        }
        let start_piece = start_piece.unwrap();
        if start_piece.team() != self.turn() {
            return vec![];
        }

        let mut legal_moves = self.get_possible_moves(start_sq);

        legal_moves.retain(|possible_move| {
            // cannot move into check
            let test_game = self.move_piece_test(start_sq, *possible_move);
            if (team.is_white() && test_game.in_check("White"))
                || (team.is_black() && test_game.in_check("Black"))
            {
                return false;
            }

            // cannot castle from check
            let piece = self.get_piece(start_sq).unwrap();

            let attempting_castle =
                piece.is_king() && start_sq.file_diff(possible_move.to_owned()) > 1;

            let in_check = (team.is_white() && self.in_check("White"))
                || (team.is_black() && self.in_check("Black"));

            if attempting_castle && in_check {
                return false;
            }

            if attempting_castle {
                let middle_sq = Square::from_usize(
                    start_sq.rank(),
                    (start_sq.file() + possible_move.file()) / 2,
                )
                .unwrap();
                let castle_test_game = self.move_piece_test(start_sq, middle_sq);

                let castling_thru_check = self.turn().is_white()
                    && castle_test_game.in_check("White")
                    || self.turn().is_black() && castle_test_game.in_check("Black");
                if castling_thru_check {
                    return false;
                }
            }
            true
        });

        legal_moves
            .iter()
            .map(|possible_move| possible_move.coords())
            .collect()
    }
    pub fn has_last_rank_pawn(&self) -> bool {
        self.find_last_rank_pawn().is_some()
    }
    pub fn replace_last_rank_pawn(&mut self, piece_type_str: &str) {
        let replacement_piece = PieceType::from(piece_type_str);
        if replacement_piece.is_err() {
            console_log!(
                "invalid piece or team passed to replace_last_rank_pawn: {:?}",
                replacement_piece.unwrap(),
            );
            panic!("invalid piece selected")
        }
        let replacement_piece = replacement_piece.unwrap();

        let (pawn_rank, pawn_file) = self.find_last_rank_pawn().unwrap();

        let team = if pawn_rank == 0 { Black } else { White };

        self.board[pawn_rank][pawn_file] = Some(Piece::new(replacement_piece, team));
    }
    pub fn in_checkmate(&self, loser_team_str: &str) -> bool {
        let loser_team = Team::from(loser_team_str);
        if loser_team.is_err() {
            console_log!(
                "invalid team passed to in_checkmate: {:?}",
                loser_team.unwrap()
            );
            panic!("invalid piece selected")
        }
        let loser_team = loser_team.unwrap();
        let loser_piece_squares = self.find_team_pieces(loser_team);
        let mut checkmate = true;
        let mut test_game = *self;
        test_game.turn = loser_team;
        for loser_piece_sq in loser_piece_squares {
            if !test_game
                .get_legal_moves(&loser_piece_sq.coords())
                .is_empty()
            {
                checkmate = false;
                return checkmate;
            }
        }
        checkmate
    }
    pub fn move_piece(
        &mut self,
        start_sq_str: &str,
        target_sq_str: &str,
    ) -> Result<JsValue, String> {
        let mut last_moved_coords: Vec<Vec<String>> = vec![];
        if !self
            .get_legal_moves(start_sq_str)
            .contains(&target_sq_str.to_string())
        {
            return Err("Error: Invalid Move".to_string());
        }

        let start_sq = Square::from(start_sq_str).unwrap();
        let target_sq = Square::from(target_sq_str).unwrap();
        last_moved_coords.push(vec![start_sq.coords(), target_sq.coords()]);

        let piece = self.board[start_sq.rank()][start_sq.file()].unwrap();

        // castle
        if piece.is_king() && start_sq.file_diff(target_sq) > 1 {
            let rook_start_file;
            let rook_end_file;
            if target_sq.file() == 6 {
                rook_start_file = 7;
                rook_end_file = 5;
            } else {
                rook_start_file = 0;
                rook_end_file = 3;
            }
            last_moved_coords.push(vec![
                Square::from_usize(target_sq.rank(), rook_start_file)
                    .unwrap()
                    .coords(),
                Square::from_usize(target_sq.rank(), rook_end_file)
                    .unwrap()
                    .coords(),
            ]);
            let rook = self.board[target_sq.rank()][rook_start_file];
            self.board[target_sq.rank()][rook_start_file] = None;
            self.board[target_sq.rank()][rook_end_file] = rook
        }

        // en passant
        if piece.is_pawn()
            && self.get_piece(target_sq).is_none()
            && start_sq.file() != target_sq.file()
        {
            self.board[start_sq.rank()][target_sq.file()] = None;
        }
        // execute move
        self.board[start_sq.rank()][start_sq.file()] = None;
        self.board[target_sq.rank()][target_sq.file()] = Some(piece);

        // update moved pieces & en passant
        match start_sq.coords().as_str() {
            "e1" => self.white_king_moved = true,
            "a1" => self.white_rook_a_moved = true,
            "h1" => self.white_rook_h_moved = true,
            "e8" => self.black_king_moved = true,
            "a8" => self.black_rook_a_moved = true,
            "h8" => self.black_rook_h_moved = true,
            _ => {}
        }
        if piece.is_pawn() && start_sq.rank_diff(target_sq) == 2 {
            self.en_passant_pawn = Some(target_sq);
        } else {
            self.en_passant_pawn = None;
        }

        self.switch_turn();
        self.move_num += 1;

        Ok(serde_wasm_bindgen::to_value(&last_moved_coords).unwrap())
    }
}
