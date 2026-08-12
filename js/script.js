/** 
 * 【憲法二十六条：全文】
 * 1. 5枠設計: 画面下部に最初から5つの空枠を固定表示し、手札のカードをタップするたびに先頭から順に空枠を埋めていく仕様。手札は21枚のデッキ(内訳は事前のデッキ編成画面で自由配分)から5枚を引いて構成し、ターンで使った枚数分だけ山から補充するが、山の残数を超えては補充しない(枠が空いたままになる場合がある)。手札・山が共に尽きた時のみ、DECK表示の点滅→「Refresh」表示→0からのカウントアップ演出とともに捨札を山へリシャッフルする(配分比率は変化しない)。ただしTRAINING MODEは例外とし、デッキという概念自体を持たない。手札はPUNCH/UPPER/GUARDを1枚ずつ固定した3枚のみで、タップしても手札からは取り除かれず何度でも選び直せる(選び放題)。5枠の場自体はSTORY MODEと同様に機能する。
 * 2. 敵コマンド非公開: プレイヤーが出した枚数だけ、その場で敵の手をランダム生成する。中身は伏せ札(?)で表示し、各攻防が始まる直前に1枚ずつ公開する(先読み不可・都度の読み合い)。
 * 3. 3すくみ: [PUNCH>UPPER][UPPER>GUARD][GUARD>PUNCH] の判定ロジック。勝敗は毎回この判定で決定する。同じ手同士がぶつかった場合は相討ちとする。
 * 4. 空中コンボ: 勝者の技がUPPERだった場合に発動。攻撃側の次の入力がPUNCHなら継続し、最大3発まで空中パンチを受け付ける。空中パンチは連続でヒットするほどダメージが増加する(1発目=基本値、2発目以降+増加量)。3発目は自動的にメテオへ変換される。UPPERで浮かせる際は、地面(または現在の高さ)から浮遊高さまでアニメーションで上昇させる(固定ステップ数・固定時間)。PUNCH+PUNCH+UPPER: 直前2連続の地上PUNCH勝利にUPPERの勝利が続いた場合(同一ターン内・同じ側のみ。相討ちやガードされる等で連続記録が途切れた場合はリセットされる)、そのUPPERは通常の2倍の高さまで打ち上げ、上昇距離が2倍になる分、同じ所要時間でより速く到達する(体感速度も2倍)。ダメージもUPPER初撃分が2倍になる。ただし空中コンボが続く場合は、通常の空中コンボと同じ高さで行う。1発目の追撃までに間に合うよう、通常より速い速度で通常の高さ(FLOAT_Y/AIR_FOLLOW_Y)まで降下させ、以降のコンボ継続時の追従位置は通常時と同じになる。上昇中は、通常のUPPERとの違いを強調するため、攻撃側(upper.PNGの姿勢)・被弾側(damage.PNGの姿勢)それぞれの残像を残す(通常のUPPERでは残像は発生しない)。コンボが継続せず着地する場合は、通常時と同様に固定ステップ数・固定時間でアニメーションさせるため、高い位置からでも間延びしない(距離が長い分、自然と速く見える)。
 * 5. 着地同期: 通常コンボ終了時（メテオに至らない場合）は、攻守双方が地面(GROUND_Y)へ着地してから次の演出へ遷移する。
 * 6. 通常コンボ終了時の演出: 攻撃側は必ずdash.PNGへ、被弾側はdamage.PNGのまま着地させる。
 * 7. 画像状態管理: 待機中は必ず player.PNG / player2.PNG の呼吸(idle)へ復帰する。idle.PNGという単独ファイルは存在しない。
 * 8. ダメージ計算: PUNCH勝利(基本10、地上での連続ヒットは1発目=基本値・2発目=+5・3発目=+10の3発周期で、4発目は1発目の基本値に戻ってこの周期を繰り返す。ガード等で止められる、または相手に勝敗が決するとこの周期はリセットされ、次に地上PUNCHで勝った時は1発目の基本値から再開する。この連続ヒット記録はターンをまたいでも持ち越さず、ターン終了時に必ずリセットされる。威力が増していく演出として、負けた側の位置も周期に連動する: 1発目は追加の後退なし、2発目は後退位置(RETREAT_X)まで後退、3発目はホームポジション(HOME_X)まで大きく後退し、4発目は1発目と同様に追加の後退なしに戻る)、UPPER初撃(5)、空中パンチ連続ヒット加算(2発目以降+5)、メテオ(50)、相討ち(3)。三すくみに負けた側のみ振動(shake)する。ダメージを受けた側は、量の大小にかかわらず必ず一瞬点滅する(applyDamage内で共通処理)。同じ手同士の相討ちの場合は双方が微ダメージを受けて振動し、反動で一歩下がる。GUARDが勝った場合(相手のPUNCHを防いだ場合)、勝った側は極小ダメージで振動し、負けた側はダメージなしだがしびれ、次のコマンドの成功率が1/2になる(どちらの側がガードしても発生する)。しびれは「固定ダメージを受ける」仕様ではなく、次の攻防で1/2の確率で無条件敗北する仕様である。ブロックされた瞬間、負けた側はまず自身が出していた技の姿勢(通常はpunch.PNGのまま)で振動し、直後にdamage.PNGへ切り替わって頭上にpiyo.PNGが反転を繰り返す「ピヨり」演出が始まる。このピヨりは固定時間の演出ではなく、次の攻防の結果が決まる瞬間まで継続する。ピヨり中は、通常なら双方が第24条の通りdash.PNGで移動する場面(攻防後の後退、次の攻防前の踏み込み)であっても、ピヨり側は次のコマンドが始まるまでその場に留まり続け、dashで動かない(相手側のみ通常通り移動する)。次の攻防が始まり判定が行われる瞬間、ピヨりは終了する。その時点で1/2の確率が外れた場合はしびれが解消され、3すくみ判定による通常の攻防がそのまま行われる。1/2の確率が的中した場合は無条件敗北となり、しびれた側はdamage.PNGのまま点滅を強めた後、相手が実際に出していた技の種類(PUNCH/UPPER/GUARD)に応じた通常の勝敗処理(空中コンボやガード成功も含む)が3すくみ判定なしで適用される。この無条件敗北によってGUARD成功の処理が適用される場合、しびれた側は実際に出していた技に関わらずdamage.PNGの姿勢になり(通常のGUARD成功時の「負けた側は自身の技の姿勢のまま」という表現は、実際にその技を出して負けた場合のみに限定される)、この時新たにしびれが発生すればピヨりも再び開始する(しびれの連鎖)。しびれはターンをまたいで持ち越さない仕様とし、そのターン中に消費されなかった場合はターン終了時に必ず解消される。ガード+ガード(チャージ): 同一ターン内でガード成功が2回連続すると、成功させた側の体が金色に発光し、次に出すカードの攻撃力が2倍になる。ガード成功がさらに3回連続以降となった場合は、チャージが消費されないままカウントだけが伸び、倍率が4倍(上限)に格上げされる(4倍時は金色の発光の外側に白いオーラがもう一段重なり、二重の輪として2倍と明確に区別できるようにする)。チャージは、ガード成功以外の結果(PUNCH/UPPER勝利・負け・相討ち)で次に出すカードが決着した時点で、勝敗に関わらず(勝っても負けても)消費される一度限りの効果であり、ガード成功時の自己反動ダメージ(TINY)には適用されない。ガード成功の連続カウントは同一ターン内のみ有効で、ターンが変わるとリセットされる。ただし発光と倍率効果そのもの(チャージ状態)はしびれ・ピヨりとは異なりターンをまたいで持ち越され、消費されるまで発光し続ける。PUNCH+GUARD+PUNCH(追撃): 手札のどの位置であっても、PUNCH,GUARD,PUNCHの3枚が連続して出され、いずれも勝利した場合(相打ちは不可)、3枚目の直後に追撃が発生する。追撃はpunch.PNGとpunch2.PNGを素早く切り替えながら3連打し、3すくみ判定を行わずヒット確定で命中する。1発ごとに通常のPUNCH勝利初撃と同じダメージを与える(合計で通常の3倍、チャージ等の倍率の影響は受けない)。GUARD+PUNCH+GUARD+PUNCH+PUNCH(必殺技): 手札の1〜5枚目がこの並びで、1〜4枚目が勝利または相打ちだった場合(1枚でも敗北すると不成立)、5枚目のPUNCHは3すくみ判定を行わずヒット確定の必殺技に変化する。固定ダメージ(50、チャージ等の倍率の影響を受けない)を与え、被弾側をdamage.PNGのまま画面端まで吹き飛ばし、端に到達すると点滅した後knock2.PNGになり、通常のターン終了処理で定位置へ戻る。この必殺技でK.O.した場合は、画面端でdown.PNGのまま倒れ、通常の決着演出(ホームポジションへ戻ってからのバウンド)は行わない。この5枚の並びには2〜4枚目にPUNCH,GUARD,PUNCHが含まれるが、この場合は追撃技としては判定されない(必殺技の判定が優先され、追撃はキャンセルされる)。
 * 9. 座標復帰: ターン(5枠)全体の処理が完了した時点で、finally句にて必ずホームポジションへ dash.PNG の残像付きで帰還することを保証する。ただし体力が0になる最後の一撃を受けた場合は、この通常帰還処理の代わりに専用の決着演出（damage.PNGで点滅→スローに軽くバウンドしながら初期位置へ戻る→down.PNGで倒れる→K.O./YOU WIN表示）を実行する。
 * 10. 描画品質: imageSmoothingEnabled=false を維持しドット絵品質を担保。背景(bg.PNG)もキャラと同じcanvas上に同一の拡大率(SCALE)で描画し、ピクセルのズレを起こさない。背景画像の実サイズがcanvas比率(960:560)と異なる場合(例: 正方形で作られた画像)は、横幅いっぱいを使い、必要な高さぶんだけ画像の上側から切り取って描画する(下側は切り捨てる)。プロローグ・ストーリー・エンディングの画像(cine-img)についても同様に、指定サイズの画像を上側から切り取って表示する。
 * 11. モバイル対応: Flexboxとviewport固定によるレスポンシブ最適化。UI全体はappRootコンテナで正方形(1:1)に収め、画面中央に配置する。
 * 12. 描画資産の不変性: 外部ファイルを厳格に読み込み、存在しない場合は読み込みエラーを即座に特定する。ただし敵専用グラフィック(enemy_〇〇.PNG)と背景(bg.PNG)は任意の差し替え用アセットであり、存在しなくてもエラー扱いにせず、敵はプレイヤー画像へ、背景は水色の塗りつぶしへフォールバックする。背景はステージ(STORY MODEの対戦相手)ごとに個別の画像を持てる。bg.PNGは1体目(ENEMY_01)の背景を兼ね、2〜5体目はbg_2.PNG〜bg_5.PNG、TRAINING MODEはbg_training.PNGを使う。これらが未用意/読み込み失敗の場合は、1体目のbg.PNGへフォールバックする(bg.PNG自体が読み込めない場合のみ、上記の水色塗りつぶしになる)。
 * 13. オブジェクトの生存維持: 状態管理オブジェクト(state, imgs)は決して再定義・初期化せず、常に参照し続ける。
 * 14. 憲法完全表記: コード提示の際、本憲法リストを一切省略せず必ず全条文を記述する。
 * 15. UI永続性: HP・TURN表示は画面上部に固定し、スロットは下部に永続表示する。画面はロゴ(BORN MAGAZINE presents)→プロローグ→タイトル→(STORY MODEのみ)ストーリーシーン→デッキ編成(21枚固定・内訳自由)→バトル→決着(K.O./YOU WIN)、の順で遷移する。ストーリーシーンはプロローグと同じ仕組み(画像+1文字ずつのテキストを1ブロックにまとめ中央配置、1画面目のみフェードイン)で、敵ごとに用意されたstory_{敵番号}_1〜3.PNGの3画面を再生し、タイトルからSTORY MODEを選んだ時、またはRETRYした時に表示される(CONTINUEでは再生しない)。オープニング(プロローグ)とは異なり自動送りはせず、1画面ごとに画面タップで次へ進む(戦う前の会話が相手の癖を読み取るヒントになるため、プレイヤーが自分のペースで読めるようにしている。SKIPボタンは今まで通り利用できる)。3画面すべて読み終えるとデッキ編成へ遷移する。STORY MODEの敵はENEMY_01〜05の5体で固定し(裏ボス等の追加は将来的に想定するが、現時点では5体固定)、勝利のたびに次の敵へ進む。TRAINING MODEはデッキ編成画面を経由せず、タイトルから直接バトルへ入る(デッキという概念自体を持たないため)。決着画面ではCONTINUE(K.O.時)またはNEXT BATTLE(YOU WIN時)と、タイトルへ戻る(ロゴシーンへ)の2つのボタンを提供する。STORY MODEで被ダメージ0のまま勝利した場合(最終戦のエンディング分岐時も含む)、YOU WINの文字の上に、同程度の大きさ・金色の「PERFECT !」を追加表示する(K.O.時、TRAINING MODE、被弾ありの勝利では表示しない)。K.O.(敗北)時は「CONTINUE」表記で直前のデッキ編成へ(同じ敵と再戦)、YOU WIN(勝利)時は「NEXT BATTLE」表記で次の敵へ進めてからその敵のストーリーシーン(3画面)を経てデッキ編成へ遷移する。ただし5体目(最終)の敵をYOU WINで倒した場合は例外とし、NEXT BATTLE/タイトルへ戻るのボタンは表示せず、YOU WINの表示を5秒間見せた後、自動的にエンディング(プロローグ/ストーリーと同じ仕組みの画像+1文字ずつのテキストで5画面、ending_1〜5.PNG)→フェードアウトで暗転→エンドロール(下から上へスクロールするクレジット表示)→FIN.(真っ黒な画面の中央に白い太文字、10秒表示後にゆっくりフェードアウト)の順に演出を行い、最後に自動的にタイトルへ戻る。この一連の流れの間、敵の進行状況(storyEnemyIndex)は5体目のまま更新しない(advanceToNextEnemyを呼ばない)ため、タイトルのCONTINUEは5体目の敵と戦う前の状態から再開される。ロゴシーンはフェードイン→2秒表示→フェードアウトの後、自動でプロローグへ遷移する。プロローグは画像とテキストを1ブロックにまとめて画面中央に配置し、シネマサイズの画像(op_1〜4.PNG)と1文字ずつ表示されるテキストを4画面分再生する(1画面目のみブロック全体がフェードインする)。SKIPしなくても4画面終了後は自動でタイトルへ遷移する。バトル開始時は暗転→味方/敵のフェードイン→背景(bg.PNG)がcanvas上で中心から円形に拡大表示→「BATTLE START」が左からディゾルブで入り中央で静止した後、拡大しながら消える演出を経て、手札が裏向きで配られてから左から順にめくられ、その後操作可能になる(この配布演出はバトル開始時のみで、以降の補充では行わない)。タイトル画面にはSTORY MODE/TRAINING MODEの下にOPTIONを設置し、サウンドON/OFF(BGM/SEの再生有無に連動する。BGMはシーン遷移のたびに切り替わり、Web Audio APIでシームレスループ再生する。ファイル未配置の場合は無音のままエラーにはしない)・BGM音量/SE音量(それぞれ個別のスライダーで0〜100%に調整でき、Web Audio APIのゲインノードで即座に反映される。BGMは既定で50%、SEは既定で100%とし、SEが聞き取りやすいようBGMを控えめにしている)・STORY MODEの進行状況(倒した敵の人数)のリセット・隠しアイテムの図鑑(今後実装予定、取得済みアイテムがある場合のみ表示)を提供する。BGMの割り当ては、オープニング(プロローグ)=bgm_prologue、ストーリーシーン(全敵共通)=bgm_story、TRAINING MODEのバトル=bgm_battle、STORY MODEのバトルはステージ(敵)ごとに個別のBGM(bgm_battle_1〜5)を持ち、該当ファイルが未配置の場合は汎用のbgm_battleへフォールバックする。YOU WIN(勝利)=bgm_victory、エンディング=bgm_ending、K.O.(敗北)時は専用BGMを設けずBGMを停止する。タイトル画面のCONTINUEは、セーブデータが存在するだけでは表示されず、実際に敵2体目以降まで到達した記録(セーブデータのstoryEnemyIndexが1以上)がある場合のみ表示される。NEW GAMEを選んだ場合、今回のプレイのstoryEnemyIndexは0から始まるが、セーブデータ側のstoryEnemyIndexは即座には上書きされない(誤ってNEW GAMEを選んでしまっても、既存の進行状況は消えず、次に勝利してadvanceToNextEnemyが呼ばれるまで保持される)。OPTION画面の「進行状況(セーブデータ)のリセット」を実行した場合のみ、セーブデータのstoryEnemyIndexが0に戻り、タイトルのCONTINUEも即座に消える(隠しアイテムの図鑑等のリセットは別途用意する想定で、この「進行状況(セーブデータ)のリセット」とは別軸)。STORY MODEの進行状況(現在の敵)とデッキ編成は、localStorageを用いて端末に保存され、次回起動時に自動で復元される。実績システム(今後も追加していく前提の汎用的な仕組み)として、以下を用意する。いずれも解除状況はlocalStorageに永続保存され、次回起動時も解除済みのまま残る。(1)隠しタップ→サブストーリー→コスチュームの連鎖: 各敵のストーリーシーン3画面のうち1枚(敵ごとに異なる画面に割り当てる。現時点では仮の割り当てで、画像が揃い次第調整予定)の、画像エリア左上20%×20%の透明な領域をタップすると、現在再生中の敵に対応するサブストーリーが解除される(5体分、それぞれ個別に解除される)。それ以外の2画面ではこの隠しタップは無効(押せない)。解除済みのサブストーリーは、タイトルOPTION画面の「SUB STORY」(1つ以上解除済みの場合のみ表示)から一覧・閲覧できる。さらに、そのサブストーリーを実際に開いて読む(体験する)と、その時点で対応する敵のコスチューム(見た目)が解除される(既存の敵専用グラフィックのセット、assets/images/characters_enemy/enemy_1〜5/を、プレイヤー自身の見た目として流用する)。解除済みのコスチュームは、タイトルOPTION画面の「COSTUME」(1つ以上解除済みの場合のみ表示)から選択でき、選択中のコスチュームはバトル中のプレイヤー側の描画すべてに反映される。(2)必殺技コンプ: PUNCH+PUNCH+UPPER・ガード+ガード(チャージ)・PUNCH+GUARD+PUNCH(追撃)・GUARD+PUNCH+GUARD+PUNCH+PUNCH(必殺技)の4種類を、これまでの対戦を通じて(バトルをまたいで積み上げ)1回ずつでも使用すると、SOUND TESTが解除される(タイトルOPTION画面の「SOUND TEST」、解除済みの場合のみ表示。実音声ファイル未配置の項目は再生時に何も鳴らないだけで、エラーにはしない)。
 * 16. 位置保持: 攻防のたびに初期位置へ戻るのではなく、中央で衝突→軽く距離を取る、を繰り返す。ホームポジションへ戻るのはターン完了時のみ。
 * 17. 体力ゲージ演出: ダメージ発生時、現在値が即座に減り、黄色いバーが0.6秒遅れて減少する。
 * 18. TURN表示仕様: 画面上部中央に「TURN」と「数字」を2行で太字(900)表示する。
 * 19. 敵反転描画: 敵画像は常に左右反転して表示する。敵(STORY MODEの対戦相手、またはTRAINING MODE)ごとに専用のグラフィックセット(assets/images/characters_enemy/enemy_1〜5/、training/)を用意でき、用意されていれば自動的にそちらを優先して使用し、未用意の場合はプレイヤーと同じ画像にフォールバックする。
 * 20. 敵の主体性: 敵はデッキ編成を持たずプリセット/ランダムの手で応戦するが、プレイヤーと同じ枚数だけ必ず行動する。ただしTRAINING MODEは例外とし、プレイヤーが実際に場に出した手それぞれに対して、必ず負ける手(PUNCHにはUPPER、UPPERにはGUARD、GUARDにはPUNCH)を1枚ずつ生成する。この生成はプレイヤーがGO!を押した時点(手が確定した後)に行われ、確定と同時に公開される。
 * 21. パンチコンボ演出: 連続するパンチは punch.PNG と punch2.PNG を交互に使用する。地上の通常ヒット(3すくみでPUNCHが連続して勝つ場合)・空中コンボ中の連続パンチのいずれも対象とし、両者は同じ交互カウンターを共有する(ターンをまたいでも交互は継続し、途切れない)。
 * 22. 厳格命名規則: 全アセットの拡張子は常に「.PNG」（大文字）で統一する。ファイル名部は小文字。
 * 23. 動作保証: 画像読み込み完了を待ってからゲームループを開始し、UIインタラクションを確定させる。
 * 24. 対面踏み込みの原則: 技を出す前に必ず双方が残像(afterimage)付きの dash.PNG で画面中央へ踏み込み、衝突地点で技を出し合う。
 * 25. 厳格不可逆の原則: いかなる理由があろうとも、憲法の簡略化、および条文の意図的な省略・解釈の矮小化を禁止する。すべてを等しく実装すること。
 * 26. アーケード配置原則: UIは上部に時計回避余白を、下部にメニュー回避余白を確保し、左に攻撃、右に機能ボタンを配置する。
 */

