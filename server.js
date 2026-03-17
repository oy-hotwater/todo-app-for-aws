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
app.post("/add", async (req, res) => {
  // フォームから送信された 'title' を取得し、前後の空白を削除（トリミング）
  const title = req.body.title.trim();

  // 空のタスクが送信された場合のバリデーション（防御）
  if (!title) {
    return res.status(400).send("タスク名を入力してください。");
  }

  try {
    // 🔥 プロの作法1: プレースホルダー（?）を使ったSQLインジェクション対策
    await pool.query("INSERT INTO tasks (title) VALUES (?)", [title]);

    // 🔥 プロの作法2: PRGパターンの実装（トップページへリダイレクト）
    res.redirect("/");
  } catch (error) {
    console.error("タスク追加エラー:", error);
    res.status(500).send("サーバーエラーが発生しました");
  }
});

app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
});
