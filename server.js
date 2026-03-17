// 環境変数の読み込み
require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// テンプレートエンジンの設定
app.set("view engine", "ejs");
app.use(express.static("public"));

// トップページへのアクセス処理
app.get("/", (req, res) => {
  res.send("環境構築が完了しました！ここからToDoアプリを作ります。");
});

// サーバーの起動
app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
});