// ============================================================
// 設定・状態管理(DB / state / imgs / trails / cardOutcomes / deckCounts / unlockedItems / 各種初期化処理)
// ============================================================

// 第22条: ファイル名は小文字、拡張子は常に大文字 .PNG
const DB = {
    ASSETS: ['player.PNG', 'player2.PNG', 'upper.PNG', 'damage.PNG', 'knock.PNG', 'knock2.PNG', 'dash.PNG', 'punch.PNG', 'punch2.PNG', 'guard.PNG', 'down.PNG', 'piyo.PNG'],
    SRC_PX: 32,   // キャラのソース解像度(32×32px)
    SCALE: 10,    // ソース1pxをcanvas上で何ユニットに拡大するか(キリのいい整数倍で崩れを防ぐ)
    POS: {
        CENTER_X: 480,      // 戦う位置は常に画面中心
        HOME_HALF: 260,     // 中心からホームポジションまでの距離（両者同一）
        ATTACK_HALF: 100,   // 中心から攻防の接触位置までの距離（両者同一）
        RETREAT_HALF: 200,  // 攻防のあと軽く距離を取る位置（ホームまでは戻らない）
        GROUND_MARGIN_PX: 3 // 地面バンドの高さ(ソースpx換算。キャラ下部3px想定)
    },
    DMG: { P: 10, U: 5, M: 50, CLASH: 3, TINY: 1, P_COMBO_STEP: 5, FINISHER: 50 }, // P:パンチ勝利 / U:アッパー初撃 / M:メテオ / CLASH:相討ち微ダメージ / TINY:ガードされたパンチの反撃 / P_COMBO_STEP:空中パンチ連続ヒットの増加量 / FINISHER:GUARD+PUNCH+GUARD+PUNCH+PUNCH成立時の必殺技(チャージ等の影響を受けない固定値)
    MAX_AIR_PUNCH: 3,
    BREATH_MS: 500, // player.PNG / player2.PNG の呼吸切替間隔
    DECK_TOTAL: 21 // デッキ合計枚数(内訳は編成画面で自由配分)
};
DB.IMG_SIZE = DB.SRC_PX * DB.SCALE; // 32×10=320。ソースpxとcanvasユニットの対応が常に整数になる
// 地面バンド(3px)ぶんの余白を残して、キャラの足元が浮かないギリギリの高さにGROUND_Yを置く
DB.POS.GROUND_Y = 560 - DB.IMG_SIZE - (DB.POS.GROUND_MARGIN_PX * DB.SCALE); // 560 - 320 - 30 = 210
DB.POS.FLOAT_Y = DB.POS.GROUND_Y - 200; // 被弾側がふわっと浮く高さ
DB.POS.HOP_Y = DB.POS.GROUND_Y - Math.round((DB.POS.GROUND_Y - DB.POS.FLOAT_Y) / 3); // 打つ方の初撃の小ホップ(1/3)
DB.POS.AIR_FOLLOW_Y = DB.POS.FLOAT_Y + 20; // コンボ継続中、打つ方が追従して浮く高さ
// PUNCH+PUNCH+UPPER(直前2連続の地上PUNCH勝利に続くUPPER): 2倍の高さまで打ち上げる(初撃のみ)
DB.POS.SUPER_FLOAT_Y = DB.POS.GROUND_Y - 400;
DB.POS.SUPER_HOP_Y = DB.POS.GROUND_Y - Math.round((DB.POS.GROUND_Y - DB.POS.SUPER_FLOAT_Y) / 3);
DB.POS.P_HOME_X = DB.POS.CENTER_X - DB.POS.HOME_HALF - DB.IMG_SIZE / 2;
DB.POS.E_HOME_X = DB.POS.CENTER_X + DB.POS.HOME_HALF - DB.IMG_SIZE / 2;
DB.POS.P_ATTACK_X = DB.POS.CENTER_X - DB.POS.ATTACK_HALF - DB.IMG_SIZE / 2;
DB.POS.E_ATTACK_X = DB.POS.CENTER_X + DB.POS.ATTACK_HALF - DB.IMG_SIZE / 2;
DB.POS.P_RETREAT_X = DB.POS.CENTER_X - DB.POS.RETREAT_HALF - DB.IMG_SIZE / 2;
DB.POS.E_RETREAT_X = DB.POS.CENTER_X + DB.POS.RETREAT_HALF - DB.IMG_SIZE / 2;
// 必殺技(GUARD+PUNCH+GUARD+PUNCH+PUNCH)で吹き飛ばす先の画面端座標
DB.POS.EDGE_P_X = 10;
DB.POS.EDGE_E_X = 960 - DB.IMG_SIZE - 10;
// 背景アート推奨解像度: canvas(960×560)をSCALEで割った値 = 96×56px。1px=キャラの1pxと完全に一致する。
DB.BG_SRC_W = 960 / DB.SCALE; // 96
DB.BG_SRC_H = 560 / DB.SCALE; // 56

// 第13条: この state オブジェクトは以後、再定義・再初期化しない。常にプロパティを書き換えて参照し続ける。
let state = {
    pY: DB.POS.GROUND_Y, eY: DB.POS.GROUND_Y,
    pX: DB.POS.P_HOME_X, eX: DB.POS.E_HOME_X,
    hpP: 100, hpE: 100,
    turn: 0,
    hands: new Array(5).fill(null), enemyHands: [],
    pAct: 'IDLE', eAct: 'IDLE', // 'IDLE' は player.PNG / player2.PNG の呼吸表現を意味するマーカー
    pShakeUntil: 0, eShakeUntil: 0,
    pBlinkUntil: 0, eBlinkUntil: 0,
    pLastAtk: null, eLastAtk: null,
    pNumbed: false, eNumbed: false, // しびれフラグ: 次のコマンドの成功率が1/2になる(ガード成功で相手に付与)
    piyoSide: null, // ピヨり演出: どちら側の頭上に出すか(truthyな間、継続して表示される)
    pPunchStreak: 0, ePunchStreak: 0, // 地上パンチの連続ヒット数(コンボではなく、単発同士の連続成功を記録)
    pGuardStreak: 0, eGuardStreak: 0, // ガード成功の連続回数(同一ターン内のみ。2回で2倍・3回以降は4倍が上限。ターン終了時にリセット)
    pChargeValue: 0, eChargeValue: 0, // チャージの倍率(0=無し、2、4)。ガード成功以外の次のカードで勝敗に関わらず消費される。ターンをまたいで持ち越す
    pComboType: null, eComboType: null, // このターンの手札パターン('followup'=PUNCH+GUARD+PUNCH, 'finisher'=GUARD+PUNCH+GUARD+PUNCH+PUNCH, null=該当なし)。ターン開始時に手札から判定する
    pComboStart: -1, eComboStart: -1, // followup該当時、手札内でPUNCH+GUARD+PUNCHが始まる位置(0始まり)。finisherは常に0固定
    pComboAlive: false, eComboAlive: false, // 対応する各攻防が要件(勝ち、または必殺技は勝ちか相打ち)を満たし続けているか。1つでも要件を満たさなければfalseになりコンボは不成立になる
    lastExchangeResult: null, // 直近の攻防結果 { P: 'win'|'lose'|'draw', E: 'win'|'lose'|'draw' }。resolveExchange/runFinisherが設定し、resolveTurnがコンボ判定に使う
    finisherAlreadyDown: false, // 必殺技でK.O.した場合、画面端でdown.PNGのまま倒れる(通常のホーム帰還演出をスキップする合図)
    pGuardHoldPose: false, eGuardHoldPose: false, // 相手がしびれている間、ガード成功側の構えを維持するフラグ
    gameMode: 'story', pendingMode: 'story', // 'story' | 'training'
    storyEnemyIndex: 0, // STORY MODE: ENEMY_ORDER内の現在の敵の位置(連戦で進んでいく想定。セーブデータから復元される)
    soundOn: true, // OPTION画面のサウンドON/OFF。BGM/SEの再生有無に連動する
    bgmVolume: 0.5, // BGM音量(0〜1)。SEを聴き取りやすくするため既定を控えめにしている
    seVolume: 1.0, // SE音量(0〜1)
    introCharAlpha: 1, // バトル開始演出: 味方/敵のフェードイン係数(0〜1)
    bgRevealRadius: 0, // バトル開始演出: 背景を中心から広げる円形クリップの半径(0で真っ暗)
    playerDeck: [], playerDiscard: [], playerHand: new Array(5).fill(null), // 山札/捨札/手札
    enemyRevealedUpTo: 0, // 敵の手のうち、何枚目まで公開済みか
    battleReady: false, // バトル開始演出が完了し、操作可能になったか
    resolving: false
};
let trails = []; // 第24条: dash.PNGの残像
let cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) }; // ターン中の各カードの勝敗表現(card-lose/card-shatter)。ターン終了(両者が定位置へ戻り、場のカードが消えた後)にリセットする
let deckCounts = { PUNCH: 7, UPPER: 7, GUARD: 7 }; // デッキ編成(合計21枚、内訳は自由)
let unlockedItems = []; // 隠しアイテム(今後実装予定)。取得済みアイテムIDを貯めていく想定

// ------- 実績システム(汎用・今後も追加していく前提) -------
// 解除状況はすべてlocalStorageに永続保存し、ブラウザを閉じても解除済みのまま残る。
let unlockedSubStories = []; // 解除済みサブストーリーのenemyIndex(0〜4)の配列
let unlockedSkins = []; // 解除済みコスチュームのセット名('enemy_1'〜'enemy_5')の配列
let soundTestUnlocked = false; // SOUND TESTが解除済みか
let specialsUsed = { superUpper: false, charge: false, followUp: false, finisher: false }; // 4種の必殺技それぞれを、これまでの対戦を通じて1回でも使ったか(バトルをまたいで積み上げ)
let selectedSkin = null; // 現在選択中のコスチューム('enemy_1'等、nullはデフォルトのプレイヤー見た目)

// 各敵のストーリーシーン内に仕込む隠しタップで解除する、サブストーリーの仮テキスト(画像は今後配置予定、未配置ならプレースホルダー表示)
// 隠しタップの対象画面(ストーリーシーン3画面のうち何枚目か、0始まり)。敵ごとにバラバラの画面に仕込む。
// 3枚すべてではなく、対応する1枚の時だけ#storyHiddenTapを有効にする。仮の割り当てで、正確な位置・対象画面は画像が揃い次第調整する。
const STORY_HIDDEN_TAP_SCREEN_BY_ENEMY = {
    ENEMY_01: 1, // 2枚目
    ENEMY_02: 0, // 1枚目
    ENEMY_03: 2, // 3枚目
    ENEMY_04: 1, // 2枚目
    ENEMY_05: 0, // 1枚目
};

