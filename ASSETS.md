# アセット一覧

命名規則(第22条): 拡張子は常に `.PNG`(大文字)、ファイル名部は小文字。

`imgs` 辞書のキーは常にここに記載した短いファイル名と一致させること。フォルダパスは読み込み(`src`)側にのみ付与する。詳細は [`AI_GUIDE.md`](./AI_GUIDE.md) を参照。

## 必須アセット(未配置の場合はエラーとして扱われる)

配置先: `assets/images/characters/`

| ファイル名 | 用途 |
|---|---|
| `player.PNG` | 待機(呼吸)表示 1 |
| `player2.PNG` | 待機(呼吸)表示 2 |
| `upper.PNG` | UPPER技モーション |
| `damage.PNG` | 被弾モーション |
| `knock.PNG` | メテオ演出(攻撃側1) |
| `knock2.PNG` | メテオ演出(攻撃側2) |
| `dash.PNG` | 踏み込み・帰還・残像 |
| `punch.PNG` | PUNCH技モーション/しびれ姿勢 |
| `punch2.PNG` | 空中コンボ連続パンチ用の交互モーション |
| `guard.PNG` | GUARD技モーション |
| `down.PNG` | 決着(倒れ)モーション |
| `piyo.PNG` | しびれ演出の頭上アイコン |

## 任意アセット(未配置でもエラーにならず、フォールバック表示に切り替わる)

| ファイル名 | 配置先 | 用途 | 未配置時のフォールバック |
|---|---|---|---|
| `enemy_player.PNG` 〜 `enemy_down.PNG`(上記必須アセットのうち `piyo.PNG` を除く11種に `enemy_` を付けたもの) | `assets/images/characters_enemy/` | 敵専用スプライト(全敵共通の1セット) | 対応するプレイヤー画像を使用 |
| `bg.PNG` | `assets/images/backgrounds/` | バトル背景 | 水色の塗りつぶし |
| `logo.PNG` | `assets/images/logo/` | ロゴシーンの画像 | テキスト表示(「BORN MAGAZINE / presents」) |
| `title_logo.PNG` | `assets/images/logo/` | タイトル画面のロゴ | テキスト表示(「コマンドバトル」) |
| `card_P.PNG` / `card_U.PNG` / `card_G.PNG` | `assets/images/cards/` | カード表面(PUNCH/UPPER/GUARD) | 文字表示(P/U/G) |
| `card_back.PNG` | `assets/images/cards/` | カード裏面(配布演出時) | 縞模様のCSS表示 |
| `op_1.PNG` 〜 `op_4.PNG` | `assets/images/cutscenes/opening/` | プロローグ4画面分の画像 | プレースホルダー表示(「(未配置)」の文字) |
| `story_1.PNG` 〜 `story_3.PNG` | `assets/images/cutscenes/story/` | ストーリーシーン3画面分の画像 | プレースホルダー表示(「(未配置)」の文字) |
| `story_title_1.PNG` 〜 `story_title_5.PNG`(APNG可) | `assets/images/cutscenes/story/` | 章タイトル。NEW GAME開始時と、1〜4人目を倒した後のストーリーの前に、黒い画面の中央に出す。自動では進まず、タップで次へ(1.5秒後に「▼」を出す)。フェードインして止まる(ループしない)APNGを想定(2026-10-02) | 文字で「STORY n / 章の名前」(`STORY_CHAPTER_TITLES`) |
| `substory_title_1.PNG` 〜 `substory_title_5.PNG`(APNG可) | `assets/images/cutscenes/substory/` | SUB STORYを読み始める時のタイトル(1=Noah〜5=Alv)。見せ方は章タイトルと同じ(2026-10-02) | 文字で「SUB STORY n / タイトル」 |
| `jingle_story.mp3` | `assets/audio/bgm/` | タイトルカード(STORY章タイトル・SUB STORYタイトル共通)が出た時に1回だけ鳴らすジングル(その後はタップまで無音)。タップした時に鳴り残っていればフェードアウトする(2026-10-02) | 鳴らさない(無音。前の曲はカードが出る時に止める) |
| `bgm_battle_win.mp3` / `bgm_battle_lose.mp3` | `assets/audio/bgm/` | 決着後(RESULT中)の曲。YOU WINのSE(`se_win`)・K.O.のSE(`se_ko`)が鳴り終わってから流し、ループする。勝ち=STORY・EXTRA BATTLE・BATTLE RUSHクリア(LOCAL V.S.の決着後は勝ち負けの曲ではなく`bgm_title`をSEの後に流す)、負け=STORY・EXTRA BATTLEのK.O.・BATTLE RUSHで倒れた時。SOUND TESTにも追加(2026-10-02) | 鳴らさない(無音。バトルの曲は決着の時点で止める) |
| `substory_end_1.PNG` 〜 `substory_end_5.PNG`(APNG可) | `assets/images/cutscenes/substory/` | EXTRA BATTLE後の「SUB STORY / キャラ名 / END」の代わりに出す画像(1=Noah〜5=Alv)。表示時間は`SUBSTORY_END_TIMING`(2026-10-02) | 従来どおり文字で表示 |
| (APNGについて) | | カットシーンの画像(`op_*` / `story_*` / `substory_*`)は、同じファイル名のままAPNG(アニメーションPNG)に差し替えても動く。章タイトルとSUB STORY ENDは、表示のたびに必ず最初から再生される | |

## 未使用・予約フォルダ

| フォルダ | 用途 | 状態 |
|---|---|---|
| `assets/fonts/` | 独自フォント | コードから未参照(現状は既定のsans-serifを使用) |

## 推奨解像度

- キャラクター系スプライト(必須アセット・敵専用スプライト共通): 32×32px(ソース解像度)。canvas上では10倍(320×320px)に拡大描画される。
- 背景(`bg.PNG`): 96×56px(canvas解像度960×560pxをキャラと同じ拡大率10倍で割った値)。
