'use strict';

const cmd = require('./set');

// 各ボスの残りHP及び討伐数
function Progress(data, BOSS_HP, Level_List, VALUE ){
	
	let Boss_Lap = [1,1,1,1,1];	// 各ボスの討伐数
	let Boss_Rest_Hp = [0,0,0,0,0];	// 各ボスのHP
	let level_num = 1;			// 現在の段階
	let last_level_num = 1;		// 前回の段階
	let round_counter = 1;		// 現在の周回
	let last_round_counter = 1;	// 前回の周回
	Boss_Rest_Hp = Boss_Recovery_Hp(BOSS_HP, Boss_Rest_Hp, level_num);

	let text = '';		// 特殊用テキスト
	let kill_flag = 0;	// ボスを倒したフラグ
	let sp_kill_flag = 0;	// ワンパン以外でボスを倒したフラグ
	let FINISH_KILL = [];	// ワンパン以外でボスを倒したことをメンバー個別に数える
	let KILL_BOSS = [];		// ↑上記のモンスターを記憶
	let MAX_DAMAGE = [];	// 各難易度の各ボスのマックスダメージ
	let MAX_DAMAGE_TEXT = [];	// 各難易度の各ボスのマックスダメージを出した者を記録
	let Attack_Count = [0,0,0,0,0];	// 各ボスの現在の攻撃回数
	let Last_Boss_Lap = [0,0,0,0,0];// 各ボスのダメージ前周回
	let target_line = 0;			// 日付指定入力時の行数記憶

	let standard_damage = 4000000;	// 400万の数字は適当だが計算の基準となるダメージ

	let Boss_New_Damage = ['','','','',''];		// 最新ダメージ格納
	let last_lap = 0;							// 最新ダメージ用のダメージを与える前の周回

	// 日時情報、クラバトの日付と時間取得
	let [year, month, today, hours, minutes, second] = cmd.Time_Get();
	if( VALUE != undefined ){
		if( VALUE.target_day != undefined ){ today = VALUE.target_day; }
	}
	let MEMBER_DAMAGE = new Array;		// メンバーのダメージ
	let MEMBER_DAMAGE_KILL = new Array;	// メンバーのダメージでキルしたか（残り時間）
	let MEMBER_BOSS_KILL = new Array;	// メンバーのダメージでキルしたボス番号
	let MEMBER_CHALLENGE = new Array;	// メンバーのフラグ
	let BOSS_ALL_DAMAGE = new Array;	// ボスに与えられた総ダメージ（段階毎）
	let BOSS_ALL_CHALLENGE = new Array;	// ボスに与えられた総ダメージ回数（段階毎）
	let MEMBER_ALL_DAMAGE = new Array;	// メンバーが与えた総ダメージ（段階毎）
	let MEMBER_ALL_CHALLENGE = new Array;	// メンバーが与えた総ダメージ回数（段階毎）
	let MEMBER_MAX_DAMAGE = new Array;	// メンバーが与えた最大ダメージ（段階毎?）
	let Member_Damage_List = new Array;	// 選択肢用のメンバーのダメージ

	let Average_Damage = [['0'],['0'],['0'],['0'],['0'],['0']];		// ボス毎の平均ダメージ格納
	let Average_Num = [0,0,0,0,0];	// ダメージを与えた数格納

	let DataAry = [];
	if( data != undefined ){
		DataAry = data.split('\n');
	}
	DataAry = DataAry.filter(Boolean);	// 空白削除

	for( let i=0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\/');
		let name = ValueAry[0];			// メンバーの名前
		let damage = ValueAry[1];	// 与えたダメージ
		if( damage.match(/[\d]/) ){ damage *= 1; }
		let over = ValueAry[2];			// 持ち越しなら1
		let value_time = ValueAry[3];	// 持ち越し時間
		let day = ValueAry[4];			// 凸日
		let charge_time = ValueAry[5];	// 凸時間
		let boss_counter = ValueAry[6];	// 凸したボス
		let attack_turn = ValueAry[7];	// 凸番号

		last_lap = Boss_Lap[boss_counter];		// 最新ダメージ用のダメージを与える前の周回

		let error_flag = '';
		if( damage == 'error' ){	// エラーは0扱い
			error_flag = 'error';
			damage = 0;
		}

		// 日付指定があり
		if( VALUE != undefined && VALUE.type == 'day' ){
			target_line = i;
			// 日付指定があり、その日付を超えた
			if( VALUE.target_day < day ){
				break;	// 強制終了
			}
		}

		kill_flag = 0;
		sp_kill_flag = 0;

		// 前回の討伐数を覚えておく（個別で良い）
		last_round_counter = Boss_Lap[boss_counter];

		// 段階が変わる前に前回の段階を覚えておく
		last_level_num = level_num;

		// 特殊処理
		if( VALUE != undefined ){
			// ボスへの攻撃回数（ボスのHPが満タンの時に殴ると初期化）この辺りはスプレッドシート用
			if( VALUE.type == 'google' ){
				let google_key = "boss" + boss_counter + "_" + level_num;
				if(Boss_Rest_Hp[boss_counter] == BOSS_HP[google_key]){
					Attack_Count[boss_counter] = 0;
				}
				Attack_Count[boss_counter]++;							// 攻撃回数加算
				Last_Boss_Lap[boss_counter] = Boss_Lap[boss_counter];	// 前の周回数を覚えておく
			}
			// 平均ダメージ計算用
			else if( VALUE.type == 'average' ){
				// 平均ダメージ計算
				if( level_num >= 3 ){	// 特に必要ないかなぁ…
					// ダメージが400万以上ならダメージとして認める
					if( damage > standard_damage ){
						// 基本となる平均ダメージを追加
						Average_Damage[boss_counter].push(damage);
						Average_Num[boss_counter]++;
					}
				}
			}
		}

		Boss_Rest_Hp[boss_counter] -= damage;	// ダメージ与える

		// 討伐した場合
		if( Boss_Rest_Hp[boss_counter] <= 0 ){

			kill_flag = 1;	// 討伐フラグを立てる

			// ワンパン以外で倒したフラグ
			let key = `boss${boss_counter}_${level_num}`;
			if( damage < BOSS_HP[key] ){
				sp_kill_flag = 1;
			}

			// 討伐数
			Boss_Lap[boss_counter]++;

			// 周回進行判定
			if( Round_Up(Boss_Lap, Boss_Rest_Hp, round_counter) ){
				round_counter++;	// 周回進行
				//console.log("周回進行！" + round_counter );
			}

			
			// 段階進行判定
			if( Level_Up(Boss_Lap, Boss_Rest_Hp, Level_List, level_num) ){
				level_num++;	// 段階進行
				// ボス全体HP回復
				Boss_Rest_Hp = Boss_Recovery_Hp(BOSS_HP, Boss_Rest_Hp, level_num)
				//console.log("レベルアップ！" + level_num + "段階目 " + day + "日 " + charge_time );

				Average_Damage = [['0'],['0'],['0'],['0'],['0'],['0']];	// 平均ダメージ格納初期化
				Average_Num.fill(0);	// 平均ダメージ回数初期化
			}
			else{
				// ボス個別HP回復
				let hash_key = "boss" + boss_counter + "_" + level_num;
				Boss_Rest_Hp[boss_counter] = BOSS_HP[hash_key];
			}
		}
		// そうじゃない場合
		else{
			//console.log("ボス残りダメージ:与えたダメージ" + Boss_Rest_Hp[boss_counter] + ":" + damage);
			//console.log(Boss_Lap);
			//break;
		}
	
		// 特殊処理
		if( VALUE != undefined ){
			// Boss_Kill用
			if( VALUE.type == 'boss_kill' ){
				// set_dayが2文字(2桁)であり、日付が合致していないなら次へ
				/*if( VALUE.set_day.length == 2 && VALUE.set_day != day ){
					continue;
				}*/
				// 入力された名前とダメージを入れた人の名前があってる
				if( VALUE.other_name == name ){
					text += `${day}日 `;
					text += `${cmd.Boss_Name[boss_counter]}`;
					if( kill_flag == 1 ){	// 討伐
						text += `⚔`;
					}
					text += `\(${damage}\)`;
					text += `\n`;
				}
			}
			// 選択肢用のダメージリストを作成
			else if( VALUE.type == 'list' ){
				// 本日の指定された人のダメージ周りのリスト
				if( VALUE.list_name == name && day == today ){
					let member_key = `${name}_${attack_turn}_${over}`;
					let over_mark = '';
					if( over == 1 ){ over_mark = '♻'; }
					let kill_mark = '';
					//if( kill_flag == 1 ){ kill_mark = '⚔'; }	// こっちが本来は正しい
					if( value_time != '' ){ kill_mark = '⚔'; }
					Member_Damage_List.push(`${attack_turn}\t${damage}\t${boss_counter}\t${over_mark}\t${kill_mark}\t${i}`);
				}
			}
			// Result用
			else if( VALUE.type == 'result' ){
				// ★5段階目で1位～3位
				// ワンパン以外で倒した	ラストアタック回数
				if( sp_kill_flag ){
					if( FINISH_KILL[name] == undefined ){ FINISH_KILL[name] = 0; }
					if( KILL_BOSS[name] == undefined ){ KILL_BOSS[name] = ''; }
					FINISH_KILL[name]++;
					KILL_BOSS[name] += `${boss_counter}\n`;
				}

				// 最高ダメージ
				for( let k = 1; k <= 3; k++ ){
					let hash_key = `${boss_counter}_${last_level_num}_${k}`;
					if( MAX_DAMAGE[hash_key] == undefined ){ MAX_DAMAGE[hash_key] = 0; }
					// これまでに一番多くのダメージを叩き出したら
					if( MAX_DAMAGE[hash_key] <= damage ){
						if( MAX_DAMAGE[hash_key] < damage ){	// 更新ならテキストを初期化
							for( let m = 3; m >= k + 1; m-- ){
								let hash_key2 = `${boss_counter}_${last_level_num}_${m}`;
								let hash_key3 = `${boss_counter}_${last_level_num}_${m-1}`;
								MAX_DAMAGE[hash_key2] = MAX_DAMAGE[hash_key3]
								MAX_DAMAGE_TEXT[hash_key2] = MAX_DAMAGE_TEXT[hash_key3]
							}
							MAX_DAMAGE_TEXT[hash_key] = '';
						}
						MAX_DAMAGE[hash_key] = damage;			// ダメージ更新
						MAX_DAMAGE_TEXT[hash_key] += `${name}\t${last_round_counter}\n`;
						break;
					}
				}
				/*let hash_key = `${boss_counter}_${last_level_num}`;
				if( MAX_DAMAGE[hash_key] == undefined ){ MAX_DAMAGE[hash_key] = 0; }
				// これまでに一番多くのダメージを叩き出したら
				if( MAX_DAMAGE[hash_key] <= damage ){
					if( MAX_DAMAGE[hash_key] < damage ){	// 更新ならテキストを初期化
						MAX_DAMAGE_TEXT[hash_key] = '';
					}
					MAX_DAMAGE[hash_key] = damage;			// ダメージ更新
					MAX_DAMAGE_TEXT[hash_key] += `${name}\t${last_round_counter}\n`;
				}*/
			}
			else if( VALUE.type == "change" ){	// 途中までを数える場合
				if( i == VALUE.number - 1 ){		// 指定された場所の直前でfor文を止める
					break;
				}
			}
			// ボス最新データを記入
			else if( VALUE.type == 'new_damage' ){
				Boss_New_Damage[boss_counter] += name + "\t";		// 名前
				Boss_New_Damage[boss_counter] += damage + "\t";		// ダメージ
				Boss_New_Damage[boss_counter] += attack_turn + "\t";// 凸番号
				Boss_New_Damage[boss_counter] += over + "\t";		// 持ち越し
				Boss_New_Damage[boss_counter] += kill_flag + "\t";	// 討伐フラグ
				Boss_New_Damage[boss_counter] += day + "\t";		// 日付
				Boss_New_Damage[boss_counter] += last_lap + "\n";	// ボスの周回
			}
			// 各々の本日のダメージ
			else if( VALUE.type == 'member_challenge' ){
				if( VALUE.target_day != undefined ){ today = VALUE.target_day; }

				// 本日ダメージ
				let member_key = name + "_" + attack_turn;
				let member_key2 = name + "_" + attack_turn + "_" + over;
				if( today == day ){
					MEMBER_BOSS_KILL[member_key2] = boss_counter;	// このダメージで戦った（討伐した）ボス
					if( kill_flag ){
						if( over == 0 ){
							MEMBER_DAMAGE_KILL[member_key2] = value_time;	// このダメージで討伐した時の残り時間
						}
						else{
							MEMBER_DAMAGE_KILL[member_key2] = 1;	// フラグは立てておく。これは表示されないはず…
						}

						// 持ち越しに気をつける
						if( value_time != '' && value_time != '×' ){	// 残りタイムが存在
							MEMBER_CHALLENGE[member_key] = 1;	// 1は持ち越しあり
						}
						else{				// 残りタイムが存在していない
							MEMBER_CHALLENGE[member_key] = 2;	// 1は持ち越しなし
						}
					}
					else{
						MEMBER_CHALLENGE[member_key] = 2;
						MEMBER_DAMAGE_KILL[member_key2] = 0;
					}

					if( error_flag == 'error' ){
						MEMBER_DAMAGE[member_key2] = 'error';
					}
					else{
						MEMBER_DAMAGE[member_key2] = damage;
					}
				}

				// 平均ダメージ
				let boss_key = boss_counter + "_" + last_level_num;
				let member_key3 = name + "_" + last_level_num;
				let member_key4 = name + "_" + day + "_" + attack_turn;

				if( kill_flag ){
					if( value_time != '' && value_time != '×' ){	// 残りタイムが存在
						MEMBER_CHALLENGE[member_key4] = 1;	// 1は持ち越しあり
					}
					else{				// 残りタイムが存在していない
						MEMBER_CHALLENGE[member_key4] = 2;	// 1は持ち越しなし
					}
				}
				else{
					MEMBER_CHALLENGE[member_key4] = 2;
				}

				if( BOSS_ALL_DAMAGE[boss_key] == undefined ){ BOSS_ALL_DAMAGE[boss_key] = ''; }
				if( BOSS_ALL_CHALLENGE[boss_key] == undefined ){ BOSS_ALL_CHALLENGE[boss_key] = 0; }
				if( MEMBER_ALL_DAMAGE[member_key3] == undefined ){ MEMBER_ALL_DAMAGE[member_key3] = 0; }
				if( MEMBER_ALL_CHALLENGE[member_key3] == undefined ){ MEMBER_ALL_CHALLENGE[member_key3] = 0; }
				if( MEMBER_MAX_DAMAGE[name] == undefined ){ MEMBER_MAX_DAMAGE[name] = 0; }
				if( damage > standard_damage ){	// 基準ダメージを超えたら
					BOSS_ALL_DAMAGE[boss_key] += `${damage}\t`;	// ボスに与えられた総ダメージ（段階毎）
					BOSS_ALL_CHALLENGE[boss_key]++;			// ボスに与えられた総ダメージ回数（段階毎）
				}
				MEMBER_ALL_DAMAGE[member_key3] += damage;// メンバーが与えた総ダメージ（段階毎）
				if( MEMBER_CHALLENGE[member_key4] == 2 ){
					MEMBER_ALL_CHALLENGE[member_key3]++;		// メンバーが与えた総ダメージ回数（段階毎）
				}
				if( MEMBER_MAX_DAMAGE[name] < damage ){		// メンバーが与えた最大のダメージ
					MEMBER_MAX_DAMAGE[name] = damage;
				}
			}
		}
	}

	// 特殊処理
	if( VALUE != undefined ){
		// Boss_Kill用
		if( VALUE.type == 'boss_kill' ){
			return text;
		}
		// Result用
		else if(  VALUE.type == 'result' ){
			return [MAX_DAMAGE, MAX_DAMAGE_TEXT, FINISH_KILL, KILL_BOSS];
		}
		// List用
		else if(  VALUE.type == 'list' ){
			return [Member_Damage_List];
		}
		// Google用
		else if(  VALUE.type == 'google' ){
			return [Last_Boss_Lap, Attack_Count];
		}
		// 平均ダメージ（残り時間簡易計算）用
		else if(  VALUE.type == 'average' ){
			return [Average_Damage, Average_Num];
		}
		// 最新ダメージ用
		else if(  VALUE.type == 'new_damage' ){
			return [Boss_Lap, Boss_Rest_Hp, level_num, round_counter, Boss_New_Damage];
		}
		// メンバーデータ用
		else if(  VALUE.type == 'member_challenge' ){
			return [MEMBER_CHALLENGE, MEMBER_DAMAGE, MEMBER_DAMAGE_KILL, MEMBER_BOSS_KILL, BOSS_ALL_DAMAGE, BOSS_ALL_CHALLENGE, MEMBER_ALL_DAMAGE, MEMBER_ALL_CHALLENGE, MEMBER_MAX_DAMAGE];
		}
		// 日付指定用
		else if(  VALUE.type == 'day' ){
			return [Boss_Lap, Boss_Rest_Hp, level_num, round_counter, target_line];
		}
		// とりあえず何か返す
		else{
			return [Boss_Lap, Boss_Rest_Hp, level_num, round_counter];
		}
	}
	// 通常は下を返す
	else{
		return [Boss_Lap, Boss_Rest_Hp, level_num, round_counter];
	}
}

