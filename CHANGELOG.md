# CHANGELOG

このプロジェクトの変更履歴。日付は新しいものを上に追記する。
コード(`index.html` / `css/style.css` / `js/script.js`)や仕様に変更を加えた場合は、このファイルに追記すること(詳細は `AI_GUIDE.md` を参照)。

## 2026-09-27(9)

- ドキュメントのみ: 利用者からの一連の指示・訂正を受けて`IMPLEMENTATION.md`/`ARCHITECTURE.md`/`CONSTITUTION.md`/`TODO.md`を更新した。
  - `specialsUsed`(必殺技使用実績)の`upperGuardUpper`/`guardPunchUpper`は「カウントだけして保留」との指示により、対応不要な保留事項として`TODO.md`に明記(いつか使うかもしれないため記録は残す)。
  - 画像アセットは実際はGitHub上に既にアップロード済みで動作している(ローカル作業ディレクトリに`assets/`が無いのは、この環境にバイナリアセットを同期していないだけ)ことが判明したため、`TODO.md`の「画像アセット未整備」という誤った記載を訂正。
  - VERSUSのキャラ間バランス調整は「とりあえずおいておく」との指示により保留として明記。
  - HOW TOは現状の1種類のみに加えて、EXTRA BATTLE/TRAINING MODE/VERSUSそれぞれに専用の解説を用意する構想があるとの方針を`TODO.md`に記録。
  - 前回「保留」としていた`IMPLEMENTATION.md`の大規模更新に着手し、これまで未文書化だった実装済み機能(BONUS CONTENTS、COSTUME、SOUND TEST、SPEED、GIFT CODE、SUB STORY、EXTRA BATTLE、実際のBGM/SE再生システム)を新設の第8〜11節として追記(ローカル対戦(VERSUS)は第12節へ繰り下げ)。あわせて`ARCHITECTURE.md`のモジュール4・8の関数一覧を更新。
    - ドキュメント化にあたり、利用者の指示により、このセッション用に蓄積されているプロジェクトメモ(overview/technical-notes等)を実コードの裏付けとして参照した。
  - `CONSTITUTION.md`第15条の「サウンドは今後実装予定」という古い誤った記載も訂正。
  - コード自体(`index.html` / `css/style.css` / `js/script.js`)への変更なし。

## 2026-09-27(8)

- 隠しアイテム図鑑の機能自体を廃止した(「隠しアイテム図鑑については消して」との指示による。骨組みのみで中身が未定のまま、実装予定も無かったため)。
  - `index.html`: OPTIONポップアップの図鑑行(`#optionItemsRow`)を削除。
  - `js/script.js`: `unlockedItems`配列とそのセーブデータ読み込み、`openItemGallery()`(「準備中です」アラート)、`updateOptionUI`内の図鑑行の表示切り替えを削除。
  - `CONSTITUTION.md`(第15条)・`IMPLEMENTATION.md`(第6・7節)・`ARCHITECTURE.md`(モジュール8の関数一覧)・`TESTING.md`・`TODO.md`から図鑑関連の記述を削除・訂正。
  - `index.html`を変更したため、カウンター運用に従い保留中の更新回数(1)+1=2を加算し、`.title-version`を`ver. 0.9.116`→`ver. 0.9.118`に更新(`css/style.css?v=`も118に合わせて更新)。保留中の更新回数は0に戻した。
  - 検証: `node --check`通過。

## 2026-09-27(7)

- 5人目(ENEMY_05)のストーリー隠しタップの座標を設定した(「ENEMY_05の隠しタップは、1画面目のx: 26%, y: 36〜71%のあたりに。※他より広い」との指定による)。
  - `STORY_HIDDEN_TAP_POS_BY_ENEMY`に`ENEMY_05: { x: 26, y: 53.5, h: 35 }`を追加(中心y=53.5%は指定範囲36〜71%の中点、hは判定矩形の高さを既定の20%から35%へ広げる新設パラメータ)。
  - 判定矩形の生成ロジック(`playStorySequence`内)に`pos.w`/`pos.h`による幅・高さのオーバーライドを追加(未指定の敵は既定の20%×20%のまま)。
  - 検証: Playwrightのスクラッチ環境で`state.storyEnemyIndex=4`(ENEMY_05)にしてストーリー1画面目を表示し、`#storyHiddenTap`の実際のスタイル(`left:16%, top:36%, width:20%, height:35%`)が指定範囲(x:16〜36%中心26%、y:36〜71%)と一致することを確認済み。
  - 併せて、コード内に残っていた古い「サブストーリーは仮テキスト」という記述(実際は本文完成済み)を訂正。
  - `TODO.md`から「ENEMY_05の隠しタップ座標未設定」の項目を解消として反映。
  - `index.html`は変更していないため`.title-version`表記は据え置き、`AI_GUIDE.md`の保留中の更新回数のみ+1する。

