require("dotenv").config();
const express = require("express");
// プロの作法: コールバックではなく、非同期処理(async/await)が使える promise 版を読み込む
const mysql = require("mysql2/promise");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
// フォームから送信されたデータを受け取るための設定（必須）
app.use(express.urlencoded({ extended: true }));

// 🔥 プロの作法: コネクションプール（Connection Pool）の作成
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 【機能1】タスク一覧の表示 (GET)
app.get("/", async (req, res) => {
  try {
    // データベースからタスクを取得
    const [rows] = await pool.query(
      "SELECT * FROM tasks ORDER BY created_at DESC",
    );
    // index.ejs にデータを渡して画面を描画
    res.render("index", { tasks: rows });
  } catch (error) {
    console.error("データベースの取得エラー:", error);
    res.status(500).send("サーバーエラーが発生しました");
  }
});

// 【機能2】新規タスクの追加 (POST)
app.get("/add", (req, res) => {
  // 実際にはフォームからPOSTされる想定ですが、テスト用にGETで作っています（後で修正します）
  res.send("タスク追加機能は後ほど実装します");
});

app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
});
