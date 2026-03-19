# AWS ロードバランサー構築および疎通確認手順 (Step 5)

本ドキュメントは、タスク管理システムにおけるロードバランサー（Application Load Balancer）の手動構築手順、および疎通確認時のトラブルシューティングの記録です。

## 目的

パブリックサブネットにALBを配置してインターネットからのトラフィックを受け付け、プライベートサブネット内のEC2（Node.jsアプリケーション）へ安全にルーティングする経路を確立します。

## 1. セキュリティグループの構築と更新

ネットワーク境界における通信制御を厳格に行うため、以下の設定を行いました。

### 1.1 ALB用セキュリティグループの作成
- **名前:** todo-app-alb-sg
- **説明:** Security group for Application Load Balancer
- **VPC:** todo-app-vpc
- **インバウンドルール:** HTTP (80) および HTTPS (443) を Anywhere (0.0.0.0/0) から許可
- **アウトバウンドルール:** カスタムTCP (3000) を `todo-app-ec2-sg` に対してのみ許可

### 1.2 EC2用セキュリティグループの更新
既存の `todo-app-ec2-sg` を更新し、アプリケーションが直接インターネットからアクセスされないよう制御しました。
- **インバウンドルールの追加:** カスタムTCP (3000) をソース `todo-app-alb-sg` からのみ許可

## 2. ターゲットグループの作成

ALBがトラフィックを振り分ける宛先となるサーバー群を定義しました。

- **ターゲットグループ名:** todo-app-tg
- **ターゲットタイプ:** インスタンス
- **プロトコル / ポート:** HTTP / 3000
- **IPアドレスタイプ:** IPv4
- **プロトコルバージョン:** HTTP1
- **ヘルスチェックパス:** `/`
- **登録ターゲット:** プライベートサブネット内の `todo-app-web-server` (ポート3000)

## 3. Application Load Balancer (ALB) の作成

インターネットからのリクエストを受け付けるALBを構築しました。

- **ロードバランサー名:** todo-app-alb
- **スキーム:** インターネット向け (Internet-facing)
- **ネットワークマッピング:** パブリックサブネット (`todo-app-public-1a`, `todo-app-public-1c`)
- **セキュリティグループ:** `todo-app-alb-sg` をアタッチ
- **リスナーとルーティング:** HTTP (80) リクエストを `todo-app-tg` へ転送

## 4. トラブルシューティングと最終疎通確認

ALBのDNS名にアクセスした際、「サーバーエラーが発生しました」という画面（HTTPステータス500）が表示され、ターゲットグループのヘルスチェックが「Unhealthy」となる事象が発生しました。

### 原因と解決策
エラーログの精査により、RDSインスタンス内に `todo_db` は存在するものの、`tasks` テーブルが未作成であることが原因と判明しました。アプリケーションがルートパス (`/`) でデータベースからタスクを取得できず、500エラーを返していたため、ALBのヘルスチェックが失敗していました。

EC2からMySQLクライアントを使用してRDSに接続し、以下のSQLでテーブルを作成しました。

```sql
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

テーブル作成後、アプリケーションが正常にステータスコード200を返すようになり、ヘルスチェックが「Healthy」に回復。ALBのDNS名を利用したブラウザからのアクセスでタスク一覧画面が正常に表示されることを確認しました。

## 5. 補足事項 (HTTPS化について)
運用コストの観点から独自ドメインの取得を見送ったため、Route 53およびACMを用いたHTTPS化の設定は実施していません。ただし、ALBを利用したパブリックからプライベートDBまでの3層アーキテクチャにおけるセキュアな通信経路の確立は証明されています。