// 段階上昇判定
function Level_Up(Boss_Lap, Boss_Rest_Hp, Level_List, level_num){
	let kill_num = 0;
	for( let i = 0; i < Boss_Lap.length; i++ ){
		if( Boss_Lap[i] == Level_List[level_num - 1] ){
			kill_num++;
		}
	}
	// 全ボス段階上昇の最大数まで倒した
	if( kill_num == Boss_Lap.length ){
		return true;
	}
	else{	return false;	}
}

// 周回上昇判定
function Round_Up(Boss_Lap, Boss_Rest_Hp, round_counter){
	let min_counter = 9999;
	for( let i = 0; i <= Boss_Lap.length; i++ ){
		if( Boss_Lap[i] <= min_counter ){	// 最も周回数の少ない数字に合わせる
			min_counter = Boss_Lap[i];
		}
	}
	if( round_counter < min_counter ){	// 周回数が変化した
		return true;
	}
	else{	return false;	}
}

// 周回ボス挑戦判定
function Round_Check(Boss_Lap, Boss_Rest_Hp, Level_List, kill_boss_no, level_num){

	let min_counter = 9999;
	for( let i = 0; i < Boss_Lap.length; i++ ){
		if( min_counter > Boss_Lap[i] ){
			min_counter = Boss_Lap[i];
		}
	}

	// 周が段階リミットでそれ以上行けない
	if( Boss_Lap[kill_boss_no] == Level_List[level_num - 1] ){
		return true;
	}
	// 一番少ないボスより2周以上している
	else if( Boss_Lap[kill_boss_no] >= min_counter + 2 ){
		return true;
	}
	else{
		return false;
	}
}

// 全ボスのHP回復
function Boss_Recovery_Hp(BOSS_HP, Boss_Rest_Hp, level_num){
	for( let i = 0; i <= Boss_Rest_Hp.length - 1; i++ ){
		let hash_key = "boss" + i + "_" + level_num;
		Boss_Rest_Hp[i] = BOSS_HP[hash_key];
	}
	return Boss_Rest_Hp;
}

module.exports = {
	Progress,
	Level_Up,
	Round_Up,
	Round_Check,
	Boss_Recovery_Hp,
}