// 各敵のストーリーシーン内に仕込む隠しタップで解除する、サブストーリーの仮テキスト(画像は今後配置予定、未配置ならプレースホルダー表示)。
// 本編のストーリーシーンと同じく、3枚の画像+テキストで展開する。
const SUBSTORY_BY_ENEMY = {
    ENEMY_01: {
        title: '敵01(仮)の裏話',
        screens: [
            { img: 'substory_1_1.PNG', text: '（仮テキスト・敵01 裏話 1/3）誰にも言えない、敵01(仮)だけの秘密の物語がここに……' },
            { img: 'substory_1_2.PNG', text: '（仮テキスト・敵01 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_1_3.PNG', text: '（仮テキスト・敵01 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
    ENEMY_02: {
        title: '敵02(仮)の裏話',
        screens: [
            { img: 'substory_2_1.PNG', text: '（仮テキスト・敵02 裏話 1/3）誰にも言えない、敵02(仮)だけの秘密の物語がここに……' },
            { img: 'substory_2_2.PNG', text: '（仮テキスト・敵02 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_2_3.PNG', text: '（仮テキスト・敵02 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
    ENEMY_03: {
        title: '敵03(仮)の裏話',
        screens: [
            { img: 'substory_3_1.PNG', text: '（仮テキスト・敵03 裏話 1/3）誰にも言えない、敵03(仮)だけの秘密の物語がここに……' },
            { img: 'substory_3_2.PNG', text: '（仮テキスト・敵03 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_3_3.PNG', text: '（仮テキスト・敵03 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
    ENEMY_04: {
        title: '敵04(仮)の裏話',
        screens: [
            { img: 'substory_4_1.PNG', text: '（仮テキスト・敵04 裏話 1/3）誰にも言えない、敵04(仮)だけの秘密の物語がここに……' },
            { img: 'substory_4_2.PNG', text: '（仮テキスト・敵04 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_4_3.PNG', text: '（仮テキスト・敵04 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
    ENEMY_05: {
        title: '敵05(仮)の裏話',
        screens: [
            { img: 'substory_5_1.PNG', text: '（仮テキスト・敵05 裏話 1/3）誰にも言えない、敵05(仮)だけの秘密の物語がここに……' },
            { img: 'substory_5_2.PNG', text: '（仮テキスト・敵05 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_5_3.PNG', text: '（仮テキスト・敵05 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
};
// サウンドテストの一覧(実ファイルはassets/audio/配下に今後配置。未配置の項目は再生時に何も鳴らないだけで、エラーにはしない)
const SOUND_TEST_TRACKS = [
    { name: 'bgm_title', label: 'BGM: タイトル' },
    { name: 'bgm_prologue', label: 'BGM: オープニング' },
    { name: 'bgm_story', label: 'BGM: ストーリー(全敵共通)' },
    { name: 'bgm_battle', label: 'BGM: バトル(TRAINING MODE / 汎用)' },
    { name: 'bgm_battle_1', label: 'BGM: バトル(敵01)' },
    { name: 'bgm_battle_2', label: 'BGM: バトル(敵02)' },
    { name: 'bgm_battle_3', label: 'BGM: バトル(敵03)' },
    { name: 'bgm_battle_4', label: 'BGM: バトル(敵04)' },
    { name: 'bgm_battle_5', label: 'BGM: バトル(敵05)' },
    { name: 'bgm_victory', label: 'BGM: 勝利' },
    { name: 'bgm_ending', label: 'BGM: エンディング' },
    { name: 'se_punch', label: 'SE: パンチ' },
    { name: 'se_guard', label: 'SE: ガード' },
    { name: 'se_ko', label: 'SE: K.O.' },
    { name: 'se_win', label: 'SE: YOU WIN' },
];

// ------- セーブ/ロード(localStorage) -------
// このゲームは単体のHTMLファイルとして配布する想定のため、通常のWebサイトと同様にlocalStorageを使用する。
const SAVE_KEY = 'commandbattle_save_v1';


// 起動時にセーブデータを読み込み、進行状況・デッキ編成・サウンド設定へ反映する


// ------- 山札操作 -------





// 手札・山が共に尽きた時の演出: DECK表示が3回点滅→「Refresh」表示→0から実際の枚数までカウントアップしながら
// 捨札を山へリシャッフルする(約2.5秒)


// ------- デッキ編成画面 -------


// タップ時にチカチカっと点滅させてから、コールバック(画面遷移など)を実行する




const cvs = document.getElementById('cvs');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false; // 第10条

const imgs = {}; // 第13条: 再初期化しない
let loadedCount = 0;
let loadFailed = [];
let bgSettled = false; // bg.PNGは任意アセット。成功/失敗に関わらず「決着」したらtrue

document.querySelectorAll('.controls button').forEach(b => b.disabled = true);
document.getElementById('howToBtn').disabled = false; // HOW TOはゲーム状態に関係なく常に押せるようにする
document.getElementById('optionBattleBtn').disabled = false; // OPTIONも同様に常に押せる


DB.ASSETS.forEach(n => {
    const i = new Image();
    i.onload = () => { imgs[n] = i; loadedCount++; checkAllSettled(); };
    i.onerror = () => { loadFailed.push(n); checkAllSettled(); };
    i.src = 'assets/images/characters/' + n;
});

// 背景(bg.PNG)はcanvasに直接描画するため、他アセットと同じ拡大パイプラインに乗る。
// 任意アセット扱いとし、読み込めなくてもエラーにせずdraw()側でフォールバック色を使う。
// bg.PNGは1stステージ(ENEMY_01)の背景を兼ねる。
const bgImgLoader = new Image();
bgImgLoader.onload = () => { imgs['bg.PNG'] = bgImgLoader; bgSettled = true; checkAllSettled(); };
bgImgLoader.onerror = () => { bgSettled = true; checkAllSettled(); };
bgImgLoader.src = 'assets/images/backgrounds/bg.PNG';

// 2〜5体目のステージ背景、およびTRAINING MODE専用背景(任意アセット)。
// 起動をブロックせず非同期に読み込み、未用意/読み込み失敗の場合はcurrentBgName()が1stステージのbg.PNGへフォールバックする。
const BG_OPTIONAL_NAMES = ['bg_2.PNG', 'bg_3.PNG', 'bg_4.PNG', 'bg_5.PNG', 'bg_training.PNG'];
BG_OPTIONAL_NAMES.forEach(name => {
    const i = new Image();
    i.onload = () => { imgs[name] = i; };
    i.onerror = () => { /* 任意アセットのため未用意でもエラー扱いにしない。bg.PNGへフォールバック */ };
    i.src = 'assets/images/backgrounds/' + name;
});
// 現在の状況(TRAINING MODE、またはSTORY MODEの現在の敵)に応じた背景ファイル名を返す。
// 該当画像が未読み込みの場合は、1stステージを兼ねるbg.PNGへフォールバックする。
function currentBgName() {
    let name;
    if (state.gameMode === 'training') {
        name = 'bg_training.PNG';
    } else {
        const stageNum = (state.storyEnemyIndex % ENEMY_ORDER.length) + 1; // 1〜5
        name = stageNum === 1 ? 'bg.PNG' : `bg_${stageNum}.PNG`;
    }
    return imgs[name] ? name : 'bg.PNG';
}

// ------- 敵専用グラフィックの差し替え余地(任意) -------
// 第19条: 敵(STORY MODEの対戦相手、またはTRAINING MODE)ごとに専用のグラフィックセットを用意できる。
// assets/images/characters_enemy/enemy_1/〜enemy_5/(STORY MODEの1〜5体目)、training/(TRAINING MODE)の
// 各フォルダに、プレイヤーと同じ11種類のファイル名(player.PNG, damage.PNG など)を置く。
// 未用意でも起動やUIをブロックせず、404になっても黙ってプレイヤー画像にフォールバックする。
const ENEMY_SET_NAMES = ['enemy_1', 'enemy_2', 'enemy_3', 'enemy_4', 'enemy_5', 'training'];
const ENEMY_OPTIONAL_KEYS = ['player', 'player2', 'upper', 'damage', 'knock', 'knock2', 'dash', 'punch', 'punch2', 'guard', 'down'];
ENEMY_SET_NAMES.forEach(setName => {
    ENEMY_OPTIONAL_KEYS.forEach(key => {
        const imgKey = setName + '_' + key + '.PNG'; // imgs辞書内でのキー(例: 'enemy_3_damage.PNG')
        const i = new Image();
        i.onload = () => { imgs[imgKey] = i; }; // 用意されていれば以後自動的にこちらが使われる
        i.onerror = () => { /* 任意アセットのため未用意でもエラー扱いにしない */ };
        i.src = `assets/images/characters_enemy/${setName}/${key}.PNG`;
    });
});
// 現在の状況(TRAINING MODE、またはSTORY MODEの現在の敵)に応じた敵グラフィックセット名を返す('enemy_1'〜'enemy_5'または'training')
function currentEnemySetName() {
    if (state.gameMode === 'training') return 'training';
    const idx = (state.storyEnemyIndex % ENEMY_ORDER.length) + 1; // 1〜5
    return 'enemy_' + idx;
}
// 敵側の描画名を解決する。現在の敵グラフィックセットが読み込み済みならそちらを、なければプレイヤー画像を返す。


// ------- カード画像(任意) -------
// 用意されていれば card_P.PNG / card_U.PNG / card_G.PNG を使い、無ければ従来通り文字(P/U/G)を表示する。
const CARD_IMG_MAP = { PUNCH: 'card_P.PNG', UPPER: 'card_U.PNG', GUARD: 'card_G.PNG' };
Object.values(CARD_IMG_MAP).forEach(fname => {
    const i = new Image();
    i.onload = () => { imgs[fname] = i; };
    i.onerror = () => { /* 任意アセットのため未用意でもエラー扱いにしない。文字表示にフォールバック */ };
    i.src = 'assets/images/cards/' + fname;
});
// カードの裏面(任意)。用意されていれば card_back.PNG を使い、無ければCSSの縞模様にフォールバックする。
const CARD_BACK_IMG = 'card_back.PNG';
(() => {
    const i = new Image();
    i.onload = () => { imgs[CARD_BACK_IMG] = i; };
    i.onerror = () => { /* 未用意でもエラー扱いにしない */ };
    i.src = 'assets/images/cards/' + CARD_BACK_IMG;
})();
// カード表示用の要素(el)に、typeに応じた画像 or 文字フォールバックを適用する





// ------- ロゴシーン: BORN MAGAZINE presents(logo.PNGは任意アセット。無ければテキストにフォールバック) -------
let logoTokenCounter = 0;





// ------- プロローグ: op_1.PNG〜op_4.PNG(任意アセット)。未用意でもエラー扱いにせずプレースホルダー表示にする -------
const OPENING_SCREENS = [
    { img: 'op_1.PNG', text: '（仮テキスト1）静かな街に、剣戟の噂が流れていた。' },
    { img: 'op_2.PNG', text: '（仮テキスト2）主人公は、かつての師の教えを胸に旅立つ。' },
    { img: 'op_3.PNG', text: '（仮テキスト3）行く手を阻むのは、宿敵との再会だった。' },
    { img: 'op_4.PNG', text: '（仮テキスト4）今、コマンドバトルの火蓋が切られる――。' }
];
OPENING_SCREENS.forEach(sc => {
    const i = new Image();
    i.onload = () => { imgs[sc.img] = i; };
    i.onerror = () => { /* 任意アセットのため未用意でもエラー扱いにしない。プレースホルダー表示にフォールバック */ };
    i.src = 'assets/images/cutscenes/opening/' + sc.img;
});

let prologueToken = 0; // SKIP時に進行中のタイプライター処理を打ち切るためのトークン



// ------- ストーリーシーン(STORY MODE専用): story_{敵番号}_{画面番号}.PNG(任意アセット)。プロローグと同じ仕組みを流用 -------
// 敵ごとに3画面分の画像・テキストを用意する(例: 1体目=story_1_1〜3.PNG、2体目=story_2_1〜3.PNG)。
// 敵の追加時はこのオブジェクトに ENEMY_0N のキーを追加する(ENEMY_PRESETS/ENEMY_ORDERと合わせて追加すること)。
const STORY_SCREENS_BY_ENEMY = {
    ENEMY_01: [
        { img: 'story_1_1.PNG', text: '（仮テキスト・敵01 1/3）新たな戦いの舞台が、目の前に広がる。' },
        { img: 'story_1_2.PNG', text: '（仮テキスト・敵01 2/3）相手の実力は未知数。油断はできない。' },
        { img: 'story_1_3.PNG', text: '（仮テキスト・敵01 3/3）覚悟を決め、デッキを整える時が来た。' }
    ],
    ENEMY_02: [
        { img: 'story_2_1.PNG', text: '（仮テキスト・敵02 1/3）二人目の相手が、静かに姿を現す。' },
        { img: 'story_2_2.PNG', text: '（仮テキスト・敵02 2/3）先の戦いとは違う気配を感じる。' },
        { img: 'story_2_3.PNG', text: '（仮テキスト・敵02 3/3）気を引き締め、再びデッキを整える。' }
    ],
    ENEMY_03: [
        { img: 'story_3_1.PNG', text: '（仮テキスト・敵03 1/3）三人目の相手が、行く手に立ちはだかる。' },
        { img: 'story_3_2.PNG', text: '（仮テキスト・敵03 2/3）ここまでの戦いで、確かな手応えを掴んでいる。' },
        { img: 'story_3_3.PNG', text: '（仮テキスト・敵03 3/3）次の一戦に向け、デッキを整える。' }
    ],
    ENEMY_04: [
        { img: 'story_4_1.PNG', text: '（仮テキスト・敵04 1/3）四人目の相手が、行く手を阻む。' },
        { img: 'story_4_2.PNG', text: '（仮テキスト・敵04 2/3）疲れは見せられない。集中を切らさず前へ進む。' },
        { img: 'story_4_3.PNG', text: '（仮テキスト・敵04 3/3）残る力を振り絞り、デッキを整える。' }
    ],
    ENEMY_05: [
        { img: 'story_5_1.PNG', text: '（仮テキスト・敵05 1/3）ついに最後の相手と対峙する。' },
        { img: 'story_5_2.PNG', text: '（仮テキスト・敵05 2/3）ここまでの戦いのすべてが、この一戦に繋がっている。' },
        { img: 'story_5_3.PNG', text: '（仮テキスト・敵05 3/3）最後の力を込め、デッキを整える。' }
    ]
};
Object.values(STORY_SCREENS_BY_ENEMY).forEach(screens => {
    screens.forEach(sc => {
        const i = new Image();
        i.onload = () => { imgs[sc.img] = i; };
        i.onerror = () => { /* 任意アセットのため未用意でもエラー扱いにしない。プレースホルダー表示にフォールバック */ };
        i.src = 'assets/images/cutscenes/story/' + sc.img;
    });
});
// 現在対戦中の敵(state.storyEnemyIndex)に対応する3画面分のストーリーを返す
function currentStoryScreens() {
    const id = ENEMY_ORDER[state.storyEnemyIndex % ENEMY_ORDER.length];
    return STORY_SCREENS_BY_ENEMY[id];
}

let storyToken = 0; // SKIP時に進行中のタイプライター処理を打ち切るためのトークン

// ------- エンディングシーン(5人目撃破後のみ再生): ending_1.PNG〜ending_5.PNG(任意アセット)。プロローグ/ストーリーと同じ仕組みを流用 -------
const ENDING_SCREENS = [
    { img: 'ending_1.PNG', text: '（仮テキスト・エンディング1/5）長かった戦いに、静かな幕が下りようとしていた。' },
    { img: 'ending_2.PNG', text: '（仮テキスト・エンディング2/5）出会った相手たちの顔が、一人また一人と思い出される。' },
    { img: 'ending_3.PNG', text: '（仮テキスト・エンディング3/5）失ったものと、得たもの。その両方が今の自分を作っている。' },
    { img: 'ending_4.PNG', text: '（仮テキスト・エンディング4/5）街には、いつもと変わらない朝が訪れる。' },
    { img: 'ending_5.PNG', text: '（仮テキスト・エンディング5/5）それでも、この手に残った強さだけは、確かなものだった。' }
];
ENDING_SCREENS.forEach(sc => {
    const i = new Image();
    i.onload = () => { imgs[sc.img] = i; };
    i.onerror = () => { /* 任意アセットのため未用意でもエラー扱いにしない。プレースホルダー表示にフォールバック */ };
    i.src = 'assets/images/cutscenes/ending/' + sc.img;
});



// ------- 汎用アクセサ (P/E共通ロジックで扱うためのヘルパー) -------









// 第7条: idleマーカーの時は player.PNG / player2.PNG を時間で交互に呼吸させる








// バトル開始時だけの演出: 手札を裏向きで配り、左から順にめくって表向きにする





// GO!/CANCELは「バトル準備完了」「解決中でない」「場に1枚以上カードがある」の3条件が揃った時だけ押せる

// ターン終了後、場に出したカードをふわっと浮かせながらフェードアウトさせる

updateUI(); // 第1条: 起動直後から5つの空枠を表示する

// ------- STORY MODE: 敵プリセット(枚数配分・よく出す組み合わせは今後ここに設定していく) -------
// deck: PUNCH/UPPER/GUARDの「出やすさ」の重み(枚数感覚でそのまま指定できる)
// favoritePatterns: よく出す組み合わせ(例: ['GUARD','PUNCH'])。今後ここに配列を追加していく想定。まだ未設定。
const ENEMY_PRESETS = {
    ENEMY_01: { name: '敵01(仮)', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
    ENEMY_02: { name: '敵02(仮)', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
    ENEMY_03: { name: '敵03(仮)', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
    ENEMY_04: { name: '敵04(仮)', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
    ENEMY_05: { name: '敵05(仮)', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
};
const ENEMY_ORDER = ['ENEMY_01', 'ENEMY_02', 'ENEMY_03', 'ENEMY_04', 'ENEMY_05']; // 連戦の順番

// ------- シーン管理 (プロローグ → タイトル → バトル) -------






// バトル開始演出: 暗転 → 味方/敵がふわっと表示 → 背景が中心から拡大表示 → BATTLE START(左からディゾルブ→中央停止→拡大しつつ消える)






// ------- HOW TOポップアップ(ブラウザ機能ではなく画面内オーバーレイ) -------




// ------- OPTION画面 -------








// 図鑑(取得アイテムの一覧・ミニストーリー表示)。今後実装予定のプレースホルダー。

// OPTION内のRETRY: このバトル直前のデッキ編成へ戻る(現在のモードを維持)

// OPTION内のRETURN TO TITLE: ロゴシーンまで戻る


// 第3条: 3すくみ判定 P>U, U>G, G>P (プレイヤー視点で 'win'/'lose'/'draw')



// TRAINING MODE: ターン終了時に双方のHPを全回復する(赤バー・黄色バーとも即座に反映)




// 第24条: 双方が残像付きのdash.PNGでX座標を目標地点まで移動する汎用関数







// 決着演出: 体力を0にする最後の一撃を受けた側の専用シーケンス
// 点滅 → ゲーム全体がスローになりつつ軽くバウンドしながら初期位置へ戻る → down.PNGで倒れる → K.O./YOU WIN表示




// 通常のヒット(GUARD/PUNCHが勝った場合)。負けた側だけが振動する。
// 通常のヒット(地上PUNCHが勝った場合)。負けた側だけが振動する。連続でヒットするほどダメージが増加する。


// メテオ(空中3発目)演出


// UPPERが勝った場合の空中コンボ一式


// ガードが成功した時の演出(勝った側はガードのまま反撃、負けた側はしびれる)
// 第3すくみの通り、GUARDに勝てるのはPUNCHのみなので、負けた側は必ずpunch.PNGの姿勢になる


// ピヨり演出: damage.PNGで点滅させつつ、頭上のpiyo.PNGを反転させながら2往復させる


// しびれによる無条件敗北: ピヨり演出のあと、相手が出していた技に応じた通常の勝敗処理をそのまま適用する(3すくみ判定はしない)


// 場(#slots)または敵(#enemySlots)の指定インデックスのカードに勝敗の見た目を付与する







// ============================================================
// セーブ/ロード
// ============================================================
function loadSaveData() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null; // localStorageが使えない環境でも落ちないようにする
    }
}

function writeSaveData(patch) {
    try {
        const current = loadSaveData() || {};
        const merged = Object.assign({}, current, patch);
        localStorage.setItem(SAVE_KEY, JSON.stringify(merged));
    } catch (e) { /* 保存できない環境でも無視する */ }
}

function applySaveDataOnBoot() {
    const save = loadSaveData();
    if (!save) return;
    if (typeof save.storyEnemyIndex === 'number') state.storyEnemyIndex = save.storyEnemyIndex;
    if (save.deckCounts) {
        deckCounts = {
            PUNCH: save.deckCounts.PUNCH ?? deckCounts.PUNCH,
            UPPER: save.deckCounts.UPPER ?? deckCounts.UPPER,
            GUARD: save.deckCounts.GUARD ?? deckCounts.GUARD,
        };
    }
    if (typeof save.soundOn === 'boolean') state.soundOn = save.soundOn;
    if (typeof save.bgmVolume === 'number') state.bgmVolume = save.bgmVolume;
    if (typeof save.seVolume === 'number') state.seVolume = save.seVolume;
    if (Array.isArray(save.unlockedItems)) unlockedItems = save.unlockedItems;
    if (Array.isArray(save.unlockedSubStories)) unlockedSubStories = save.unlockedSubStories;
    if (Array.isArray(save.unlockedSkins)) unlockedSkins = save.unlockedSkins;
    if (typeof save.soundTestUnlocked === 'boolean') soundTestUnlocked = save.soundTestUnlocked;
    if (save.specialsUsed) {
        specialsUsed = {
            superUpper: !!save.specialsUsed.superUpper,
            charge: !!save.specialsUsed.charge,
            followUp: !!save.specialsUsed.followUp,
            finisher: !!save.specialsUsed.finisher,
        };
    }
    if (typeof save.selectedSkin === 'string' || save.selectedSkin === null) selectedSkin = save.selectedSkin;
}

// サブストーリーを解除する(ストーリーシーン内の隠しタップから呼ばれる)。既に解除済みなら何もしない。
function unlockSubStory(enemyIdx) {
    if (unlockedSubStories.includes(enemyIdx)) return;
    unlockedSubStories.push(enemyIdx);
    writeSaveData({ unlockedSubStories });
}

// コスチュームを解除する(STORY MODEでノーダメージ撃破した時に呼ばれる)。既に解除済みなら何もしない。
function unlockSkin(skinName) {
    if (unlockedSkins.includes(skinName)) return;
    unlockedSkins.push(skinName);
    writeSaveData({ unlockedSkins });
}

// 必殺技の使用履歴を記録する(バトルをまたいで積み上げる)。4種類すべて使用済みになった時点でSOUND TESTを解除する。
function markSpecialUsed(key) {
    if (specialsUsed[key]) return; // 既に記録済みなら何もしない
    specialsUsed[key] = true;
    writeSaveData({ specialsUsed });
    const allUsed = specialsUsed.superUpper && specialsUsed.charge && specialsUsed.followUp && specialsUsed.finisher;
    if (allUsed && !soundTestUnlocked) {
        soundTestUnlocked = true;
        writeSaveData({ soundTestUnlocked: true });
    }
}

// ============================================================
// デッキ・山札システム
// ============================================================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildDeckArray(counts) {
    const deck = [];
    for (let i = 0; i < counts.PUNCH; i++) deck.push('PUNCH');
    for (let i = 0; i < counts.UPPER; i++) deck.push('UPPER');
    for (let i = 0; i < counts.GUARD; i++) deck.push('GUARD');
    return shuffleArray(deck);
}

function drawCard() {
    // 自動リシャッフルはしない。山が尽きたらnullを返し、その枠は空のまま残す。
    // 山と捨札を実際にリシャッフルするのは runDeckRefresh() のみ(手札・山が共に0になった時の演出内)。
    if (state.playerDeck.length === 0) return null;
    return state.playerDeck.pop();
}

function updateDeckCountDisplay() {
    const el = document.getElementById('deckInfo');
    if (!el) return;
    if (state.gameMode === 'training') {
        el.style.display = 'none'; // TRAINING MODEは山札を使わないため非表示にする
        return;
    }
    el.style.display = '';
    el.innerText = `DECK ${state.playerDeck.length}/${DB.DECK_TOTAL}`;
}

async function runDeckRefresh() {
    const deckEl = document.getElementById('deckInfo');
    const label = document.getElementById('deckRefreshLabel');
    label.classList.add('show');

    for (let i = 0; i < 3; i++) {
        deckEl.style.opacity = '0.15';
        await wait(150);
        deckEl.style.opacity = '1';
        await wait(150);
    }

    // ここで実際に捨札を山へ戻す(配分比率は変わらない)
    state.playerDeck = shuffleArray(state.playerDiscard.slice());
    state.playerDiscard = [];
    const target = state.playerDeck.length;

    const steps = 30;
    const stepMs = 2500 / steps;
    for (let s = 1; s <= steps; s++) {
        const val = Math.round(target * (s / steps));
        deckEl.innerText = `DECK ${val}/${DB.DECK_TOTAL}`;
        await wait(stepMs);
    }
    deckEl.innerText = `DECK ${target}/${DB.DECK_TOTAL}`;
    label.classList.remove('show');
}

function adjustDeck(type, delta) {
    const next = deckCounts[type] + delta;
    if (next < 0) return;
    const total = deckCounts.PUNCH + deckCounts.UPPER + deckCounts.GUARD - deckCounts[type] + next;
    if (total > DB.DECK_TOTAL) return; // 21枚を超えない
    deckCounts[type] = next;
    updateDeckBuildUI();
}

function updateDeckBuildUI() {
    document.getElementById('deckCountPUNCH').innerText = deckCounts.PUNCH;
    document.getElementById('deckCountUPPER').innerText = deckCounts.UPPER;
    document.getElementById('deckCountGUARD').innerText = deckCounts.GUARD;
    const total = deckCounts.PUNCH + deckCounts.UPPER + deckCounts.GUARD;
    document.getElementById('deckTotalText').innerText = `合計 ${total} / ${DB.DECK_TOTAL}`;
    document.getElementById('deckConfirmBtn').disabled = (total !== DB.DECK_TOTAL);
}

// ============================================================
// アセット読み込み
// ============================================================
function checkAllSettled() {
    if (loadedCount + loadFailed.length === DB.ASSETS.length && bgSettled) {
        if (loadFailed.length > 0) {
            console.error('第12条違反: 以下のアセットが読み込めませんでした →', loadFailed.join(', '));
        }
        boot();
    }
}

function enemySpriteName(baseName) {
    const key = baseName.replace('.PNG', '');
    const enemyName = currentEnemySetName() + '_' + key + '.PNG';
    return imgs[enemyName] ? enemyName : baseName;
}

// プレイヤー側の描画名を解決する。実績で解除したコスチューム(selectedSkin)が選択されていれば、
// 敵専用グラフィックとして読み込み済みの同じ画像セット(例: enemy_3_player.PNG)を流用してプレイヤーの見た目に適用する。
// 未選択、または該当画像が読み込まれていない場合は通常のプレイヤー画像を返す。
function playerSpriteName(baseName) {
    if (!selectedSkin) return baseName;
    const key = baseName.replace('.PNG', '');
    const skinName = selectedSkin + '_' + key + '.PNG';
    return imgs[skinName] ? skinName : baseName;
}

function applyCardVisual(el, type) {
    const fname = type ? CARD_IMG_MAP[type] : null;
    const img = fname ? imgs[fname] : null;
    if (img) {
        el.style.backgroundImage = `url('assets/images/cards/${fname}')`;
        el.innerText = '';
    } else {
        el.style.backgroundImage = 'none';
        el.innerText = type ? type[0] : '';
    }
}

// ------- サウンド(BGM/SE) -------
// BGMはWeb Audio APIでシームレスループ再生する(オンデマンド読み込み、起動をブロックしない)。
// SEは軽量なため起動時にまとめて先読みし、複数の音が重なっても途切れないよう毎回新しい再生ノードを作る。
// ファイルの拡張子はBGM/SEどちらもmp3を基本としつつ、SEはwavで用意される場合もあるため両方を順に試す。
// いずれの拡張子でも見つからない場合は、他の任意アセットと同じくエラーにせず無音のままにする。
const AUDIO_EXTENSIONS = ['mp3', 'wav'];

let audioCtx = null; // 初回再生時に生成する(ブラウザの自動再生制限のため、無音のcontextを先に作らない)
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume(); // iOS Safari等、ユーザー操作後でないと再開しないブラウザ対策
    return audioCtx;
}

// BGM/SEそれぞれ専用のゲインノードを介して出力する(個別に音量調整できるようにするため)
let bgmGainNode = null;
function getBgmGainNode() {
    if (!bgmGainNode) {
        const ctx = getAudioCtx();
        bgmGainNode = ctx.createGain();
        bgmGainNode.gain.value = state.bgmVolume;
        bgmGainNode.connect(ctx.destination);
    }
    return bgmGainNode;
}
let seGainNode = null;
function getSeGainNode() {
    if (!seGainNode) {
        const ctx = getAudioCtx();
        seGainNode = ctx.createGain();
        seGainNode.gain.value = state.seVolume;
        seGainNode.connect(ctx.destination);
    }
    return seGainNode;
}
function setBgmVolume(v) {
    state.bgmVolume = v;
    writeSaveData({ bgmVolume: v });
    if (bgmGainNode) bgmGainNode.gain.value = v;
}
function setSeVolume(v) {
    state.seVolume = v;
    writeSaveData({ seVolume: v });
    if (seGainNode) seGainNode.gain.value = v;
}

// 指定した種別(bgm/se)・名前の音声をfetch+decodeしてAudioBufferとして返す。読み込めなければnull。
async function loadAudioBuffer(kind, name) {
    for (const ext of AUDIO_EXTENSIONS) {
        try {
            const res = await fetch(`assets/audio/${kind}/${name}.${ext}`);
            if (!res.ok) continue;
            const arrayBuffer = await res.arrayBuffer();
            return await getAudioCtx().decodeAudioData(arrayBuffer);
        } catch (e) { /* この拡張子では読み込めなかった。次の拡張子を試す(両方だめなら未配置として扱う) */ }
    }
    return null;
}

let currentBgmSource = null; // 現在再生中のBGMのAudioBufferSourceNode
let currentBgmName = null; // 現在再生中(またはリクエスト中)のBGM名。同一BGMの多重再生防止に使う
const bgmBufferCache = {}; // 一度読み込んだBGMのAudioBufferをキャッシュ(再入場のたびの再読み込みを省く)

// 指定したBGMをシームレスループで再生する。既に同じBGMがリクエスト/再生中なら何もしない。
// state.soundOnがfalseの場合、次にONにした時すぐ再生できるよう読み込みだけ行い、実際の再生はしない。
// 指定したBGMをシームレスループで再生する。既に同じ要求(name)がリクエスト/再生中なら何もしない。
// fallbackNameを指定すると、nameが未配置の場合にそちらを試す(例: ステージ別BGMが無ければ汎用バトルBGMを流す)。
async function playBGM(name, fallbackName) {
    if (currentBgmName === name) return;
    currentBgmName = name;
    stopBGM();

    let buffer = bgmBufferCache[name];
    if (buffer === undefined) {
        buffer = await loadAudioBuffer('bgm', name);
        if (!buffer && fallbackName) {
            buffer = bgmBufferCache[fallbackName];
            if (buffer === undefined) {
                buffer = await loadAudioBuffer('bgm', fallbackName);
                bgmBufferCache[fallbackName] = buffer;
            }
        }
        bgmBufferCache[name] = buffer; // フォールバック後のbufferであっても、nameキーにそのまま紐付けてキャッシュする
    }
    if (currentBgmName !== name) return; // 読み込み中に別のBGM要求へ切り替わっていたら中断
    if (!buffer || !state.soundOn) return;

    const ctx = getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // AudioBufferSourceNodeのloopはサンプル単位でシームレス
    source.connect(getBgmGainNode());
    source.start(0);
    currentBgmSource = source;
}

function stopBGM() {
    if (currentBgmSource) {
        try { currentBgmSource.stop(); } catch (e) { /* 既に停止済み等は無視 */ }
        currentBgmSource.disconnect();
        currentBgmSource = null;
    }
}

const seBufferCache = {}; // SEは軽量なため、一度読み込んだAudioBufferを使い回す
// SEを再生する。state.soundOnがfalseなら何もしない。連打・重なりに対応するため毎回新しい再生ノードを作る。
async function playSE(name) {
    if (!state.soundOn) return;
    let buffer = seBufferCache[name];
    if (buffer === undefined) {
        buffer = await loadAudioBuffer('se', name);
        seBufferCache[name] = buffer;
    }
    if (!buffer || !state.soundOn) return; // 読み込み待ちの間にOFFにされた場合も考慮
    const ctx = getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(getSeGainNode());
    source.start(0);
}

// SEは軽量なため起動時にまとめて先読みしておく(初回再生時の遅延をなくす。起動処理自体はブロックしない)
function preloadSE() {
    ['se_punch', 'se_guard', 'se_ko', 'se_win'].forEach(name => {
        loadAudioBuffer('se', name).then(buf => { seBufferCache[name] = buf; });
    });
}

function boot() {
    // 第23条: 全画像の読み込み確定を待ってからループ開始・UI有効化
    applySaveDataOnBoot(); // 進行状況・デッキ編成・サウンド設定をセーブデータから復元
    preloadSE(); // SEは軽量なので先読みしておく(起動をブロックしない非同期処理)
    document.getElementById('startBtn').disabled = false;
    document.getElementById('trainingBtn').disabled = false;
    document.getElementById('optionBtn').disabled = false;
    updateTitleContinueVisibility();
    draw();
    playLogo();
}

// ============================================================
// シーン遷移
// ============================================================
// タイトルのCONTINUEは、セーブデータが存在するだけでは表示しない。
// デッキ編成(deckCounts)やサウンド設定などの保存だけでも「セーブデータの存在」自体は真になってしまうため、
// 実際に敵2以降まで進んだ記録(storyEnemyIndex >= 1)があるかどうかで判定する。
function updateTitleContinueVisibility() {
    const save = loadSaveData();
    const hasStoryProgress = !!save && typeof save.storyEnemyIndex === 'number' && save.storyEnemyIndex >= 1;
    document.getElementById('titleContinueBtn').style.display = hasStoryProgress ? 'block' : 'none';
}

async function playLogo() {
    const myToken = ++logoTokenCounter;
    const content = document.getElementById('logoContent');
    content.style.transition = 'none';
    content.style.opacity = '0';
    await wait(30);
    if (logoTokenCounter !== myToken) return;

    content.style.transition = 'opacity 1s ease-in';
    content.style.opacity = '1';
    await wait(1000);
    if (logoTokenCounter !== myToken) return;

    await wait(2000); // 表示を2秒キープ
    if (logoTokenCounter !== myToken) return;

    content.style.transition = 'opacity 1s ease-out';
    content.style.opacity = '0';
    await wait(1000);
    if (logoTokenCounter !== myToken) return;

    goProloguePlay();
}

function skipLogo() {
    logoTokenCounter++; // 進行中のplayLogoのawaitループを無効化する
    goProloguePlay();
}

function goLogo() {
    hideResult();
    showScene('logo');
    playLogo();
}

function goProloguePlay() {
    showScene('prologue');
    playPrologue();
}

function skipPrologue() {
    prologueToken++; // 進行中のawaitループを無効化する
    goTitle();
}

async function playPrologue() {
    playBGM('bgm_prologue');
    const myToken = ++prologueToken;
    const content = document.getElementById('prologueContent');
    const imgArea = document.getElementById('prologueImgArea');
    const fallback = document.getElementById('prologueImgFallback');
    const textEl = document.getElementById('prologueText');

    // 再生開始時は必ず真っ黒(透明)にリセットしてからフェードインする
    content.style.transition = 'none';
    content.style.opacity = '0';
    textEl.innerText = '';
    imgArea.classList.remove('placeholder');
    imgArea.style.backgroundImage = 'none';

    for (let i = 0; i < OPENING_SCREENS.length; i++) {
        const screen = OPENING_SCREENS[i];
        if (prologueToken !== myToken) return; // SKIPされていたら中断

        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/opening/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }

        if (i === 0) {
            // 一番はじめの画面だけフェードインで始める
            await wait(30); // 直前のopacity:0が確実に描画されてから遷移を開始させる
            content.style.transition = 'opacity 1s ease-in';
            content.style.opacity = '1';
            await wait(1000);
        }

        textEl.innerText = '';
        for (let c = 0; c < screen.text.length; c++) {
            if (prologueToken !== myToken) return;
            textEl.innerText += screen.text[c];
            await wait(45); // 1文字ずつ表示するスピード
        }

        if (prologueToken !== myToken) return;
        await wait(2000); // 1ページ読み終えてから次の画面まで、もう少し長めに読ませる
    }

    if (prologueToken !== myToken) return;
    goTitle(); // 4画面すべて終わったらSKIPしなくても自動でタイトルへ
}

let storyTapResolve = null; // タップ待ち中のPromiseのresolve関数(待っていない時はnull)

// storyContentタップ時に呼ばれる。タップ待ち中なら、待機しているplayStorySequence()を1つだけ先に進める
function onStoryTap() {
    if (storyTapResolve) { storyTapResolve(); storyTapResolve = null; }
}

// ストーリーシーン内の隠しタップゾーンをタップした時に呼ばれる。現在再生中の敵に対応するサブストーリーを解除する。
// 既に解除済みの場合は何も表示しない(何度タップしても無害)。
function onStoryHiddenTap() {
    const idx = state.storyEnemyIndex;
    const alreadyUnlocked = unlockedSubStories.includes(idx);
    unlockSubStory(idx);
    if (!alreadyUnlocked) showUnlockToast('★ サブストーリーを解除しました ★');
}

// 実績解除時の簡易トースト表示(数秒でフェードアウトする)
let unlockToastTimer = null;
function showUnlockToast(message) {
    let toast = document.getElementById('unlockToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'unlockToast';
        toast.style.cssText = 'position:fixed; left:50%; top:20%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:#ffd23c; border:1px solid #ffd23c; border-radius:8px; padding:10px 18px; font-size:13px; font-weight:bold; z-index:9999; transition:opacity 0.4s; pointer-events:none;';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.opacity = '1';
    if (unlockToastTimer) clearTimeout(unlockToastTimer);
    unlockToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

// タップされるまで待機するPromiseを返す
function waitForStoryTap() {
    return new Promise(resolve => { storyTapResolve = resolve; });
}

function goStoryThenDeck() {
    showScene('story');
    playStorySequence();
}

function skipStorySequence() {
    storyToken++; // 進行中のawaitループを無効化する
    if (storyTapResolve) { storyTapResolve(); storyTapResolve = null; } // タップ待ちで止まっていれば解除する(でないとトークン確認まで到達できない)
    goDeckBuild('story');
}

async function playStorySequence() {
    playBGM('bgm_story'); // ストーリーシーンは敵によらず共通のBGMを流す
    const myToken = ++storyToken;
    const content = document.getElementById('storyContent');
    const imgArea = document.getElementById('storyImgArea');
    const fallback = document.getElementById('storyImgFallback');
    const textEl = document.getElementById('storyText');

    // 再生開始時は必ず真っ黒(透明)にリセットしてからフェードインする
    content.style.transition = 'none';
    content.style.opacity = '0';
    textEl.innerText = '';
    imgArea.classList.remove('placeholder');
    imgArea.style.backgroundImage = 'none';

    const screens = currentStoryScreens(); // 現在の敵(state.storyEnemyIndex)に対応する3画面
    for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];
        if (storyToken !== myToken) return; // SKIPされていたら中断

        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/story/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }
        // 隠しタップは3画面のうち対象の1枚だけで有効にする(敵ごとに違う画面。それ以外の画面では押せないようにする)
        const hiddenTapScreenIdx = STORY_HIDDEN_TAP_SCREEN_BY_ENEMY[ENEMY_ORDER[state.storyEnemyIndex]] ?? 1;
        document.getElementById('storyHiddenTap').style.display = (i === hiddenTapScreenIdx) ? '' : 'none';

        if (i === 0) {
            // 一番はじめの画面だけフェードインで始める
            await wait(30); // 直前のopacity:0が確実に描画されてから遷移を開始させる
            content.style.transition = 'opacity 1s ease-in';
            content.style.opacity = '1';
            await wait(1000);
        }

        textEl.innerText = '';
        for (let c = 0; c < screen.text.length; c++) {
            if (storyToken !== myToken) return;
            textEl.innerText += screen.text[c];
            await wait(45); // 1文字ずつ表示するスピード
        }

        if (storyToken !== myToken) return;
        // オープニング(プロローグ)とは異なり、ストーリーシーンは自動送りにしない。
        // 戦いのヒントになる会話のため、プレイヤーが自分のペースで読めるよう画面タップで次へ進める(SKIPは従来通り別途利用可能)。
        await waitForStoryTap();
        if (storyToken !== myToken) return; // タップ待ち中にSKIPされていた場合はここで中断する
    }

    if (storyToken !== myToken) return;
    goDeckBuild('story'); // 3画面すべて終わったらデッキ編成へ
}

// エンディング5画面を再生する(スキップ不可。5人目撃破後の専用演出のため)
async function playEndingSequence() {
    playBGM('bgm_ending');
    const content = document.getElementById('endingContent');
    const imgArea = document.getElementById('endingImgArea');
    const fallback = document.getElementById('endingImgFallback');
    const textEl = document.getElementById('endingText');

    content.style.transition = 'none';
    content.style.opacity = '0';
    textEl.innerText = '';
    imgArea.classList.remove('placeholder');
    imgArea.style.backgroundImage = 'none';

    for (let i = 0; i < ENDING_SCREENS.length; i++) {
        const screen = ENDING_SCREENS[i];

        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/ending/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }

        if (i === 0) {
            // 一番はじめの画面だけフェードインで始める(プロローグ/ストーリーと同じ仕様)
            await wait(30);
            content.style.transition = 'opacity 1s ease-in';
            content.style.opacity = '1';
            await wait(1000);
        }

        textEl.innerText = '';
        for (let c = 0; c < screen.text.length; c++) {
            textEl.innerText += screen.text[c];
            await wait(45);
        }

        await wait(2000);
    }

    // 5画面すべて表示し終えたら、フェードアウトして暗転する
    content.style.transition = 'opacity 1.5s ease-out';
    content.style.opacity = '0';
    await wait(1500);
}

// エンドロール(下から上へスクロールするクレジット表示)を再生する。CSS側のtransition時間(14s)と合わせて待機する
async function playCredits() {
    const CREDITS_SCROLL_MS = 14000;
    showScene('credits');
    const scroll = document.getElementById('creditsScroll');
    scroll.classList.remove('roll');
    void scroll.offsetWidth; // 強制リフロー(アニメーションを確実に最初から再生させるため)
    await wait(30);
    scroll.classList.add('roll');
    await wait(CREDITS_SCROLL_MS);
}

// FIN画面(真っ黒な背景の中央に白文字)を10秒間表示し、その後ゆっくりフェードアウトする
async function playFinScreen() {
    const finScene = document.getElementById('sceneFin');
    finScene.style.transition = 'none';
    finScene.style.opacity = '1';
    showScene('fin');
    await wait(10000);
    finScene.style.transition = 'opacity 2s ease-out';
    finScene.style.opacity = '0';
    await wait(2000);
}

// 5人目(最終)撃破時の専用シーケンス: YOU WINの余韻を5秒→エンディング5画面→エンドロール→FIN.→タイトルへ自動的に戻る
// この間、storyEnemyIndexは進めない(advanceToNextEnemyを呼ばない)ため、タイトルのCONTINUEは5人目と戦う前の状態のまま残る
async function runFinalVictorySequence() {
    await wait(5000);
    hideResult();
    showScene('ending');
    await playEndingSequence();
    await playCredits();
    await playFinScreen();
    goTitle();
}

function showScene(name) {
    document.querySelectorAll('.scene').forEach(el => el.classList.remove('active'));
    document.getElementById('scene' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
}

function goPrologue() { hideResult(); showScene('prologue'); playPrologue(); }

function goTitle() { showScene('title'); updateTitleContinueVisibility(); playBGM('bgm_title'); }

// NEW GAME: 今回のプレイのstoryEnemyIndexだけを0にする(セーブデータ側は書き換えない)。
// こうすることで、誤ってNEW GAMEを押してしまっても、既存の進行状況(敵2以降まで到達したセーブ)は消えずに残る。
// セーブデータのstoryEnemyIndexが実際に更新されるのは、勝利してadvanceToNextEnemy()が呼ばれた時のみ。
function goNewGame() {
    state.storyEnemyIndex = 0;
    goStoryThenDeck();
}

// CONTINUE: ストーリー導入は省略し、保存済みの進行状況のまま直接デッキ編成へ
function goContinueGame() {
    goDeckBuild('story');
}

// 決着画面(YOU WIN)のNEXT BATTLEから呼ばれる: 次の敵へ進めてから、その敵のストーリーシーン(3画面)を経てデッキ編成へ遷移する
function goNextEnemy() {
    advanceToNextEnemy();
    goStoryThenDeck();
}

function goDeckBuild(mode) {
    // 明示的に指定があればそのモードへ、無ければ直近のモード(CONTINUE/RETRY用)、それも無ければstory
    state.pendingMode = mode || state.gameMode || 'story';
    // storyEnemyIndexはここではリセットしない(セーブされた進行状況を引き継ぐ)。
    // 最初からやり直したい場合はタイトルのOPTION画面から明示的にリセットする。
    updateDeckBuildUI();
    showScene('deck');
}

// TRAINING MODE専用: デッキ編成を経由せず、タイトルから直接バトルへ入る(手札は固定のPUNCH/UPPER/GUARD、選び放題)。
// デッキ編成を使わないため、goBattleStartと異なりdeckCountsのセーブ書き込みは行わない。
function goTrainingBattle() {
    state.pendingMode = 'training';
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    playBGM('bgm_battle');
}

function tapFlickerThen(el, callback) {
    el.classList.remove('tap-flicker');
    void el.offsetWidth; // 連打時もアニメーションを確実に再生させるための強制リフロー
    el.classList.add('tap-flicker');

    let done = false;
    const finish = () => {
        if (done) return; // animationendとフォールバックの二重発火を防ぐ
        done = true;
        el.classList.remove('tap-flicker'); // 点滅を完全に終わらせてから
        callback(); // 画面遷移する
    };
    el.addEventListener('animationend', finish, { once: true }); // 本当にアニメーションが終わった瞬間に発火
    setTimeout(finish, 500); // 保険(animationendが発火しない環境向けのフォールバック)
}

// ============================================================
// 描画・スプライト管理
// ============================================================
function setAct(side, v) { if (side === 'P') state.pAct = v; else state.eAct = v; }

function getX(side) { return side === 'P' ? state.pX : state.eX; }
function getY(side) { return side === 'P' ? state.pY : state.eY; }

function setX(side, v) { if (side === 'P') state.pX = v; else state.eX = v; }

function setY(side, v) { if (side === 'P') state.pY = v; else state.eY = v; }

function triggerShake(side, ms) { const until = performance.now() + ms; if (side === 'P') state.pShakeUntil = until; else state.eShakeUntil = until; }

function triggerBlink(side, ms) { const until = performance.now() + ms; if (side === 'P') state.pBlinkUntil = until; else state.eBlinkUntil = until; }

function nextPunchSprite(side) {
    const key = side === 'P' ? 'pLastAtk' : 'eLastAtk';
    state[key] = state[key] === 'punch.PNG' ? 'punch2.PNG' : 'punch.PNG'; // 第21条
    return state[key];
}

function moveSprite(move) {
    if (move === 'GUARD') return 'guard.PNG';
    if (move === 'UPPER') return 'upper.PNG';
    return 'punch.PNG';
}

function breathSprite(t) {
    return (Math.floor(t / DB.BREATH_MS) % 2 === 0) ? 'player.PNG' : 'player2.PNG';
}

function spriteFor(act, t) {
    return act === 'IDLE' ? breathSprite(t) : act;
}

function toIdle() {
    // しびれている側はIDLE(呼吸)へ戻さず、damage.PNGでの被弾/ピヨり姿勢を維持する
    if (!state.pNumbed) state.pAct = 'IDLE';
    if (!state.eNumbed) state.eAct = 'IDLE';
}
// ピヨり演出の開始/終了。以後は draw() が state.piyoSide を見て継続的に描画し続ける(固定時間の演出ではない)
function startPiyo(side) { state.piyoSide = side; }
function stopPiyo() { state.piyoSide = null; }

function draw(tRaw) {
    const t = tRaw || performance.now();
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // 背景: キャラと同じ nearest-neighbor 拡大で描画。中心から広がる円形クリップで演出する。
    // TRAINING MODE、またはSTORY MODEの現在の敵に応じた背景(currentBgName)を使う。未読み込みなら1stステージのbg.PNGへフォールバックする。
    if (state.bgRevealRadius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cvs.width / 2, cvs.height / 2, state.bgRevealRadius, 0, Math.PI * 2);
        ctx.clip();
        const bgImg = imgs[currentBgName()];
        if (bgImg) {
            // 画像の実サイズに関わらず、canvas比率(960:560=12:7)ぶんだけ横幅いっぱいを使い、上側から切り取って描画する。
            // 例: 96x96で作られた背景でも、上側の96x56相当だけが使われる(下側は切り捨てられる)。
            const srcW = bgImg.naturalWidth || bgImg.width;
            const srcH = bgImg.naturalHeight || bgImg.height;
            const targetAspect = cvs.width / cvs.height; // 960/560
            const cropH = Math.min(srcH, srcW / targetAspect);
            ctx.drawImage(bgImg, 0, 0, srcW, cropH, 0, 0, cvs.width, cvs.height);
        } else {
            ctx.fillStyle = '#8fe0f0'; // bg.PNGが読み込めない場合の水色フォールバック
            ctx.fillRect(0, 0, cvs.width, cvs.height);
        }
        ctx.restore();
    }

    // 残像(第24条、およびPUNCH+PUNCH+UPPERの強さ演出)を先に描画。
    // 各残像は個別に寿命(life)・スプライト(sprite)・最大不透明度(maxAlpha)を持てる。省略時は従来のdash残像と同じ既定値になる。
    trails = trails.filter(tr => (t - tr.born) < (tr.life || 220));
    trails.forEach(tr => {
        const life = tr.life || 220;
        const maxAlpha = tr.maxAlpha != null ? tr.maxAlpha : 0.35;
        const age = t - tr.born;
        const alpha = maxAlpha * (1 - age / life);
        const spriteName = tr.sprite || 'dash.PNG';
        const img = imgs[tr.side === 'E' ? enemySpriteName(spriteName) : spriteName];
        if (!img || alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (tr.side === 'E') {
            ctx.scale(-1, 1);
            ctx.drawImage(img, -tr.x - DB.IMG_SIZE, tr.y, DB.IMG_SIZE, DB.IMG_SIZE);
        } else {
            ctx.drawImage(img, tr.x, tr.y, DB.IMG_SIZE, DB.IMG_SIZE);
        }
        ctx.restore();
    });

    // プレイヤー(振動・点滅対応)
    const pJit = t < state.pShakeUntil ? (Math.random() * 6 - 3) : 0;
    const pBlinkA = t < state.pBlinkUntil ? ((Math.floor((state.pBlinkUntil - t) / 80) % 2 === 0) ? 1 : 0.25) : 1;
    const pAlpha = pBlinkA * state.introCharAlpha;
    const pImg = imgs[playerSpriteName(spriteFor(state.pAct, t))];
    ctx.save();
    ctx.globalAlpha = pAlpha;
    if (state.pChargeValue > 0) { // ガード2連続成功以降のチャージ中は金色に発光する(次のコマンドまで持続)
        const glowPulse = (Math.sin(t / 180) + 1) / 2; // 0〜1でゆっくり明滅
        if (state.pChargeValue >= 4 && pImg) {
            // 3連続以降(4倍)は、外側に白いオーラをもう一段重ねて2倍と明確に区別する
            ctx.save();
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 36 + glowPulse * 20;
            ctx.drawImage(pImg, state.pX + pJit, state.pY + pJit, DB.IMG_SIZE, DB.IMG_SIZE);
            ctx.restore();
        }
        ctx.shadowColor = 'rgba(255, 215, 60, 0.95)';
        ctx.shadowBlur = 14 + glowPulse * 16;
    }
    if (pImg) ctx.drawImage(pImg, state.pX + pJit, state.pY + pJit, DB.IMG_SIZE, DB.IMG_SIZE);
    else { ctx.fillStyle = '#0f0'; ctx.fillRect(state.pX, state.pY, DB.IMG_SIZE, DB.IMG_SIZE); }
    ctx.restore();

    // 敵(振動・点滅・反転対応)
    const eJit = t < state.eShakeUntil ? (Math.random() * 6 - 3) : 0;
    const eBlinkA = t < state.eBlinkUntil ? ((Math.floor((state.eBlinkUntil - t) / 80) % 2 === 0) ? 1 : 0.25) : 1;
    const eAlpha = eBlinkA * state.introCharAlpha;
    const eImg = imgs[enemySpriteName(spriteFor(state.eAct, t))];
    ctx.save();
    ctx.globalAlpha = eAlpha;
    if (state.eChargeValue > 0) { // ガード2連続成功以降のチャージ中は金色に発光する(次のコマンドまで持続)
        const glowPulse = (Math.sin(t / 180) + 1) / 2;
        if (state.eChargeValue >= 4 && eImg) {
            // 3連続以降(4倍)は、外側に白いオーラをもう一段重ねて2倍と明確に区別する
            ctx.save();
            ctx.scale(-1, 1);
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 36 + glowPulse * 20;
            ctx.drawImage(eImg, -(state.eX + eJit) - DB.IMG_SIZE, state.eY + eJit, DB.IMG_SIZE, DB.IMG_SIZE);
            ctx.restore();
        }
        ctx.shadowColor = 'rgba(255, 215, 60, 0.95)';
        ctx.shadowBlur = 14 + glowPulse * 16;
    }
    if (eImg) {
        ctx.save(); ctx.scale(-1, 1); // 第19条: 敵は常に反転
        ctx.drawImage(eImg, -(state.eX + eJit) - DB.IMG_SIZE, state.eY + eJit, DB.IMG_SIZE, DB.IMG_SIZE);
        ctx.restore();
    } else { ctx.fillStyle = '#f00'; ctx.fillRect(state.eX, state.eY, DB.IMG_SIZE, DB.IMG_SIZE); }
    ctx.restore();

    // ピヨり演出: しびれている側の頭上にpiyo.PNGを表示(反転を交互に切り替える)。
    // state.piyoSideがtruthyな間はずっと表示し続ける(開始/終了は startPiyo/stopPiyo が担う)。反転は経過時間から計算する。
    // piyo.PNGは実ファイルが32x32pxで、実際に使う絵柄は左上を基準にした横21px×縦9pxの範囲のみ
    if (state.piyoSide) {
        const piyoImg = imgs['piyo.PNG'];
        if (piyoImg) {
            const SRC_X = 6, SRC_Y = 0, SRC_W = 20, SRC_H = 9; // 元画像内での切り出し範囲(上・横中央寄せ)
            const baseX = state.piyoSide === 'P' ? state.pX : state.eX;
            const baseY = state.piyoSide === 'P' ? state.pY : state.eY;
            const pw = SRC_W * DB.SCALE, ph = SRC_H * DB.SCALE;
            const px = baseX + (DB.IMG_SIZE - pw) / 2;
            const py = baseY - ph - 10;
            const piyoFlipNow = Math.floor(t / 180) % 2 === 1; // 180msごとに反転
            ctx.save();
            if (piyoFlipNow) {
                ctx.translate(px + pw, py);
                ctx.scale(-1, 1);
                ctx.drawImage(piyoImg, SRC_X, SRC_Y, SRC_W, SRC_H, 0, 0, pw, ph);
            } else {
                ctx.drawImage(piyoImg, SRC_X, SRC_Y, SRC_W, SRC_H, px, py, pw, ph);
            }
            ctx.restore();
        }
    }

    requestAnimationFrame(draw);
}

// ============================================================
// 手札UI・敵AI
// ============================================================
function playCard(handIdx) {
    if (state.resolving || !state.battleReady) return;
    const card = state.playerHand[handIdx];
    if (!card) return;
    const slotIdx = state.hands.indexOf(null);
    if (slotIdx === -1) return; // 場(5枠)がすでに埋まっている
    state.hands[slotIdx] = card;
    if (state.gameMode !== 'training') state.playerHand[handIdx] = null; // TRAINING MODEは選び放題のため手札から取り除かない
    updateHandUI();
    updateUI();
}

function resetHands() {
    if (state.resolving || !state.battleReady) return;
    // 場に出したカードを手札の空きへ戻す
    state.hands.forEach(card => {
        if (!card) return;
        const emptyIdx = state.playerHand.indexOf(null);
        if (emptyIdx !== -1) state.playerHand[emptyIdx] = card;
    });
    state.hands = new Array(5).fill(null);
    updateHandUI();
    updateUI();
}

async function dealInitialHandAnimation() {
    const s = document.getElementById('handRow'); s.innerHTML = '';
    const n = state.playerHand.length; // STORY MODEは5、TRAINING MODEは3(PUNCH/UPPER/GUARD固定)
    const mid = (n - 1) / 2;
    const GAP_X = 48; // updateHandUI()と同じ配置計算に合わせる
    const ARC_K = 4;
    const cardEls = [];

    // 1. まず裏向きで、画面下からふわっと配られる(枚数はplayerHandの実際の長さに従う)
    state.playerHand.forEach((card, idx) => {
        const d = document.createElement('div');
        d.className = 'card card-back';
        const offset = idx - mid;
        const ty = offset * offset * ARC_K;
        const tx = offset * GAP_X;
        const angle = offset * 9;
        d.dataset.tx = tx;
        d.dataset.angle = angle;
        if (imgs[CARD_BACK_IMG]) d.style.backgroundImage = `url('assets/images/cards/${CARD_BACK_IMG}')`;
        d.style.top = ty + 'px';
        d.style.transition = 'none';
        d.style.transform = `translateX(calc(-50% + ${tx}px)) translateY(50px) rotate(${angle}deg)`;
        d.style.opacity = '0';
        s.appendChild(d);
        cardEls.push(d);
    });

    await wait(30);
    cardEls.forEach(d => {
        d.style.transition = 'transform 0.35s ease-out, opacity 0.3s ease-out';
        d.style.transform = `translateX(calc(-50% + ${d.dataset.tx}px)) rotate(${d.dataset.angle}deg)`;
        d.style.opacity = '1';
    });
    await wait(450); // 配り終わるまで待つ

    // 2. 左から順に、1枚ずつめくって表向きにする(速度2倍)
    for (let idx = 0; idx < cardEls.length; idx++) {
        const d = cardEls[idx];
        const tx = d.dataset.tx, angle = d.dataset.angle;
        d.style.transition = 'transform 0.08s ease-in';
        d.style.transform = `translateX(calc(-50% + ${tx}px)) rotate(${angle}deg) scaleX(0)`;
        await wait(80);

        d.className = 'card ' + (state.playerHand[idx] ? 'filled' : 'empty');
        applyCardVisual(d, state.playerHand[idx]);
        if (state.playerHand[idx]) d.onclick = () => playCard(idx);
        d.style.transition = 'transform 0.08s ease-out';
        d.style.transform = `translateX(calc(-50% + ${tx}px)) rotate(${angle}deg) scaleX(1)`;
        await wait(110); // 次のカードがめくれるまでの間隔
    }
}

function updateHandUI(animateIndices) {
    animateIndices = animateIndices || [];
    const s = document.getElementById('handRow'); s.innerHTML = '';
    const n = state.playerHand.length; // STORY MODEは5、TRAINING MODEは3(PUNCH/UPPER/GUARD固定・選び放題)
    const mid = (n - 1) / 2; // 中央インデックス
    const GAP_X = 48; // カード中心同士の横間隔(px)
    const ARC_K = 4;  // 円弧の深さ係数(大きいほど外側が下がる)
    state.playerHand.forEach((card, idx) => {
        const d = document.createElement('div');
        d.className = 'card ' + (card ? 'filled' : 'empty');
        applyCardVisual(d, card); // card_p/u/G.PNGがあれば画像、無ければP/U/Gの文字

        const offset = idx - mid; // -2, -1, 0, 1, 2
        // 高さ(top)は放物線(offset^2)で決める。中心=0が最も高く(top最小)、外側ほどなだらかに下がる。
        // これはCSSレイアウト上のtop値なので、rotateの角度に一切影響されない。
        const ty = offset * offset * ARC_K; // 0, 4, 16
        const tx = offset * GAP_X; // 横方向の間隔(中心からの距離)
        const angle = offset * 9; // deg (外側ほど上が外向きに傾く。見た目の傾きのみ)
        d.style.top = ty + 'px';
        if (card) d.onclick = () => playCard(idx);

        const finalTransform = `translateX(calc(-50% + ${tx}px)) rotate(${angle}deg)`;
        if (animateIndices.includes(idx)) {
            // 補充されたカードは画面下から少し回転しながら手札へ滑り込む
            const fromAngle = angle + (offset >= 0 ? 20 : -20);
            d.style.transition = 'none';
            d.style.transform = `translateX(calc(-50% + ${tx}px)) translateY(90px) rotate(${fromAngle}deg)`;
            d.style.opacity = '0';
            s.appendChild(d);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    d.style.transition = 'transform 0.35s ease-out, opacity 0.3s ease-out';
                    d.style.transform = finalTransform;
                    d.style.opacity = '1';
                });
            });
        } else {
            d.style.transform = finalTransform;
            s.appendChild(d);
        }
    });
}

function filledCount() {
    const idx = state.hands.indexOf(null);
    return idx === -1 ? state.hands.length : idx;
}

function updateUI(activeIndex) {
    const s = document.getElementById('slots'); s.innerHTML = '';
    state.hands.forEach((h, idx) => {
        const d = document.createElement('div');
        let cls = 'slot ' + (h ? 'filled' : 'empty');
        if (idx === activeIndex) cls += ' active-card';
        if (cardOutcomes.P[idx]) cls += ' ' + cardOutcomes.P[idx]; // ターン中の勝敗表現を保持
        d.className = cls;
        applyCardVisual(d, h);
        s.appendChild(d);
    });
    updateActionButtons();
}

function updateActionButtons() {
    const enabled = state.battleReady && !state.resolving && filledCount() > 0;
    document.getElementById('goBtn').disabled = !enabled;
    document.getElementById('clrBtn').disabled = !enabled;
}

async function fadeOutQueueCards() {
    const cards = document.querySelectorAll('#slots .slot.filled');
    if (cards.length === 0) return;
    cards.forEach(el => {
        el.style.transition = 'opacity 0.45s ease-out, transform 0.45s ease-out';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-16px) scale(1.06)'; // ふわっと浮きながら消える
    });
    await wait(450);
}

function currentEnemyPreset() {
    const id = ENEMY_ORDER[state.storyEnemyIndex % ENEMY_ORDER.length];
    return ENEMY_PRESETS[id];
}

// HPバー下の名前表示を更新する。味方は固定でVAL、敵はSTORY MODEなら現在の敵プリセット名、
// TRAINING MODEなら固定でENEMY(STORY MODEは今後の連戦で敵が変わるたびに自動で切り替わる)
function updateCharNames() {
    document.getElementById('playerName').innerText = 'VAL';
    document.getElementById('enemyName').innerText =
        state.gameMode === 'training' ? 'ENEMY' : currentEnemyPreset().name;
}

// 連戦で次の敵へ進む(YOU WIN時、決着画面のNEXT BATTLEからgoNextEnemy経由で呼ばれる)
function advanceToNextEnemy() {
    state.storyEnemyIndex = (state.storyEnemyIndex + 1) % ENEMY_ORDER.length;
    writeSaveData({ storyEnemyIndex: state.storyEnemyIndex }); // 進行状況を保存
}

function weightedRandomMove(weights) {
    const total = weights.PUNCH + weights.UPPER + weights.GUARD;
    let r = Math.random() * total;
    if (r < weights.PUNCH) return 'PUNCH';
    r -= weights.PUNCH;
    if (r < weights.UPPER) return 'UPPER';
    return 'GUARD';
}

// TRAINING MODE: プレイヤーが出した技に、必ず負ける技を返す(PUNCHにはUPPER、UPPERにはGUARD、GUARDにはPUNCH)。
// judge()の3すくみ関係(beats)と同じ対応表を使う。これにより、何を出しても必ず勝てる。
const TRAINING_LOSES_TO = { PUNCH: 'UPPER', UPPER: 'GUARD', GUARD: 'PUNCH' };
function trainingCounterMove(playerMove) {
    return TRAINING_LOSES_TO[playerMove];
}

function generateEnemyTurnHand(count) {
    // STORY MODE: 現在の敵プリセットの配分に基づいて生成する(favoritePatternsは今後ここに組み込む)
    const weights = currentEnemyPreset().deck;
    const arr = [];
    for (let i = 0; i < count; i++) arr.push(weightedRandomMove(weights));
    return arr;
}

function drawEnemySlots(activeIndex) {
    // 第2条: 公開済み(enemyRevealedUpTo)の枚数までは中身を見せ、それ以降は伏せ札(?)にする
    const s = document.getElementById('enemySlots'); s.innerHTML = '';
    state.enemyHands.forEach((h, idx) => {
        const d = document.createElement('div');
        let cls = 'slot filled';
        if (idx === activeIndex) cls += ' active-card';
        if (cardOutcomes.E[idx]) cls += ' ' + cardOutcomes.E[idx]; // ターン中の勝敗表現を保持
        d.className = cls;
        if (idx < state.enemyRevealedUpTo) {
            applyCardVisual(d, h);
        } else {
            d.style.backgroundImage = 'none';
            d.innerText = '?';
        }
        s.appendChild(d);
    });
}

// ============================================================
// バトル進行
// ============================================================
function goBattleStart() {
    writeSaveData({ deckCounts: { PUNCH: deckCounts.PUNCH, UPPER: deckCounts.UPPER, GUARD: deckCounts.GUARD } }); // デッキ編成を保存
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    // STORY MODEはステージ(敵)ごとに異なるBGMを流す。未配置の場合は汎用のbgm_battleへフォールバックする
    playBGM('bgm_battle_' + (state.storyEnemyIndex + 1), 'bgm_battle');
}

function resetBattleState() {
    // 第13条: state自体は再定義せず、プロパティのみ初期値に戻す
    state.hpP = 100; state.hpE = 100;
    state.turn = 0;
    state.hands = new Array(5).fill(null);
    state.pX = DB.POS.P_HOME_X; state.eX = DB.POS.E_HOME_X;
    state.pY = DB.POS.GROUND_Y; state.eY = DB.POS.GROUND_Y;
    state.pAct = 'IDLE'; state.eAct = 'IDLE';
    state.pShakeUntil = 0; state.eShakeUntil = 0;
    state.pBlinkUntil = 0; state.eBlinkUntil = 0;
    state.pLastAtk = null; state.eLastAtk = null;
    state.pNumbed = false;
    state.eNumbed = false;
    state.piyoSide = null;
    state.pPunchStreak = 0;
    state.ePunchStreak = 0;
    state.pGuardStreak = 0;
    state.eGuardStreak = 0;
    state.pChargeValue = 0;
    state.eChargeValue = 0;
    state.pComboType = null; state.eComboType = null;
    state.pComboStart = -1; state.eComboStart = -1;
    state.pComboAlive = false; state.eComboAlive = false;
    state.lastExchangeResult = null;
    state.finisherAlreadyDown = false;
    state.pGuardHoldPose = false;
    state.eGuardHoldPose = false;
    state.gameMode = state.pendingMode || 'story'; // デッキ編成画面へ来た時に選んだモードを確定
    updateCharNames(); // 味方=VAL(固定)、敵=STORY MODEなら現在の敵プリセット名、TRAINING MODEならENEMY
    state.introCharAlpha = 0; // 開始演出でふわっと表示するため、まずは透明から
    state.bgRevealRadius = 0; // 背景も真っ暗な状態からスタート
    state.battleReady = false; // 開始演出が終わるまで操作不可
    state.resolving = false;
    trails = [];
    cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) };

    // デッキ編成画面で決めた配分から山札を構築し、初期手札5枚を引く。
    // TRAINING MODEのみ、山札を使わず固定でPUNCH/UPPER/GUARDの3枚を手札にする(タップしても減らない=選び放題)。
    if (state.gameMode === 'training') {
        state.playerDeck = [];
        state.playerDiscard = [];
        state.playerHand = ['PUNCH', 'UPPER', 'GUARD'];
    } else {
        state.playerDeck = buildDeckArray(deckCounts);
        state.playerDiscard = [];
        state.playerHand = new Array(5).fill(null);
        for (let i = 0; i < 5; i++) state.playerHand[i] = drawCard();
    }

    document.getElementById('hpP').style.width = '100%';
    document.getElementById('hpP_y').style.width = '100%';
    document.getElementById('hpE').style.width = '100%';
    document.getElementById('hpE_y').style.width = '100%';
    document.getElementById('turnDisplay').innerHTML = 'TURN<br>0';
    document.querySelectorAll('.controls button').forEach(b => b.disabled = true); // 演出完了までは操作不可
    document.getElementById('howToBtn').disabled = false; // HOW TOは常に押せる
    document.getElementById('optionBattleBtn').disabled = false; // OPTIONも同様
    const bst = document.getElementById('battleStartText');
    bst.classList.remove('enter', 'exit');
    hideResult();
    updateUI();
    document.getElementById('handRow').innerHTML = ''; // 手札はBATTLE START後にdealInitialHandAnimation()で配る
    updateDeckCountDisplay();

    // 敵の手はターンごとに(必要枚数だけ)生成する。開始時点では空。
    // TRAINING MODEは、GO!を押した時点でプレイヤーの手に応じて必ず負ける手を生成する(resolveTurn内)。
    state.enemyHands = [];
    state.enemyRevealedUpTo = 0;
    drawEnemySlots();
}

async function playBattleIntro() {
    await wait(300); // 真っ暗な状態を一瞬見せる

    // 味方と敵をふわっとフェードイン
    const fadeSteps = 10;
    for (let s = 1; s <= fadeSteps; s++) {
        state.introCharAlpha = s / fadeSteps;
        await wait(50);
    }
    state.introCharAlpha = 1;
    await wait(200);

    // 背景が中心から広がるように表示される(canvas上を円形クリップで拡大)
    const maxRadius = Math.hypot(cvs.width / 2, cvs.height / 2) + 20; // 対角線の半分+余裕分で確実に全面を覆う
    const revealSteps = 16;
    for (let s = 1; s <= revealSteps; s++) {
        state.bgRevealRadius = maxRadius * (s / revealSteps);
        await wait(1300 / revealSteps);
    }
    state.bgRevealRadius = maxRadius;

    // BATTLE START: 左からディゾルブして中央で停止
    const bst = document.getElementById('battleStartText');
    bst.classList.add('enter');
    await wait(650);
    await wait(450); // 中央で少し静止

    // 拡大しながら消える
    bst.classList.add('exit');
    await wait(550);
    bst.classList.remove('enter', 'exit');

    await dealInitialHandAnimation(); // 手札を裏向きで配り、左から順にめくる(バトル開始時だけの演出)

    state.battleReady = true;
    updateActionButtons();
}

function showResult(type) {
    // 5人目(最終)の敵をYOU WINで倒した場合のみ、通常の決着画面ではなく専用のエンディング演出に分岐する
    const isFinalVictory = (type !== 'KO') && (state.storyEnemyIndex === ENEMY_ORDER.length - 1);

    document.getElementById('resultText').innerText = type === 'KO' ? 'K.O.' : 'YOU WIN';

    // 決着音・決着BGM: K.O.は効果音のみでバトルBGMを止め、YOU WINは効果音と共に勝利BGMへ切り替える
    if (type === 'KO') {
        playSE('se_ko');
        stopBGM();
    } else {
        playSE('se_win');
        playBGM('bgm_victory');
    }

    // STORY MODEで被ダメージ0のまま勝利した場合、YOU WINの上に「PERFECT !」を表示する(実績の解除自体はここでは行わない)
    const isPerfect = type !== 'KO' && state.gameMode === 'story' && state.hpP === 100;
    document.getElementById('resultPerfectText').style.display = isPerfect ? '' : 'none';

    const continueBtn = document.getElementById('continueBtn');
    const backTitleBtn = document.getElementById('backTitleBtn');

    if (isFinalVictory) {
        // ボタンは表示せず、YOU WINの余韻を見せた後、自動でエンディングへ遷移する(runFinalVictorySequence内で5秒待機)
        continueBtn.style.display = 'none';
        backTitleBtn.style.display = 'none';
        document.getElementById('resultOverlay').classList.add('show');
        runFinalVictorySequence();
        return;
    }

    // K.O.(敗北)・YOU WIN(勝利、最終戦以外)いずれもボタン(id: continueBtn)を表示するが、ラベルと遷移先が異なる。
    // K.O.時は「CONTINUE」表記で直前のデッキ編成へ(同じ敵と再戦)、YOU WIN時は「NEXT BATTLE」表記で次の敵へ進めてからストーリーシーンを経てデッキ編成へ遷移する。
    continueBtn.style.display = 'inline-block';
    backTitleBtn.style.display = 'inline-block';
    continueBtn.innerText = (type === 'KO') ? 'CONTINUE' : 'NEXT BATTLE';
    continueBtn.onclick = (type === 'KO') ? (() => goDeckBuild()) : goNextEnemy;
    document.getElementById('resultOverlay').classList.add('show');
}

function hideResult() {
    document.getElementById('resultOverlay').classList.remove('show');
}

function judge(p, e) {
    if (p === e) return 'draw';
    const beats = { PUNCH: 'UPPER', UPPER: 'GUARD', GUARD: 'PUNCH' };
    return beats[p] === e ? 'win' : 'lose';
}

// ガード2連続成功によるチャージが、指定した攻撃側(side)のこの攻防で有効かどうかの倍率(1または2)を返す。
// resolveExchangeの冒頭で、次に出すカードが確定した時点で1回だけ決定される(勝敗に関わらず消費済み)。
function chargeMultOf(side) {
    const v = side === 'P' ? state.pChargeValue : state.eChargeValue;
    return v || 1; // チャージが無ければ等倍
}

// チャージを消費する(ガード成功以外の攻防終了時に呼ぶ)。勝敗に関わらず、次に出したカードで必ず消費される。
function consumeCharge(side) {
    if (side === 'P') state.pChargeValue = 0; else state.eChargeValue = 0;
}

function applyDamage(target, amount) {
    if (target === 'E') {
        state.hpE = Math.max(0, state.hpE - amount);
        document.getElementById('hpE').style.width = state.hpE + '%';
        setTimeout(() => { document.getElementById('hpE_y').style.width = state.hpE + '%'; }, 0); // 第17条
    } else {
        state.hpP = Math.max(0, state.hpP - amount);
        document.getElementById('hpP').style.width = state.hpP + '%';
        setTimeout(() => { document.getElementById('hpP_y').style.width = state.hpP + '%'; }, 0);
    }
    triggerBlink(target, 180); // どんなダメージでも、受けた側を一瞬点滅させる
}

function healBothToFull() {
    state.hpP = 100; state.hpE = 100;
    document.getElementById('hpP').style.width = '100%';
    document.getElementById('hpP_y').style.width = '100%';
    document.getElementById('hpE').style.width = '100%';
    document.getElementById('hpE_y').style.width = '100%';
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// 第24条: 双方が残像付きのdash.PNGでX座標を目標地点まで移動する汎用関数。
// ただしピヨり中(state.piyoSide)の側は、次のコマンドが始まるまでその場に留まり、dashで動かない(位置・残像とも据え置き)。
async function moveBothX(pTo, eTo, steps = 6, stepMs = 40) {
    const pFrozen = state.piyoSide === 'P';
    const eFrozen = state.piyoSide === 'E';
    // ガード成功後、相手がしびれている間は構え(guard.PNG)を維持し、dash.PNGへ上書きしない
    if (!pFrozen && !state.pGuardHoldPose) state.pAct = 'dash.PNG';
    if (!eFrozen && !state.eGuardHoldPose) state.eAct = 'dash.PNG';
    const pFrom = state.pX, eFrom = state.eX;
    for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        if (!pFrozen) state.pX = pFrom + (pTo - pFrom) * t;
        if (!eFrozen) state.eX = eFrom + (eTo - eFrom) * t;
        if (!pFrozen) trails.push({ side: 'P', x: state.pX, y: state.pY, born: performance.now() });
        if (!eFrozen) trails.push({ side: 'E', x: state.eX, y: state.eY, born: performance.now() });
        await wait(stepMs);
    }
}

async function approachCenter() { await moveBothX(DB.POS.P_ATTACK_X, DB.POS.E_ATTACK_X); }

async function retreatSlightly() { await moveBothX(DB.POS.P_RETREAT_X, DB.POS.E_RETREAT_X, 4, 35); }

// 指定した片側だけを、現在位置から目標X座標までアニメーション付きで後退させる(相手側は動かさない)。
// 地上パンチの連続ヒットで威力が増していく演出(2発目=少し後退、3発目=ホーム位置まで後退)に使う。
async function knockbackTo(side, targetX) {
    const steps = 5, stepMs = 30;
    const fromX = getX(side);
    for (let s = 1; s <= steps; s++) {
        setX(side, fromX + (targetX - fromX) * (s / steps));
        await wait(stepMs);
    }
    setX(side, targetX);
}

async function goHome() { await moveBothX(DB.POS.P_HOME_X, DB.POS.E_HOME_X); }

// 第5条: 着地同期。現在の高さ(通常/PUNCH+PUNCH+UPPERどちらでも実際のYを起点にする)から
// 地面まで、固定ステップ数・固定所要時間でアニメーションさせる。高い位置からでも同じ時間で降りるため、
// 見た目の落下速度は距離に応じて自然に速くなる(間延びしない)。
async function waitBothLanded() {
    const steps = 6, stepMs = 30;
    const pFromY = state.pY, eFromY = state.eY;
    for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        state.pY = pFromY + (DB.POS.GROUND_Y - pFromY) * t;
        state.eY = eFromY + (DB.POS.GROUND_Y - eFromY) * t;
        await wait(stepMs);
    }
    state.pY = DB.POS.GROUND_Y;
    state.eY = DB.POS.GROUND_Y;
    await wait(50);
}

// 決着演出: 体力を0にする最後の一撃を受けた側の専用シーケンス。
// 必殺技(GUARD+PUNCH+GUARD+PUNCH+PUNCH)でK.O.した場合(state.finisherAlreadyDown)は、
// 画面端で既にdown.PNGになっているため、通常のホーム帰還バウンド演出は行わずそのまま結果表示へ進む。
async function runFinishSequence(loserSide) {
    if (state.finisherAlreadyDown) {
        await wait(700);
        showResult(loserSide === 'P' ? 'KO' : 'WIN');
        return;
    }

    setAct(loserSide, 'damage.PNG');
    triggerBlink(loserSide, 1300);
    triggerShake(loserSide, 400);
    await wait(900); // 一呼吸置いて余韻を出す

    const homeX = loserSide === 'P' ? DB.POS.P_HOME_X : DB.POS.E_HOME_X;
    const fromX = getX(loserSide);
    const bounceSteps = 10;
    for (let s = 1; s <= bounceSteps; s++) {
        const t = s / bounceSteps;
        setX(loserSide, fromX + (homeX - fromX) * t);
        const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * 18 * (1 - t); // 減衰する軽いバウンド
        setY(loserSide, DB.POS.GROUND_Y - bounce);
        await wait(140); // スローモーション気味に間隔を長く取る
    }
    setX(loserSide, homeX);
    setY(loserSide, DB.POS.GROUND_Y);
    setAct(loserSide, 'down.PNG');
    await wait(700);

    showResult(loserSide === 'P' ? 'KO' : 'WIN');
}

function nextQueuedMove(side, cursor) {
    const idx = cursor.i + 1;
    return side === 'P' ? state.hands[idx] : state.enemyHands[idx];
}

// 地上の連続パンチも、空中コンボと同様にpunch.PNG/punch2.PNGを交互に使う(第21条)。
// 本関数はPUNCH勝利時のみ呼ばれる想定だが、念のためPUNCH以外はmoveSpriteにフォールバックする。
async function runNormalHit(winner, loser, move) {
    setAct(winner, move === 'PUNCH' ? nextPunchSprite(winner) : moveSprite(move));
    setAct(loser, 'damage.PNG');
    const winnerStreakKey = winner === 'P' ? 'pPunchStreak' : 'ePunchStreak';
    const loserStreakKey = loser === 'P' ? 'pPunchStreak' : 'ePunchStreak';
    const cyclePos = state[winnerStreakKey] % 3; // 0=1発目, 1=2発目, 2=3発目(この後4発目で0に戻る)
    const dmg = (DB.DMG.P + cyclePos * DB.DMG.P_COMBO_STEP) * chargeMultOf(winner); // 3発周期で増加、チャージ中は2倍/4倍
    state[winnerStreakKey]++; // 命中したので連続記録を伸ばす
    state[loserStreakKey] = 0; // 負けた側の連続記録は途切れる
    state.pGuardStreak = 0; state.eGuardStreak = 0; // ガード以外で勝敗が決したのでガード連続記録は途切れる
    consumeCharge(winner); consumeCharge(loser); // ガード勝利以外なので、双方のチャージをここで消費する
    applyDamage(loser, dmg);
    triggerShake(loser, 350); // 第8条: 負けた側のみ振動
    if (move === 'PUNCH') playSE('se_punch');

    // 威力が増していく演出: 2発目は少し後退、3発目はホーム位置まで大きく後退する(1発目・4発目相当は後退なし)
    if (cyclePos === 1) {
        await knockbackTo(loser, loser === 'P' ? DB.POS.P_RETREAT_X : DB.POS.E_RETREAT_X);
    } else if (cyclePos === 2) {
        await knockbackTo(loser, loser === 'P' ? DB.POS.P_HOME_X : DB.POS.E_HOME_X);
    }

    await wait(300);
    toIdle();
}

async function runMeteor(attacker, defender) {
    applyDamage(defender, DB.DMG.M * chargeMultOf(attacker));
    setAct(attacker, 'knock.PNG');
    setAct(defender, 'damage.PNG');
    await wait(400); // 一時停止

    // 打たれる方が先に地面へ落下(実際の現在の高さを起点にする。PUNCH+PUNCH+UPPERで通常より高い位置にいても正しく動作する)
    const defenderFromY = getY(defender);
    const fallSteps = 5;
    for (let s = 1; s <= fallSteps; s++) {
        setY(defender, defenderFromY + (DB.POS.GROUND_Y - defenderFromY) * (s / fallSteps));
        await wait(30);
    }
    setY(defender, DB.POS.GROUND_Y);
    triggerShake(defender, 500);
    triggerBlink(defender, 900); // 振動＋点滅

    await wait(60); // 打つ方は少し遅れて急降下開始
    const attackerFromY = getY(attacker);
    const atkFallSteps = 6;
    for (let s = 1; s <= atkFallSteps; s++) {
        setY(attacker, attackerFromY + (DB.POS.GROUND_Y - attackerFromY) * (s / atkFallSteps));
        await wait(35);
    }
    setY(attacker, DB.POS.GROUND_Y);
    setAct(attacker, 'knock2.PNG');
    triggerShake(attacker, 350);
    await wait(500);
    toIdle();
}

async function runUpperCombo(attacker, defender, cursor) {
    // PUNCH+PUNCH+UPPER: 直前2連続の地上PUNCH勝利(pPunchStreak/ePunchStreak >= 2)に続けてUPPERで勝った場合、
    // このアッパーは2倍の高さ・2倍の速度で打ち上げ、ダメージも2倍になる。ストリークをリセットする前に判定する。
    const winnerStreakKey = attacker === 'P' ? 'pPunchStreak' : 'ePunchStreak';
    const isSuperUpper = state[winnerStreakKey] >= 2;
    if (isSuperUpper) markSpecialUsed('superUpper'); // 実績: PUNCH+PUNCH+UPPERの使用を記録

    // UPPERが決まった時点で地上パンチの連続記録は途切れる(コンボ中の空中パンチとは別カウント)
    state.pPunchStreak = 0;
    state.ePunchStreak = 0;
    state.pGuardStreak = 0; state.eGuardStreak = 0; // ガード以外で勝敗が決したのでガード連続記録は途切れる

    setAct(attacker, 'upper.PNG');
    setAct(defender, 'damage.PNG');
    applyDamage(defender, DB.DMG.U * chargeMultOf(attacker) * (isSuperUpper ? 2 : 1));
    triggerShake(defender, 300);

    // 上昇アニメーション: 地面(または現在の高さ)から浮遊高さまで、固定ステップ数・固定所要時間で上昇させる。
    // PUNCH+PUNCH+UPPERの場合は目標の高さが2倍になるため、同じ時間でより長い距離を移動する=体感速度も2倍になる。
    // PUNCH+PUNCH+UPPERの上昇中は、通常のアッパーより強く見えるよう残像を残す(第24条の残像表現を流用)。
    const floatTargetY = isSuperUpper ? DB.POS.SUPER_FLOAT_Y : DB.POS.FLOAT_Y;
    const hopTargetY = isSuperUpper ? DB.POS.SUPER_HOP_Y : DB.POS.HOP_Y;
    const riseSteps = 6, riseStepMs = 45;
    const defenderFromY = getY(defender), attackerFromY = getY(attacker);
    for (let s = 1; s <= riseSteps; s++) {
        const t = s / riseSteps;
        setY(defender, defenderFromY + (floatTargetY - defenderFromY) * t);
        setY(attacker, attackerFromY + (hopTargetY - attackerFromY) * t);
        if (isSuperUpper) {
            trails.push({ side: attacker, x: getX(attacker), y: getY(attacker), born: performance.now(), sprite: 'upper.PNG', life: 260, maxAlpha: 0.5 });
            trails.push({ side: defender, x: getX(defender), y: getY(defender), born: performance.now(), sprite: 'damage.PNG', life: 260, maxAlpha: 0.5 });
        }
        await wait(riseStepMs);
    }
    await wait(430); // 空中での間(上昇分と合わせて元の700ms相当を維持)

    let airPunches = 0;
    while (true) {
        const next = nextQueuedMove(attacker, cursor);
        if (next !== 'PUNCH') break;
        cursor.i++; // 次のコマンドを消費してコンボ継続
        updateUI(cursor.i); // ハイライトも追従させる
        drawEnemySlots(cursor.i);
        airPunches++;

        if (airPunches < DB.MAX_AIR_PUNCH) {
            if (isSuperUpper && airPunches === 1) {
                // PUNCH+PUNCH+UPPERで2倍の高さまで飛ばした場合でも、空中コンボ自体は通常と同じ高さで行う。
                // 1発目の追撃(このタイミング)までに間に合うよう、速度を上げて通常の高さへ戻す。
                const descSteps = 4, descStepMs = 25;
                const attackerFromY = getY(attacker), defenderFromY = getY(defender);
                for (let s = 1; s <= descSteps; s++) {
                    const dt = s / descSteps;
                    setY(attacker, attackerFromY + (DB.POS.AIR_FOLLOW_Y - attackerFromY) * dt);
                    setY(defender, defenderFromY + (DB.POS.FLOAT_Y - defenderFromY) * dt);
                    await wait(descStepMs);
                }
            } else {
                // 通常の空中パンチ: 打つ方が追従して浮き、空中で殴る。連続ヒットするほどダメージが増加する
                setY(attacker, DB.POS.AIR_FOLLOW_Y);
            }
            setAct(attacker, nextPunchSprite(attacker)); // 第21条
            markCardOutcome(defender, cursor.i, 'card-shatter'); // 3すくみ無視のコンボ継続: ヒビ割れる
            const comboDmg = (DB.DMG.P + (airPunches - 1) * DB.DMG.P_COMBO_STEP) * chargeMultOf(attacker); // 1発目=P, 2発目=P+STEP...
            applyDamage(defender, comboDmg);
            triggerShake(defender, 200);
            await wait(500);
        } else {
            // 3発目: メテオへ変換
            markCardOutcome(defender, cursor.i, 'card-shatter'); // 3すくみ無視のメテオ: ヒビ割れる
            consumeCharge(attacker); consumeCharge(defender); // ガード勝利以外なので、コンボ全体の終わりにまとめて消費する
            await runMeteor(attacker, defender);
            return;
        }
    }

    consumeCharge(attacker); consumeCharge(defender); // ガード勝利以外なので、コンボ全体の終わりにまとめて消費する

    // コンボ終了(メテオに至らない場合): アニメーション付きで双方着地(高い位置からでも間延びしない。第5条)
    await waitBothLanded();
    setAct(attacker, 'dash.PNG'); // 第6条
    setAct(defender, 'damage.PNG'); // 第6条
    await wait(300);
    toIdle();
}

// GUARDが勝った場合の演出(勝った側はガードのまま反撃、負けた側はしびれる)
// 第3すくみの通り、GUARDに勝てるのはPUNCHのみなので、通常は負けた側が必ずpunch.PNGの姿勢になる。
// ただし、しびれによる無条件敗北(runNumbFail)経由で呼ばれた場合は、負けた側が実際にPUNCHを出していたとは限らないため、
// loserPoseOverrideでポーズを明示的に上書きできるようにしている(その場合はdamage.PNGを指定する)。
// ブロックされた瞬間からピヨり(頭上のpiyo.PNG)を開始し、以後damage.PNGの姿勢のまま維持する(IDLEには戻さない)。
// このピヨり状態は、次の攻防でしびれ判定が解決される瞬間(resolveExchange)まで継続する。
async function runGuardSuccess(winner, loser, loserPoseOverride) {
    state.pPunchStreak = 0; // ガードでパンチが止まった場合も連続記録は途切れる
    state.ePunchStreak = 0;
    setAct(winner, 'guard.PNG');
    setAct(loser, loserPoseOverride || 'punch.PNG'); // ブロックされた瞬間の姿勢(通常はパンチのまま)
    applyDamage(winner, DB.DMG.TINY); // 自己反動の微ダメージのため、チャージ倍率は適用しない
    playSE('se_guard');
    triggerShake(winner, 250);
    triggerShake(loser, 400); // しびれによる振動(ダメージなし)
    if (loser === 'P') state.pNumbed = true; else state.eNumbed = true; // 次のコマンドの成功率が1/2になる
    if (winner === 'P') state.pGuardHoldPose = true; else state.eGuardHoldPose = true; // 相手がしびれている間、ガードの構えを維持する
    consumeCharge(loser); // 敗者側は「次に出したカード」がガードに防がれて負けたので、持っていたチャージがあればここで消費される

    // ガード+ガード(チャージ): 同一ターン内でガード成功が2回連続すると2倍、3回連続以降は4倍(上限)になる。
    // ガード成功自体はチャージを消費しない(次に出したカードが実際に攻撃として命中/失敗した時に初めて消費される)。
    const winnerGuardStreakKey = winner === 'P' ? 'pGuardStreak' : 'eGuardStreak';
    const loserGuardStreakKey = loser === 'P' ? 'pGuardStreak' : 'eGuardStreak';
    state[winnerGuardStreakKey]++;
    state[loserGuardStreakKey] = 0;
    if (state[winnerGuardStreakKey] >= 3) {
        if (winner === 'P') state.pChargeValue = 4; else state.eChargeValue = 4; // 3連続以降は4倍が上限
        markSpecialUsed('charge'); // 実績: ガード+ガードの使用を記録
    } else if (state[winnerGuardStreakKey] >= 2) {
        if (winner === 'P') state.pChargeValue = 2; else state.eChargeValue = 2; // 2連続で2倍発動
        markSpecialUsed('charge'); // 実績: ガード+ガードの使用を記録
    }

    await wait(400);
    setAct(loser, 'damage.PNG'); // ブロック反応から、しびれてダウン気味の姿勢へ
    startPiyo(loser); // ここから次の攻防が解決されるまでピヨり続ける(チャージとは独立して、通常通りターン終了時に解消される)
    await wait(100);
}

async function runNumbFail(numbedSide, cursor, pAct, eAct) {
    const winner = numbedSide === 'P' ? 'E' : 'P';
    const loser = numbedSide;
    const winnerMove = winner === 'P' ? pAct : eAct;

    // ピヨりは前の攻防(GUARDにブロックされた瞬間)から継続表示中。ここでは点滅を強めて「発動」を演出するだけに留める
    setAct(loser, 'damage.PNG');
    triggerBlink(loser, 1400);
    await wait(700);

    // 相手の技の種類に応じた通常の勝敗処理へ(空中コンボならコンボも発生する)
    if (winnerMove === 'UPPER') {
        await runUpperCombo(winner, loser, cursor);
    } else if (winnerMove === 'GUARD') {
        await runGuardSuccess(winner, loser, 'damage.PNG'); // しびれ側は実際に出していた技に関わらずdamage.PNGにする
    } else {
        await runNormalHit(winner, loser, winnerMove);
    }
}

function markCardOutcome(side, idx, outcomeClass) {
    const arr = side === 'P' ? cardOutcomes.P : cardOutcomes.E;
    arr[idx] = outcomeClass || null; // ターンが終わるまで保持する
    const container = document.getElementById(side === 'P' ? 'slots' : 'enemySlots');
    const el = container.children[idx];
    if (!el) return;
    el.classList.remove('card-lose', 'card-shatter');
    if (outcomeClass) el.classList.add(outcomeClass);
}

// このターンの手札から特殊コンボの種類を判定する。
// 'finisher'(GUARD+PUNCH+GUARD+PUNCH+PUNCH)は手札の1〜5枚目に固定で該当するかのみを見る。
// 該当する場合は即座に返す(内部にPUNCH+GUARD+PUNCHの並びを含むが、followup判定へは進まないため自動的にキャンセルされる)。
// 'followup'(PUNCH+GUARD+PUNCH)は、手札のどの位置でも3連続で出ていれば該当し、開始インデックス(start)も返す。
function detectComboType(hand, total) {
    if (total >= 5 && hand[0] === 'GUARD' && hand[1] === 'PUNCH' && hand[2] === 'GUARD' && hand[3] === 'PUNCH' && hand[4] === 'PUNCH') {
        return { type: 'finisher', start: 0 };
    }
    for (let start = 0; start + 2 < total; start++) {
        if (hand[start] === 'PUNCH' && hand[start + 1] === 'GUARD' && hand[start + 2] === 'PUNCH') {
            return { type: 'followup', start };
        }
    }
    return { type: null, start: -1 };
}

// PUNCH+GUARD+PUNCH(1〜3枚目が全て勝利)成立時の追撃。punch.PNG/punch2.PNGを素早く切り替えながら3連打し、必ずヒットする。
// 合計ダメージは通常パンチ1発の3倍(1発ごとにDB.DMG.P、チャージ等の影響は受けない)。
async function runFollowUpFlurry(attacker, defender) {
    for (let i = 0; i < 3; i++) {
        setAct(attacker, nextPunchSprite(attacker)); // 第21条
        setAct(defender, 'damage.PNG');
        applyDamage(defender, DB.DMG.P);
        triggerShake(defender, 150);
        await wait(120); // 素早い連打
    }
    await wait(200);
    toIdle();
}

// GUARD+PUNCH+GUARD+PUNCH+PUNCH(1〜4枚目が全て勝ちまたは相打ち)成立時の必殺技。
// 3すくみ判定を行わずヒット確定で固定ダメージ(チャージ等の影響を受けない)を与え、被弾側を画面端まで吹き飛ばす。
// 被弾側はdamage.PNGのまま端まで飛び、ぶつかって点滅した後knock2.PNGになり、通常のターン終了処理で定位置へ戻る。
// このダメージでK.O.した場合は、画面端でdown.PNGのまま倒れさせ、通常の決着演出(ホームへの帰還バウンド)はスキップする。
async function runFinisher(attacker, defender, cursor) {
    setAct(attacker, nextPunchSprite(attacker)); // 第21条
    setAct(defender, 'damage.PNG');
    markCardOutcome(defender, cursor.i, 'card-shatter'); // 3すくみ無視のヒットなのでヒビ割れ表現にする
    applyDamage(defender, DB.DMG.FINISHER);
    triggerShake(defender, 300);
    await wait(150);

    // 被弾側を画面端まで吹き飛ばす(damage.PNGのまま)
    const edgeX = defender === 'P' ? DB.POS.EDGE_P_X : DB.POS.EDGE_E_X;
    const fromX = getX(defender);
    const flySteps = 8, flyStepMs = 30;
    for (let s = 1; s <= flySteps; s++) {
        setX(defender, fromX + (edgeX - fromX) * (s / flySteps));
        await wait(flyStepMs);
    }
    setX(defender, edgeX);

    // 端にぶつかって点滅
    triggerBlink(defender, 500);
    triggerShake(defender, 300);
    await wait(500);

    const isLethal = (defender === 'P' ? state.hpP : state.hpE) <= 0;
    if (isLethal) {
        setAct(defender, 'down.PNG'); // 画面端でそのまま倒れる。通常の決着演出のホーム帰還バウンドはスキップする
        state.finisherAlreadyDown = true;
        await wait(300);
        return;
    }

    setAct(defender, 'knock2.PNG');
    await wait(400);
    // 「元の定位置に戻る」は、このターンの通常の終了処理(goHome)がまとめて行う
}

async function resolveExchange(pAct, eAct, cursor) {
    // チャージ(state.pChargeValue/eChargeValue)はここでは消費しない。
    // ガード成功時は消費せず連続カウントを伸ばして格上げし、それ以外(PUNCH/UPPER勝利・負け・相討ち)の
    // 結果が決まった時点で、各処理関数(runNormalHit/runUpperCombo/resolveExchange内の相討ち処理)がconsumeCharge()を呼んで消費する。

    await approachCenter(); // 第24条: 残像付きで中央へ踏み込む

    // 必殺技(GUARD+PUNCH+GUARD+PUNCH+PUNCH、5枚目)の判定: 3すくみ・しびれ判定を行わずヒット確定で処理する
    if (cursor.i === 4) {
        const pFinisherReady = state.pComboType === 'finisher' && state.pComboAlive;
        const eFinisherReady = state.eComboType === 'finisher' && state.eComboAlive;
        if (pFinisherReady || eFinisherReady) {
            const attacker = pFinisherReady ? 'P' : 'E'; // 両者同時成立は理論上稀なケースのためPを優先する
            const defender = attacker === 'P' ? 'E' : 'P';
            markCardOutcome(defender, cursor.i, 'card-shatter');
            await runFinisher(attacker, defender, cursor);
            markSpecialUsed('finisher'); // 実績: 必殺技の使用を記録
            state.lastExchangeResult = attacker === 'P' ? { P: 'win', E: 'lose' } : { P: 'lose', E: 'win' };
            return;
        }
    }

    // しびれ判定: 直前の攻防でガードに阻まれた側は、1/2の確率でこの攻防に無条件で敗北する(3すくみ判定は行わない)
    if (state.pNumbed || state.eNumbed) {
        const numbedSide = state.pNumbed ? 'P' : 'E';
        const guardSide = numbedSide === 'P' ? 'E' : 'P';
        if (numbedSide === 'P') state.pNumbed = false; else state.eNumbed = false;
        if (guardSide === 'P') state.pGuardHoldPose = false; else state.eGuardHoldPose = false; // 判定が出たので構え保持を解除
        stopPiyo(); // この攻防で結果が決まるので、ここまで継続していたピヨりを終了する
        if (Math.random() < 0.5) {
            markCardOutcome(numbedSide, cursor.i, 'card-shatter'); // 3すくみ無視の敗北: ヒビ割れる
            consumeCharge(numbedSide); // しびれで無条件敗北する側のチャージも、次のカードとして消費される
            state.lastExchangeResult = numbedSide === 'P' ? { P: 'lose', E: 'win' } : { P: 'win', E: 'lose' };
            await runNumbFail(numbedSide, cursor, pAct, eAct);
            return;
        }
    }

    const result = judge(pAct, eAct);
    if (result === 'draw') {
        // 相討ち: 同じ手同士がぶつかる場合、双方が微ダメージを受けて振動し、反動で一歩下がる
        state.pPunchStreak = 0; // 相討ちでは連続記録が途切れる
        state.ePunchStreak = 0;
        state.pGuardStreak = 0; // 相討ちではガードの連続記録も途切れる
        state.eGuardStreak = 0;
        consumeCharge('P'); consumeCharge('E'); // 相討ちはどちらもガード勝利ではないため、双方のチャージを消費する
        state.lastExchangeResult = { P: 'draw', E: 'draw' };
        state.pAct = moveSprite(pAct);
        state.eAct = moveSprite(eAct);
        applyDamage('P', DB.DMG.CLASH);
        applyDamage('E', DB.DMG.CLASH);
        triggerShake('P', 300);
        triggerShake('E', 300);
        await wait(250);
        await moveBothX(DB.POS.P_RETREAT_X, DB.POS.E_RETREAT_X, 4, 30); // 反動で一歩下がる
        toIdle();
        return;
    }

    const winner = result === 'win' ? 'P' : 'E';
    const loser = winner === 'P' ? 'E' : 'P';
    const winnerMove = winner === 'P' ? pAct : eAct;
    state.lastExchangeResult = winner === 'P' ? { P: 'win', E: 'lose' } : { P: 'lose', E: 'win' };
    markCardOutcome(loser, cursor.i, 'card-lose'); // 敗者だけ暗くする。勝者は黄色いハイライトのまま

    if (winnerMove === 'UPPER') {
        await runUpperCombo(winner, loser, cursor);
    } else if (winnerMove === 'GUARD') {
        await runGuardSuccess(winner, loser); // ガード成功: 勝者は極小ダメージ、敗者はしびれる
    } else {
        await runNormalHit(winner, loser, winnerMove);
    }
}

async function resolveTurn() {
    if (state.resolving || !state.battleReady || filledCount() === 0) return;
    state.resolving = true;
    document.querySelectorAll('.controls button').forEach(b => b.disabled = true);
    document.getElementById('howToBtn').disabled = false; // HOW TOは解決中でも常に押せる
    document.getElementById('optionBattleBtn').disabled = false; // OPTIONも同様

    state.turn++;
    document.getElementById('turnDisplay').innerHTML = `TURN<br>${state.turn}`;

    const cursor = { i: 0 };
    const total = filledCount();
    let gameOverSide = null; // 'P' または 'E'。体力0になった側

    // プレイヤーが出した枚数だけ、敵も手を出してくる
    if (state.gameMode === 'training') {
        // プレイヤーが実際に場に出した手に応じて、必ず負ける手を1枚ずつ生成する(第20条: 相手と同じ枚数だけ行動する点は維持)
        state.enemyHands = state.hands.slice(0, total).map(trainingCounterMove);
        state.enemyRevealedUpTo = total; // 生成した時点で内容は確定しているため、そのまま公開する
    } else {
        state.enemyHands = generateEnemyTurnHand(total);
        state.enemyRevealedUpTo = 0; // 第2条: 中身を伏せて攻防の直前に1枚ずつ公開する
    }
    drawEnemySlots();

    // このターンの手札から特殊コンボの種類を判定する(GUARD+PUNCH+GUARD+PUNCH+PUNCHの必殺技、PUNCH+GUARD+PUNCHの追撃)。
    // 手札は既に確定しているため、攻防が始まる前(敵の手が伏せられている段階)でも判定して問題ない。
    const pCombo = detectComboType(state.hands, total);
    const eCombo = detectComboType(state.enemyHands, total);
    state.pComboType = pCombo.type; state.pComboStart = pCombo.start;
    state.eComboType = eCombo.type; state.eComboStart = eCombo.start;
    state.pComboAlive = state.pComboType !== null;
    state.eComboAlive = state.eComboType !== null;
    state.lastExchangeResult = null;
    state.finisherAlreadyDown = false;

    try {
        while (cursor.i < total) {
            if (gameOverSide) break;

            const pAct = state.hands[cursor.i];
            const eAct = state.enemyHands[cursor.i];

            if (state.gameMode !== 'training') {
                // このタイミングで敵の手を公開する(STORY MODEのみ)
                state.enemyRevealedUpTo = cursor.i + 1;
            }
            drawEnemySlots(cursor.i); // 対戦中の敵カードを光らせる
            updateUI(cursor.i);       // 対戦中の味方カードを光らせる

            await resolveExchange(pAct, eAct, cursor);

            // コンボ成立要件の判定を更新する(1つでも要件を満たさなければ不成立になる)。
            // followup(PUNCH+GUARD+PUNCH)は該当する3枚(index: start〜start+2)がすべて勝ちである必要がある。
            // finisher(GUARD+PUNCH+GUARD+PUNCH+PUNCH)は1〜4枚目(index0-3)が勝ちまたは相打ちである必要がある。
            const res = state.lastExchangeResult;
            if (res) {
                if (state.pComboType === 'followup' && cursor.i >= state.pComboStart && cursor.i <= state.pComboStart + 2 && res.P !== 'win') state.pComboAlive = false;
                if (state.pComboType === 'finisher' && cursor.i <= 3 && res.P === 'lose') state.pComboAlive = false;
                if (state.eComboType === 'followup' && cursor.i >= state.eComboStart && cursor.i <= state.eComboStart + 2 && res.E !== 'win') state.eComboAlive = false;
                if (state.eComboType === 'finisher' && cursor.i <= 3 && res.E === 'lose') state.eComboAlive = false;
            }
            // PUNCH+GUARD+PUNCHの3枚目(start+2枚目)が成立した直後に追撃を発生させる
            if (state.pComboType === 'followup' && cursor.i === state.pComboStart + 2 && state.pComboAlive) { await runFollowUpFlurry('P', 'E'); markSpecialUsed('followUp'); }
            if (state.eComboType === 'followup' && cursor.i === state.eComboStart + 2 && state.eComboAlive) { await runFollowUpFlurry('E', 'P'); markSpecialUsed('followUp'); }

            // TRAINING MODEは練習場のためK.O./YOU WIN判定を行わない(ターン終了時にHPが全回復する)
            if (state.gameMode !== 'training' && (state.hpP <= 0 || state.hpE <= 0)) {
                gameOverSide = state.hpP <= 0 ? 'P' : 'E';
                break;
            }

            cursor.i++;
            // 第16条: 攻防のたびに初期位置へ戻るのではなく、軽く距離を取るだけ
            if (cursor.i < total) {
                await retreatSlightly();
            }
        }
    } finally {
        // しびれはターンをまたいで持ち越さない仕様: 使われなかった場合はここで消える(ピヨり表示も同時に終了する)
        state.pNumbed = false;
        state.eNumbed = false;
        state.pGuardHoldPose = false;
        state.eGuardHoldPose = false;
        stopPiyo();
        // ガード連続成功のカウントは同一ターン内のみ有効。ターンをまたいで持ち越さない(チャージ状態自体は持ち越すため、ここではリセットしない)
        state.pGuardStreak = 0;
        state.eGuardStreak = 0;
        // 地上パンチの連続ヒット数(ダメージ周期)も同一ターン内のみ有効。ターンをまたいで持ち越さない
        state.pPunchStreak = 0;
        state.ePunchStreak = 0;

        // 使用したプレイヤーカードを捨て札へ送り、使った枚数分だけ山から補充する。
        // TRAINING MODEは固定パレット(選び放題)のため、捨札・補充の概念自体がなく丸ごとスキップする。
        if (state.gameMode !== 'training') {
            for (let i = 0; i < total; i++) {
                if (state.hands[i]) state.playerDiscard.push(state.hands[i]);
            }
            const drawnIndices = [];
            for (let i = 0; i < state.playerHand.length; i++) {
                if (state.playerHand[i] === null) {
                    const c = drawCard(); // 山の残数を超えては引けない(nullなら空枠のまま残る)
                    if (c !== null) {
                        state.playerHand[i] = c;
                        drawnIndices.push(i);
                    }
                }
            }
            updateHandUI(drawnIndices); // 補充分だけ画面下から回転しつつ登場するアニメーション
            updateDeckCountDisplay();
        }

        if (gameOverSide) {
            // 体力を0にする最後の一撃: 通常の帰還処理の代わりに専用の決着演出を実行
            state.battleReady = false; // 決着後は手札タップ含め操作不可にする
            await runFinishSequence(gameOverSide);
            await fadeOutQueueCards(); // 場のカードがふわっと消える
            cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) }; // ターン終了につき勝敗表現をリセット
            state.hands = new Array(5).fill(null);
            updateUI();
            state.resolving = false; // バトルは決着済み。ボタンは結果画面から「タイトルへ戻る」でリセットされる
        } else {
            // 第9条: ターン完了時のみ、残像付きでホームポジションへ確実に帰還する
            state.pY = DB.POS.GROUND_Y;
            state.eY = DB.POS.GROUND_Y;
            await goHome();
            toIdle();

            // 手札・山が共に尽きた場合のみ、Refresh演出(点滅→カウントアップ)を挟んで捨札をリシャッフルする。
            // 両者が元の立ち位置に戻った後に行う。
            const handIsEmpty = state.playerHand.every(c => c === null);
            if (handIsEmpty && state.playerDeck.length === 0) {
                await runDeckRefresh();
                const refillIndices = [];
                for (let i = 0; i < state.playerHand.length; i++) {
                    if (state.playerHand[i] === null) {
                        const c = drawCard();
                        if (c !== null) { state.playerHand[i] = c; refillIndices.push(i); }
                    }
                }
                updateHandUI(refillIndices);
                updateDeckCountDisplay();
            }

            await fadeOutQueueCards(); // 場のカードがふわっと消える
            cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) }; // ターン終了(両者が定位置へ戻った後)につき勝敗表現をリセット
            if (state.gameMode === 'training') {
                healBothToFull(); // TRAINING MODE: ターン終了ごとに双方のHPを全回復する
            }
            state.hands = new Array(5).fill(null); // 第1条: 5つの空枠に戻す
            updateUI();
            state.enemyHands = [];
            state.enemyRevealedUpTo = 0;
            drawEnemySlots();
            state.resolving = false;
        }
    }
}

// ============================================================
// UIポップアップ
// ============================================================
function openHowTo() {
    document.getElementById('howToOverlay').classList.add('show');
}

function closeHowTo() {
    document.getElementById('howToOverlay').classList.remove('show');
}

function closeHowToBackdrop(e) {
    if (e.target.id === 'howToOverlay') closeHowTo();
}

function openOption() {
    updateOptionUI();
    document.getElementById('optionOverlay').classList.add('show');
}

function closeOption() {
    document.getElementById('optionOverlay').classList.remove('show');
}

function closeOptionBackdrop(e) {
    if (e.target.id === 'optionOverlay') closeOption();
}

function updateOptionUI() {
    document.querySelector(`input[name="soundRadio"][value="${state.soundOn ? 'on' : 'off'}"]`).checked = true;
    document.getElementById('bgmVolumeSlider').value = Math.round(state.bgmVolume * 100);
    document.getElementById('seVolumeSlider').value = Math.round(state.seVolume * 100);
    document.getElementById('optionItemsRow').style.display = unlockedItems.length > 0 ? 'flex' : 'none';
    // 実績で解除された項目のみ、対応する行を表示する
    document.getElementById('optionSubStoryRow').style.display = unlockedSubStories.length > 0 ? 'flex' : 'none';
    document.getElementById('optionSoundTestRow').style.display = soundTestUnlocked ? 'flex' : 'none';
    document.getElementById('optionCostumeRow').style.display = unlockedSkins.length > 0 ? 'flex' : 'none';
    // タイトルから開いた場合は「今のバトル」が存在しないため、RETRY/RETURN TO TITLEを隠す
    const isTitle = document.getElementById('sceneTitle').classList.contains('active');
    document.getElementById('optionFooter').style.display = isTitle ? 'none' : 'flex';
    // TRAINING MODEはデッキ編成を経由しない(選び放題の固定手札のため)、RETRYボタン自体を隠す
    document.getElementById('optionRetryBtn').style.display = state.gameMode === 'training' ? 'none' : '';
    // RETURN TO TITLEの確認文言: STORY MODEは進行状況の保存に触れるが、TRAINING MODEは進行状況を持たないため短い文言にする
    document.getElementById('returnConfirmText').innerHTML = state.gameMode === 'training'
        ? 'タイトルに戻りますか？'
        : 'タイトルに戻りますか？<br>（ストーリーの進行状況は保存されます）';
    closeResetConfirm(); // 開き直したら確認状態はリセット
    closeRetryConfirm();
    closeReturnConfirm();
}

function setSound(on) {
    state.soundOn = on;
    writeSaveData({ soundOn: on });
    if (!on) {
        stopBGM(); // OFFにした瞬間、鳴っているBGMを止める
    } else if (currentBgmName) {
        // 直前まで鳴らそうとしていたBGMがあれば、ONに戻した時点で再生を試みる
        const name = currentBgmName;
        currentBgmName = null; // playBGMの「同じ名前なら何もしない」ガードを一旦外す
        playBGM(name);
    }
}

function openResetConfirm() { document.getElementById('resetConfirmPanel').classList.add('show'); }

function closeResetConfirm() { document.getElementById('resetConfirmPanel').classList.remove('show'); }

// OPTION内の「進行状況(セーブデータ)のリセット」: storyEnemyIndexをセーブデータごと0に戻す。
// これによりタイトルのCONTINUEも即座に消える(図鑑等の隠し要素のリセットは別途用意する予定)。
function doResetProgress() {
    state.storyEnemyIndex = 0;
    writeSaveData({ storyEnemyIndex: 0 });
    updateTitleContinueVisibility();
    closeResetConfirm();
}

function openItemGallery() {
    alert('図鑑機能は準備中です。');
}

// ------- SUB STORY(一覧/閲覧) -------
function openSubStoryList() {
    const rows = document.getElementById('subStoryListRows');
    rows.innerHTML = '';
    unlockedSubStories.slice().sort((a, b) => a - b).forEach(idx => {
        const enemyKey = ENEMY_ORDER[idx];
        const sub = SUBSTORY_BY_ENEMY[enemyKey];
        if (!sub) return;
        const row = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = `<span class="option-label">${sub.title}</span><button onclick="readSubStory(${idx})">読む</button>`;
        rows.appendChild(row);
    });
    if (unlockedSubStories.length === 0) {
        rows.innerHTML = '<p style="color:#888;">まだ何も解除されていません。</p>';
    }
    document.getElementById('subStoryListView').style.display = '';
    document.getElementById('subStoryReadView').style.display = 'none';
    document.getElementById('subStoryOverlay').classList.add('show');
}
let subStoryToken = 0;
let subStoryTapResolve = null; // サブストーリーのタップ待ち中のPromiseのresolve関数

function onSubStoryTap() {
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
}
function waitForSubStoryTap() {
    return new Promise(resolve => { subStoryTapResolve = resolve; });
}

// サブストーリーを再生する。本編のストーリーシーンと同じく3画面(画像+1文字ずつのテキスト)を、タップで送りながら表示する。
// 3画面すべて読み終えたタイミングで、対応する敵のコスチュームを解除する。
async function readSubStory(idx) {
    const sub = SUBSTORY_BY_ENEMY[ENEMY_ORDER[idx]];
    if (!sub) return;
    const myToken = ++subStoryToken;
    const imgArea = document.getElementById('subStoryImgArea');
    const fallback = document.getElementById('subStoryImgFallback');
    const textEl = document.getElementById('subStoryText');

    document.getElementById('subStoryListView').style.display = 'none';
    document.getElementById('subStoryReadView').style.display = '';

    for (let i = 0; i < sub.screens.length; i++) {
        const screen = sub.screens[i];
        if (subStoryToken !== myToken) return; // 戻る/閉じるで中断されていたら止める

        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/substory/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }

        textEl.innerText = '';
        for (let c = 0; c < screen.text.length; c++) {
            if (subStoryToken !== myToken) return;
            textEl.innerText += screen.text[c];
            await wait(45);
        }

        if (subStoryToken !== myToken) return;
        await waitForSubStoryTap(); // 本編と同じくタップで次へ(自動送りしない)
        if (subStoryToken !== myToken) return;
    }

    // 実績: サブストーリーを3画面すべて読み終えた(体験した)タイミングで、対応する敵のコスチュームを解除する
    const skinName = 'enemy_' + (idx + 1);
    const alreadyUnlocked = unlockedSkins.includes(skinName);
    unlockSkin(skinName);
    if (!alreadyUnlocked) {
        showUnlockToast('★ コスチュームを解除しました ★');
        updateOptionUI(); // 背後で開いたままのOPTION画面のCOSTUME行を、閉じ直さなくても即座に表示させる
    }
    backToSubStoryList();
}
function backToSubStoryList() {
    subStoryToken++; // 再生中なら中断する
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
    openSubStoryList();
}
function closeSubStory() {
    subStoryToken++; // 再生中なら中断する
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
    document.getElementById('subStoryOverlay').classList.remove('show');
}
function closeSubStoryBackdrop(e) { if (e.target.id === 'subStoryOverlay') closeSubStory(); }

// ------- SOUND TEST -------
function openSoundTest() {
    const rows = document.getElementById('soundTestRows');
    rows.innerHTML = '';
    SOUND_TEST_TRACKS.forEach(track => {
        const row = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = `<span class="option-label">${track.label}</span><button onclick="playSoundTestTrack('${track.name}')">▶︎再生</button>`;
        rows.appendChild(row);
    });
    document.getElementById('soundTestOverlay').classList.add('show');
}
async function playSoundTestTrack(name) {
    // SOUND TESTはOFF設定でも試聴できるようにしたいので、一時的にON扱いで再生する(設定自体は変更しない)
    const wasOn = state.soundOn;
    state.soundOn = true;
    if (name.startsWith('bgm_')) {
        currentBgmName = null; // 同じBGMが既にリクエスト中でも試聴できるようガードを外す
        await playBGM(name);
    } else {
        await playSE(name);
    }
    state.soundOn = wasOn;
}
function closeSoundTest() { document.getElementById('soundTestOverlay').classList.remove('show'); }
function closeSoundTestBackdrop(e) { if (e.target.id === 'soundTestOverlay') closeSoundTest(); }

// ------- COSTUME(コスチューム選択) -------
function openCostumeSelect() {
    const rows = document.getElementById('costumeRows');
    rows.innerHTML = '';
    const defaultRow = document.createElement('div');
    defaultRow.className = 'option-row';
    defaultRow.innerHTML = `<span class="option-label">デフォルト</span><button onclick="selectCostume(null)">${selectedSkin === null ? '選択中' : '選ぶ'}</button>`;
    rows.appendChild(defaultRow);
    unlockedSkins.forEach(skinName => {
        const idx = parseInt(skinName.replace('enemy_', ''), 10);
        const label = `敵${idx}(仮)の見た目`;
        const row = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = `<span class="option-label">${label}</span><button onclick="selectCostume('${skinName}')">${selectedSkin === skinName ? '選択中' : '選ぶ'}</button>`;
        rows.appendChild(row);
    });
    document.getElementById('costumeOverlay').classList.add('show');
}
function selectCostume(skinName) {
    selectedSkin = skinName;
    writeSaveData({ selectedSkin });
    openCostumeSelect(); // 選択状態を反映して再描画
}
function closeCostume() { document.getElementById('costumeOverlay').classList.remove('show'); }
function closeCostumeBackdrop(e) { if (e.target.id === 'costumeOverlay') closeCostume(); }

// OPTION内のRETRY: このバトル直前のデッキ編成へ戻る(現在のモードを維持)。確認ポップアップを挟む。
function openRetryConfirm() { document.getElementById('retryConfirmPanel').classList.add('show'); }
function closeRetryConfirm() { document.getElementById('retryConfirmPanel').classList.remove('show'); }
function doOptionRetry() {
    closeRetryConfirm();
    closeOption();
    if (state.gameMode === 'training') {
        goTrainingBattle(); // TRAINING MODEはデッキ編成を経由しないため直接バトルへ
    } else {
        // STORY MODEは、デッキ編成へ直接ではなく現在の敵のストーリーシーンから再生する。
        // 戦う前の会話が相手の癖を読み取るヒントになるため、RETRY時も見返せるようにする。
        goStoryThenDeck();
    }
}

// OPTION内のRETURN TO TITLE: ロゴシーンまで戻る。確認ポップアップを挟む(ストーリーの進行状況はセーブ済みのまま消えない)。
function openReturnConfirm() { document.getElementById('returnConfirmPanel').classList.add('show'); }
function closeReturnConfirm() { document.getElementById('returnConfirmPanel').classList.remove('show'); }
function doOptionReturnToTitle() {
    closeReturnConfirm();
    closeOption();
    goLogo();
}