## 2026-09-27(6)

- ドキュメントのみ: 利用者からの指摘・確認結果を受けて`TODO.md`をさらに修正。
  - サブストーリー本文(`SUBSTORY_BY_ENEMY`)は既に本文を入れ終えている(コード内コメントの「仮テキスト」という記述が古いままだった)ため、TODOから削除。
  - 隠しタップ座標は5人目(ENEMY_05)のみ未設定と利用者が確認、他の4人は設定済みと明記。
  - `IMPLEMENTATION.md`にドキュメントが無いと判明した実装済み機能群(COSTUME/SOUND TEST/SPEED/GIFT CODE/SUB STORY/EXTRA BATTIL/実際のBGM・SE再生等)は、利用者の指示により「別途まとまった作業として記録しておく」こととし、`TODO.md`に新設した「7. 保留: IMPLEMENTATION.mdの大規模更新」節へ対象一覧を記録した(今回はドキュメント執筆自体は行わない)。
  - `IMPLEMENTATION.md`の「サウンド設定値の保存のみで再生は未実装」という記載は誤りだったため訂正(実際はWeb Audio APIで再生まで実装済み)。
  - コード自体(`index.html` / `css/style.css` / `js/script.js`)への変更なし。

## 2026-09-27(5)

- ドキュメントのみ: `TODO.md`を「TODO整理していくか」との依頼を受けて全項目を実コードと突き合わせ、正確性チェック→優先度順の並べ替えの順で整理した。
  - 実装済みと判明したため削除: サウンド再生(実際はWeb Audio APIで実装済み)、敵の行動パターン(`favoritePatterns`/`avoidPatterns`/`firstMoveBias`は実装・使用済み)、STORY MODEの敵進行(`advanceToNextEnemy`は呼び出し済み)、敵ごとの専用グラフィック(`enemy_1`〜`enemy_5`個別に実装済み)、HOW TOの本文(プレースホルダーではなく実際の遊び方解説に差し替え済み)。
  - 新規追加: 起動処理内に残っている「本番リリース前に必ず削除すること」と明記されたデバッグ用の一時全解放ブロック(最優先項目として追加)。サブストーリー本文・隠しタップ位置が明示的に「仮」のままである点(本編プロローグ/ストーリー本文は完成済みと明記して区別)。
  - 発見事項として報告: `IMPLEMENTATION.md`(8モジュール構成)には無い実装済み機能(COSTUME/スキン切り替え、SOUND TEST、SPEED x2、GIFT CODE、SUB STORY、EXTRA BATTLE等)が多数見つかった。ドキュメント化は別途まとまった作業として提案し、`TODO.md`にも記録した。
  - コード自体(`index.html` / `css/style.css` / `js/script.js`)への変更なし。

## 2026-09-27(4)

- ドキュメントのみ: `CONSTITUTION.md` / `AI_GUIDE.md` がGitHub上で2026-08-06以降一度も再アップロードされておらず、その間に作られていたヒットストップ・壁激突ダメージ・技の正式名称(ラッシュ/ブレイク/クラッシュ/メテオ/ライジング)等の仕様が抜け落ちていたことが判明(実コードは最新のため影響なし)。「他にもルールなどが消えてないかどうか確認できる？」「新しいの出して」との指摘・依頼を受け、以下の通り復元・再構成した。
  - `CONSTITUTION.md`: タイトルをゲーム名の現行表記(CLASH5 - CROSS DIMENSION)に修正し、第27〜30条(ヒットストップ/白い発光/壁激突ダメージ/技の正式名称と技名ポップ)を新設。2026-08-06〜復元時点の間に存在したはずの第27〜33条相当の原文は復元不能につき、その旨を明記する注記を追加。
  - `IMPLEMENTATION.md`: 冒頭に混入していた重複記述(第8節の内容が誤って先頭にも入っていた)を除去。第3節のダメージ数値の誤り(UPPER初撃5→7、メテオ合計50→67)を実コード(`DB.DMG`)に合わせて修正。新設第3.5節でラッシュ/ブレイク/クラッシュ/メテオ/ライジングおよびチャージ・ヒットストップ・白い発光を説明。
  - `ARCHITECTURE.md`: モジュール5・7の関数一覧に`spawnTechNamePop`/`drawTechNamePops`/`flashAttackerWhite`/`runFollowUpFlurry`/`runGuardPunchUpperWallStrike`/`runFinisher`等を追加、`state`プロパティ一覧にチャージ・技パターン関連を追加。
  - `TODO.md`: 復元できなかった期間の仕様を「不明点」として明記。
  - コード自体(`index.html` / `css/style.css` / `js/script.js`)への変更なし。

