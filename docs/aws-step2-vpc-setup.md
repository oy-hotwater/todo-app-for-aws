# AWSネットワーク基盤構築手順 (Step 2)

本ドキュメントは、タスク管理システムにおけるAWSネットワーク基盤（VPC）の手動構築手順を記録したものです。将来的なIaC（Terraform/CloudFormation）化の際の要件定義としても機能します。

## 1. VPC (Virtual Private Cloud)

アプリケーションを配置するための論理的に隔離されたネットワーク空間を作成。

- **名前タグ:** todo-app-vpc
- **IPv4 CIDR ブロック:** 10.0.0.0/16
- **テナンシー:** デフォルト

## 2. サブネット (Subnets)

マルチAZ（アベイラビリティゾーン）構成による高可用性を担保するため、用途別に計6つのサブネットを作成。

### パブリックサブネット (ALB配置用)

- todo-app-public-1a (ap-northeast-1a) : 10.0.1.0/24
- todo-app-public-1c (ap-northeast-1c) : 10.0.2.0/24

### プライベートサブネット (EC2アプリケーション配置用)

- todo-app-private-app-1a (ap-northeast-1a) : 10.0.11.0/24
- todo-app-private-app-1c (ap-northeast-1c) : 10.0.12.0/24

### プライベートDBサブネット (RDS配置用)

- todo-app-private-db-1a (ap-northeast-1a) : 10.0.21.0/24
- todo-app-private-db-1c (ap-northeast-1c) : 10.0.22.0/24

## 3. インターネットゲートウェイ (Internet Gateway)

パブリックサブネット内のリソースがインターネットと通信するためのゲートウェイ。

- **名前タグ:** todo-app-igw
- **アタッチ先:** todo-app-vpc

## 4. ルートテーブル (Route Tables)

サブネットのトラフィック経路を定義し、パブリックとプライベートの境界を制御。

### パブリックルートテーブル

- **名前タグ:** todo-app-public-rt
- **対象VPC:** todo-app-vpc
- **ルート設定:** 送信先 `0.0.0.0/0` を `todo-app-igw` (インターネットゲートウェイ) へルーティング
- **関連付け:** todo-app-public-1a, todo-app-public-1c

### プライベートルートテーブル

- **名前タグ:** todo-app-private-rt
- **対象VPC:** todo-app-vpc
- **ルート設定:** デフォルトのローカルルートのみ（インターネットへの直接経路を持たない）
- **関連付け:** アプリケーション用およびDB用のプライベートサブネット計4つすべて

## 5. ネットワークリソースマップ (構成の証明)

VPC内の各サブネットとルートテーブル、インターネットゲートウェイの論理的な接続関係は以下の通りです。プライベートサブネットがIGWから完全に隔離されていることを確認しています。

<img width="1810" height="720" alt="Todo-app-for-aws_Step2_resource-map_2026-03-17" src="https://github.com/user-attachments/assets/d83a8a36-d36e-4470-9ba2-eaaf112e4aa2" />

