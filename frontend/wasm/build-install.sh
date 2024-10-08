SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

cd $SCRIPT_DIR

wasm-pack build --target web

cp $SCRIPT_DIR/pkg/chess.js $SCRIPT_DIR/../public/
cp $SCRIPT_DIR/pkg/chess_bg.wasm $SCRIPT_DIR/../public/
cp $SCRIPT_DIR/pkg/chess.d.ts $SCRIPT_DIR/../public/

cd -