## 2026-09-27(3)

- ドキュメントのみ: `AI_GUIDE.md`のバージョン表記カウンター運用ルール(「バージョン表記の運用」の箇条書きと、末尾の「バージョン表記カウンター」節)が、VERSUS対応の作業中に失われていたのを復元した。「バージョン表記のルール消えてた？常に更新カウントしといてindex更新時にまとめてバージョン増やすというのは残したい」との指摘による。現在のバージョン(`ver. 0.9.116`)を基準に、保留中の更新回数は0から再開する。

## 2026-09-27(2)

- ローカル対戦(VERSUS)の背景・BGMを、STORY MODEでクリア済みのステージからのみ選ぶよう変更(1人も撃破していなければ1ST STAGE)。`vsAvailableStages`を追加。
- 不具合修正: EXTRA BATTLEでGald/Alvとして戦う時、プレイヤー側の表示倍率が敵として登場する時と異なっていた。`playerCharacterSetName`を追加し、`draw`の倍率判定に使用。

## 2026-09-27

- ローカル対戦(VERSUS)を追加(ver. 0.9.116)。
  - 追加: タイトルのVERSUSボタン、キャラ選択シーン(`#sceneVersusSelect`)、バトル画面の上半分(2P側、`#vsTop`)、中央HPゲージの2P向き表示、各自のUIを覆うゲート、上下別の決着表示
  - 追加: `js/script.js`末尾に「ローカル対戦(VERSUS)」節(`versusState`ほか)
  - 変更: 既存のバトル関数に`state.gameMode === 'versus'`の分岐(フック)を追加。通常モードの挙動は変更なし
  - 変更: `draw`内の技名ポップを`drawTechNamePops`に関数化、`drawComboCounter`に描画先contextの引数を追加(描画内容は変更なし)
  - 変更: タイトルのボタン縦位置の間隔を6.75%→5.8%に詰めてVERSUSを追加
  - style.cssのキャッシュ用クエリをv=116に更新

## 2026-08-05(4)

- `AI_GUIDE.md` を強化(長期・複数AI共同開発を前提としたルールを追加)。
  - 追加: 情報源が食い違う場合の優先順位(`CONSTITUTION.md` > 実コード > 他Markdown > 過去の会話履歴)
  - 追加: 「変更のスコープに関するルール」節(1変更1目的、バグ修正と仕様変更を混ぜない、無断リファクタリング禁止の明文化)
  - 修正: `TESTING.md`確認の記述を「AIが確認する」→「AIが該当項目を提示し、利用者が確認する」に訂正(AIはブラウザを実操作できないため)
  - コード自体への変更なし

## 2026-08-05(3)

- `js/script.js` を物理的には1ファイルのまま、`ARCHITECTURE.md` の8モジュール構成に合わせて論理分割(セクション見出しコメントの追加+関数の並べ替え)。
  - 変更対象: 関数宣言(98個)の配置のみ。関数の処理内容・実行順序(非関数の初期化コード)は一切変更なし。
  - 検証: 構文チェック(`node --check`)通過、括弧の対応数一致、変更前後で「コード行の集合」が完全一致(追加されたのはセクション見出しコメント9行のみ)であることをプログラム的に確認済み。
  - `ARCHITECTURE.md` の見出し名・出現順を `js/script.js` の実際のセクション順と完全一致させた。

## 2026-08-05(2)

- 保守性向上のためドキュメントを追加。
  - 追加: `ARCHITECTURE.md`(`js/script.js`内の関数マップ・`state`スキーマ)
  - 追加: `TESTING.md`(自動テストがないための手動確認チェックリスト)
  - 追加: `KNOWN_ISSUES.md`(実装済み機能の既知の不具合を記録する場所。現時点で報告なし)
  - 変更: `README.md` / `AI_GUIDE.md` に上記3ファイルへの参照を追加
  - コード自体への変更なし

## 2026-08-05

- ドキュメント構成を整備(共同開発を前提とした運用に対応)。
  - 追加: `README.md`, `CONSTITUTION.md`, `AI_GUIDE.md`, `ASSETS.md`, `TODO.md`, `CHANGELOG.md`
  - 変更: `IMPLEMENTATION.md` から未実装(TODO)節を分離し `TODO.md` へ移動
  - コード自体(`index.html` / `css/style.css` / `js/script.js`)への変更なし

## それ以前

- 単一HTMLファイルを `index.html` / `css/style.css` / `js/script.js` およびアセット用フォルダに分割。
- 画像アセットの読み込みパスをフォルダ構成に合わせて更新(`imgs`辞書のキー・描画ロジックは変更なし)。
