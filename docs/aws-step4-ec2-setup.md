# AWS Webサーバー構築手順 (Step 4)

本ドキュメントは、タスク管理システムにおけるアプリケーションサーバー（Amazon EC2）の手動構築およびデプロイ手順を記録したものです。将来的なIaC化の際の要件定義としても機能します。

## 目的

プライベートサブネット内にEC2インスタンスを配置し、セキュアなアクセス経路（SSM Session Manager）を確保した上で、Node.js環境を構築しアプリケーションを永続化します。

## 1. ネットワークアウトバウンド経路の確保 (NAT Gateway)

プライベートサブネット内のEC2から、パッケージのダウンロード等を行うためのアウトバウンド通信経路を構築しました。

- **リソース:** NAT ゲートウェイ (todo-app-nat-gw)
- **配置先:** パブリックサブネット (todo-app-public-1a)
- **Elastic IP:** 新規割り当て
- **ルートテーブル更新:** - 対象: プライベートルートテーブル (todo-app-private-rt)
  - 追加ルート: 送信先 `0.0.0.0/0` / ターゲット `todo-app-nat-gw`
  - ※パブリックルートテーブルのIGWとの競合を避け、プライベートサブネット専用の経路として設定。

## 2. セキュアな接続環境の準備 (IAMロール)

SSHキーペアの管理リスクを排除し、AWS Systems Manager (SSM) 経由でブラウザから安全にターミナル接続するための権限を準備しました。

- **ロール名:** todo-app-ec2-ssm-role
- **信頼されたエンティティ:** EC2
- **許可ポリシー:** AmazonSSMManagedInstanceCore

## 3. EC2インスタンスのプロビジョニング

アプリケーションの実行環境となる仮想サーバーをプロビジョニングしました。

- **名前:** todo-app-web-server
- **AMI:** Amazon Linux 2023 kernel-6.1 AMI
- **インスタンスタイプ:** t2.micro または t3.micro
- **ネットワーク:**
  - VPC: todo-app-vpc
  - サブネット: todo-app-private-app-1a
  - パブリックIPの自動割り当て: 無効化
- **セキュリティグループ:** todo-app-ec2-sg (Step 3で作成済み)
- **IAM インスタンスプロフィール:** todo-app-ec2-ssm-role
- **キーペア:** なし (SSM接続のため)

## 4. 実行環境の構築 (Node.js & Git)

SSM Session Manager経由でインスタンスに接続し、ミドルウェアをインストールしました。
※セキュリティ要件を満たすため、EOLを迎えたv18ではなく、最新のLTSバージョンである Node.js 22 を採用しています。

```bash
sudo su - ec2-user
sudo dnf update -y

# Node.js 22 (LTS) のインストール
curl -fsSL [https://rpm.nodesource.com/setup_22.x](https://rpm.nodesource.com/setup_22.x) | sudo bash -
sudo dnf install -y nodejs

# Gitのインストール
sudo dnf install -y git
```

## 5. アプリケーションのデプロイと永続化
リポジトリからソースコードを取得し、プロセスマネージャーを用いてアプリケーションをデーモン化しました。

```bash
# アプリケーションの取得
git clone <リポジトリURL>
cd todo-app-for-aws

# 依存パッケージのインストール
npm install

# 環境変数の設定 (Step 3で作成したRDSのエンドポイントを指定)
nano .env
# DB_HOST=todo-app-db.xxxxx.ap-northeast-1.rds.amazonaws.com
# DB_USER=admin
# DB_PASSWORD=設定したパスワード
# DB_NAME=todo_db
# PORT=3000

# PM2によるプロセスの永続化
sudo npm install -g pm2
pm2 start server.js --name todo-app
pm2 startup
pm2 save
```

現在、アプリケーションはローカルポート3000番で待機中ですが、プライベートサブネットに配置されているため外部からの直接アクセスは遮断されています。外部公開は後続のロードバランサー（ALB）構築ステップで行います。
