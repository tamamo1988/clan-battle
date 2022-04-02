'use strict';

const fs = require('fs');
const cmd = require('./set');
const checkcmd = require('./check');
const progresscmd = require('./progress');
const nowcmd = require('./now');
const buttoncmd = require('./button');
const googlecmd = require('./google_sps');

// 疑似wait
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function Main_Damage(msg, damage_no, damage_last, damage, kill_boss_no, attack_turn, over_time_data, other_name, target_day){

	let [user_id] = cmd.Set_Id(msg);

	let check;		// trueならエラー

	let attention_text = '';
	if( damage_last > 1 ){
		attention_text = "```" + `.${damage}.${kill_boss_no}.${attack_turn} ${other_name}` + "```";
	}

	// 日付は正しいか
	check = await checkcmd.Day_Check(msg);
	if( check == true ){ return -1; }

	// クランメンバーか
	check = await checkcmd.Member_Check(msg, user_id, other_name);
	if( check == true ){ return -1; }
	let attack_name = check;

	if( other_name == undefined ){ other_name = ''; }	// カスタムID用に文字数削減

	// ファイルを読み込む
	let battle_schedule = await cmd.Folder(msg.guildId);
	let data = '';
	let datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	// 現時点までの進行状況からボスの討伐数とボスの残りHPを確認
	let VALUE;
	if( target_day != undefined ){
		VALUE = { "type" : "day", "target_day" : target_day };
	}
	let [Boss_Lap, Boss_Rest_Hp, level_num, round_counter, target_line] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List, VALUE);
	let min_counter = 9999;
	for( let i= 0; i < Boss_Lap.length - 1; i++ ){
		if( min_counter > Boss_Lap[i] ){
			min_counter = Boss_Lap[i];
		}
	}

	let over = '0';
	// プレイヤーの凸状況を調べる＆３凸済みか否か
	// 日付を変えて弄る可能性がある…？
	let Charge_Flag = await checkcmd.Progress_Player(data, attack_name, target_day);
	// 持ち越しでの殴りか否か
	if( Charge_Flag[0] == 3 ){					// すでに凸終了
		if( other_name == '' ){
			msg.reply(`弟くん、今日はもう挑戦できないよ。お疲れ様！` + attention_text);
		}
		else{
			msg.reply(`弟くん、その人は今日はもう挑戦できないよ。` + attention_text);
		}
		return -1;
	}

	// ボス番号未記入
	if( kill_boss_no == '' ){
		// 戦闘中状態か否か（戦闘中でなくボスNoがないならボタン）
		let button_flag = 0;
		let [boss_name, attack_turn_tmp] = await checkcmd.Battle_Check(msg, attack_name);

		// 凸宣言時
		let button_text = ``;
		if( damage == 'battle' ){
			button_flag = 1;
			button_text = `弟くん、挑戦したいボスを選んで！　20秒以内だよ！`;
		}
		// 通常時
		else{
			if( kill_boss_no === '' && boss_name != undefined ){	// ボスNo未記入でボスの名前が返ってきた
				kill_boss_no = boss_name;
			}
			if( attack_turn == '' && attack_turn_tmp ){	// 凸No未記入で凸番号が返ってきた
				attack_turn = attack_turn_tmp;
			}
			if( attack_turn == '' && attack_turn_tmp == 0 ){	// 未記入で戦闘中でもない
				button_flag = 1;
			}
			if( kill_boss_no === '' ){							// 未記入で戦闘中でもない
				button_flag = 1;
			}
			button_text = `弟くん、挑戦したボスを選んで！　20秒以内だよ！`;
		}
		if( button_flag == 1 ){
			let disble_flag = `${Charge_Flag[1]}-${Charge_Flag[2]}-${Charge_Flag[3]}`;
			let BUTTON_DATA = [];
			let type = 0;
			if( damage == 'battle' ){ type = 1; }	// 凸宣言ならSP2に1
			for( let i = 1; i <= cmd.Boss_Name.length; i++ ){
				let key1 = `b${i}_id`;
				let key2 = `b${i}_label`;
				let key3 = `b${i}_disble`;
				// ↓のコメントアウトデータは旧データ。こんなにいらない…今後必要になるとしたら日付強制入力時？
	    	    //let button_text = "boss_no<>" + msg + "<>" + damage_num + "<>" + over_flag + "<>" + over_time_data + "<>" + other_name + "<>" + compel_flag + "<>" + target_name + "<>" + target_damage + "<>" + designated_date + "<>" + disable_key;
				// 凸情報をまとめる
				// カスタムIDの設定（※ボスNoはラスト）
				BUTTON_DATA[key1] = `boss_no+${msg.id}+${disble_flag}+${type}+0+${damage}+${over_time_data}+${other_name}+${target_day}+${i}`;
				BUTTON_DATA[key2] = cmd.Boss_Name[i - 1];	// ラベル
				if( Boss_Lap[i - 1] >= min_counter + 2 || Boss_Lap[i - 1] >= cmd.Level_List[level_num - 1] ){
					BUTTON_DATA[key3] = 'true';	// disble
				}
			}
			await buttoncmd.Interaction_Button( msg, button_text, 5, 0, BUTTON_DATA);
			return;
		}
	}
	// ボス番号入力
	else{
		kill_boss_no--;
	}

	// 終了あるいは持ち越しによる処理
	if( Charge_Flag[attack_turn] == 2 ){	// その凸すでに終了
		if( other_name != '' ){
			msg.reply(`弟くん、その人はその凸だともう挑戦できないよ` + attention_text);
		}
		else{
			msg.reply(`弟くん、その凸だともう挑戦できないよ` + attention_text);
		}
		return -1;
	}
	else if( Charge_Flag[attack_turn] == 1 ){	// 持ち越しで凸
		over = '1';
	}
	else if( Charge_Flag[attack_turn] == 0 ){	// 凸
	}

	// 指定されたボスが倒せる状態か否か（2周超過or段階制限）
	if( progresscmd.Round_Check(Boss_Lap, Boss_Rest_Hp, cmd.Level_List, kill_boss_no, level_num) ){
		msg.reply(`弟くん、${cmd.Boss_Name[kill_boss_no]}は討伐済みだよ…周回の進行を待ってね！` + attention_text);
		return -1;
	}

	console.log("BossNo:" + kill_boss_no)
	console.log(Boss_Lap)
	console.log(Boss_Rest_Hp)

	// ダメージ入力
	await Damage(msg, damage_no, damage_last, data, Boss_Lap, Boss_Rest_Hp, cmd.Level_List, level_num, attack_name, damage, over, over_time_data, kill_boss_no, attack_turn, target_day, target_line, other_name);

}

// 新規ダメージを記録（残凸更新や予約や凸宣言の通知周りも）
async function Damage(msg, damage_no, damage_last, data, Boss_Lap, Boss_Rest_Hp, Level_List, level_num, attack_name, damage, over, over_time_data, kill_boss_no, attack_turn, target_day, target_line, other_name){

	let kill_flag = 0;		// 討伐したフラグ。返信時に使用
	let boss_rest_hp = 0;	// ボスの残りHP。返信時に使用
	let surplus_time = '';

	let round = Boss_Lap[kill_boss_no];	// ダメージを与える前の周回数を覚えておく

	// 討伐単語で入力された
	let error_flag = '';
	let hash_key = "boss" + kill_boss_no + "_" + level_num;
	if( damage == 'kill' ){
		damage = Boss_Rest_Hp[kill_boss_no];
	}
	else if( damage == 'error' ){
		error_flag = 'error';
		damage = 0;
	}

	// 入力ダメージで討伐した場合（＆持ち越しではない）
	if( Boss_Rest_Hp[kill_boss_no] - damage <= 0 ){
		kill_flag = 1;
		if( over == 0 ){
			if( over_time_data ){
				surplus_time = over_time_data;
			}
			else{
				// 残り時間算出
				surplus_time = await Kill_Time_For(data, damage, kill_boss_no, level_num );
			}
		}
		else{
			surplus_time = '×';
		}
	}
	// ダメージを与えたのみ
	else{
		boss_rest_hp = Boss_Rest_Hp[kill_boss_no] - damage;
	}

	// ダメージファイル記入
	try{
		// 日付と時間取得
		let [year, month, day, hours, minutes, second] = cmd.Time_Get();
		hours = ( '00' + hours ).slice( -2 );
		minutes = ( '00' + minutes ).slice( -2 );

		let add_data = '';
		let DataAry = data.split('\n');
		DataAry = DataAry.filter(Boolean);	// 空白削除

		//てんこっこ/22876293/0//30/22:41/0/3
		add_data += attack_name + "/";
		if( error_flag == 'error' ){	damage = error_flag;	}	// エラーフラグ
		add_data += damage + "/";
		add_data += over + "/";
		add_data += surplus_time + "/";
		//console.log("target_line:" + target_line);
		if( target_line > 0 ){	// 日付強制時
			day = target_day;
			hours = 4;	minutes = 59;
		}
		add_data += day + "/";
		add_data += hours + ":" + minutes + "/";
		add_data += kill_boss_no + "/";
		add_data += attack_turn;
		//add_data += "\n";

		if( target_line > 0 ){	// 日付強制
			DataAry.splice( target_line + 1, 0, add_data ) ;
		}
		else{					// 通常時
			DataAry.push( add_data );
		}

		data = '';
		for( let i = 0; i < DataAry.length; i++ ){
			data += `${DataAry[i]}\n`;
		}

		// ファイルを名
		let battle_schedule = await cmd.Folder(msg.guildId);
		let datafile = battle_schedule + "\/" + 'progress.txt';

		await cmd.Write_File(datafile, data);

		// 1時間毎にバックアップを取る ログファイルはデータベース入れないでいい
		let logfolder = battle_schedule + "\/log";
		let logfile = logfolder + "/progress" + day + hours + ".txt";
		// ディレクトリを親ごと作成する
		fs.mkdirSync( logfolder, { recursive: true }, (err) => {
	    	if (err) throw err;
		});
		fs.writeFileSync(logfile, data);

	}
	catch(e){
		console.log("進行データエラー");
	}

	// 予約データを消去したり、次次周を戻したり
	try{
		await Reserve_Delete( msg.guildId, attack_name, kill_boss_no );
	}
	catch(e){
		console.log("予約消去データエラー");
	}

	// 戦闘中データを消去。倒したら戦闘中のモンスターに参加していたら消す
	try{
		await Battle_Delete( msg.guildId, attack_name, kill_boss_no, kill_flag );
	}
	catch(e){
		console.log("戦闘中データ消去データエラー");
	}

	let update_flag = 0;

	// 結果の返信
	let result_text = '';
	let over_text = '';
	let other_name_text = '';
	let round_counter_after = 0, level_num_after = 0;	// 周回数及びレベルの変化
	if( over == 1 ){ over_text = '持ち越し' }
	if( other_name ){ other_name_text = `${other_name}さんの` }

	if( error_flag == 'error' ){
		result_text = `お姉ちゃん、${other_name_text}${attack_turn}凸目のエラー報告を受け付けたよ\n`;
	}
	else{
		result_text = `お姉ちゃん、${other_name_text}${attack_turn}凸目の${over_text}ダメージ報告を受け付けたよ！\n`;
	}

	// 討伐前の周回数と難易度
	let [round_counter_last, level_num_last] = await Battle_After(Boss_Lap);
	if( kill_flag ){
		if( over == 0 ){	over = 2;	}	// Google用持ち越し発生フラグ
		update_flag = 'kill';
		Boss_Lap[kill_boss_no]++;	// 討伐した場合周回進行
		result_text += `${damage}を与えて${cmd.Boss_Name[kill_boss_no]}を討伐したね！`;
		// 討伐後の周回数と難易度
		[round_counter_after, level_num_after] = await Battle_After(Boss_Lap);
		// 段階が進んだ
		if( level_num_after > level_num_last ){
			update_flag = 'level';
			result_text += `　段階が進んで今は第${level_num_after}段階 ${round_counter_after}周目かな`;
		}
		// 周回が進んだ
		else if( round_counter_after > round_counter_last ){
			update_flag = 'round';
			result_text += `　周回が進んで今は${round_counter_after}周目かな`;
		}
	}
	else if( error_flag == 'error' ){
	}
	else{
		update_flag = 'normal';
		result_text += `${damage}を与えて${cmd.Boss_Name[kill_boss_no]}残りHP${boss_rest_hp}だね！`;
	}

	// スプレッドシート書き込み（ダメージ、そのボスの周回数、ボスの番号、持ち越しか、凸者の名前、日付）
	let designated_date = '';
	googlecmd.Damage_Regist(msg, damage, round, kill_boss_no, over, attack_name, target_day);

	// 単一のダメージが入力された時（通常）
	if( damage_last == 1 ){
		msg.reply(`${result_text}`);

		// 残凸状況更新
		let Update = [];
		if( update_flag == 'level' ){	// レベル進行
			Update = [1,1,1,1,1];		// 全部更新
		}
		else if( update_flag == 'kill' ){	// ボスを倒した
			Update[kill_boss_no] = 1;	// キルしたなら更新は必要
		}
		else if( update_flag == 'round' ){	// ボスを倒した
			Update = [1,1,1,1,1];		// 全部更新
		}
		else if( update_flag == 'normal' ){	// ダメージのみ
			Update[kill_boss_no] = 1;
		}
		nowcmd.Now_Main( msg, target_day, Update );

		// ボスを倒してからの後処理
		if( kill_flag ){
			// 予約周りの通知など
			Reserve_Notice(msg, Boss_Lap, kill_boss_no, level_num_after, level_num_last, round_counter_after, round_counter_last);

			// メッセージを送ったチャンネルを記憶
			let channel = msg.channel;
			// 同名スレッドの検索
			let thread_search = await channel.threads.cache.find(x => x.name === cmd.Boss_Name[kill_boss_no] + 'の救援スレッド');
			if( thread_search != undefined ){
				// 同名スレッドを削除する
				thread_search.delete();
			}
		}
	}
	// 複数のダメージが入力された場合、ラストの時だけ通知
	else if( damage_last > 1 && damage_no == damage_last - 1 ){
		msg.reply(`${result_text}`);
		let Update = [];
		Update = [1,1,1,1,1];		// 全部更新
		nowcmd.Now_Main( msg, target_day, Update );
	}
}

async function Reserve_Notice(msg, Boss_Lap, kill_boss_no, level_num_after, level_num_last, round_counter_after, round_counter_last){

	let [year, month, day, hours, minutes, second] = cmd.Time_Get();

	// 最も周回数の少ないボスをチェック
	let min_counter = 9999;
	for( let i= 0; i < Boss_Lap.length - 1; i++ ){
		if( min_counter > Boss_Lap[i] ){
			min_counter = Boss_Lap[i];
		}
	}
	let limit_counter = min_counter + 2;	// 次の限界値を規定
	if( cmd.Level_List[level_num_after - 1] < limit_counter ){	// 超えていたら
		limit_counter = cmd.Level_List[level_num_after - 1];
	}

	let battle_schedule = await cmd.Folder(msg.guildId);
	// メンバーファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'member.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	let MEMBER_ID = [];
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		MEMBER_ID[ValueAry[0]] = ValueAry[1];	// 名前にIDを紐付ける
	}

	// タスキルファイルを読み込む
	data = '';
	datafile = battle_schedule + "\/" + 'taskkill.txt';
	data = await cmd.Read_File(datafile);

	let TASK_KILL = [];
	if( data != '' ){
		let DataAry = data.split('\n');
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < DataAry.length; i++ ){
			let ValueAry = DataAry[i].split('\t');
			TASK_KILL[ValueAry[0]] = ValueAry[1];	// 名前にタスキルの日付を紐付ける
		}
	}

	// 優先ファイルを読み込む
	data = '';
	datafile = battle_schedule + "\/" + 'priority.txt';
	data = await cmd.Read_File(datafile);

	let PRIORITY = [];
	if( data != '' ){
		let DataAry = data.split('\n');
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < DataAry.length; i++ ){
			let ValueAry = DataAry[i].split('\t');
			PRIORITY[ValueAry[0]] = ValueAry[1];	// 名前に優先の日付を紐付ける
		}
	}

	data = '';
	datafile = battle_schedule + "\/" + 'reserve.txt';
	data = await cmd.Read_File(datafile);

	let ValueAry;
	DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let b = 0; b < cmd.Boss_Name.length; b++ ){

		// 段階が変化した
		if( level_num_after > level_num_last ){
		}
		// ラウンドが変化していない
		else if( round_counter_after == round_counter_last ){
			// 倒したボスの通知のみ行う
			if( kill_boss_no != b ){		continue;	}
			// 最終的に限界値を超えていたら通知は行かない
			if( Boss_Lap[b] >= limit_counter ){		continue;	}
		}
		// ラウンドが変化した場合、複数のボス通知を行う可能性がある
		else{
			// ラウンドが変化した上で倒したボスと周回数が同じあるいは以下なら通知の必要なし
			if( Boss_Lap[b] <= Boss_Lap[kill_boss_no] && b != kill_boss_no ){	// 倒したボスは通知したい
				continue;
			}
			if( Boss_Lap[b] >= limit_counter ){		continue;	}
		}

		for( let i = 0; i < DataAry.length; i++ ){
			ValueAry = DataAry[i].split('\t');
			if( cmd.Boss_Name[b] == ValueAry[1] && ValueAry[4] == 0 ){	// モンスター一致＆今
				let notice_text = `<@${MEMBER_ID[ValueAry[0]]}>, 弟くん！　`
				// 物理魔法持ち越しなど
				if( ValueAry[2] ){
					notice_text += `${ValueAry[2]}`
					if( ValueAry[3] ){
						notice_text += `(${ValueAry[3]})`
					}
					notice_text += `で`
				}
				notice_text += `予約した${cmd.Boss_Name[b]}が来てるよ！`
				// タスキル
				if( TASK_KILL[ValueAry[0]] == day ){
					notice_text += `　今日はもうやり直しができないから気をつけてね！`
				}
				// 優先
				if( PRIORITY[ValueAry[0]] == day ){
					notice_text += `　優先登録してあるから早めに消化させてあげてね！`
				}
				// タスキル、優先、戦闘中
				msg.guild.channels.cache.get(msg.channel.id).send(notice_text);
				await _sleep(1000);	// 1秒待つ
			}
		}
	}

}

// 残り時間を単独設定　最新及び凸番号指定
async function Surplus_Time( msg, surplus_time, in_attack_turn){

	let [user_id] = cmd.Set_Id(msg);

	// 凸数の間違い
	if( in_attack_turn > 3 ){
		msg.reply(`弟くん、その凸番号はないよ`);
		return;
	}
	// 時間の書式チェック
	let time_text = await checkcmd.Time_Check(surplus_time)
	if( time_text ){	msg.reply(`${time_text}`);	return;	}

	// 日付は正しいか
	let check = await checkcmd.Day_Check()

	// クランメンバーか
	let return_menber = await checkcmd.Member_Check(msg, user_id);
	let attack_name = return_menber;

	// ファイルを読み込む
	let battle_schedule = await cmd.Folder(msg.guildId);
	let data = '';
	let datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	let time_flag = 0;
	for( let i = DataAry.length - 1; i >= 0; i-- ){
		let ValueAry = DataAry[i].split('\/');
		let name = ValueAry[0];			// メンバーの名前
		let damage = ValueAry[1] * 1;	// 与えたダメージ
		let over = ValueAry[2];			// 持ち越しなら1
		let value_time = ValueAry[3];	// 持ち越し時間
		let day = ValueAry[4];			// 凸日
		let charge_time = ValueAry[5];	// 凸時間
		let boss_counter = ValueAry[6];	// 凸したボス
		let attack_turn = ValueAry[7];	// 凸番号
		if( name == attack_name ){	// 名前を発見
			// 時間が未設定＆指定がない
			if( value_time == '' && in_attack_turn == '' ){
				break;
			}
			// 時間が未設定＆指定と同一
			if( value_time == '' && in_attack_turn == attack_turn ){	// 凸番号指定されている
				break;
			}
			// 時間が設定＆指定がない
			if( value_time != '' && in_attack_turn == '' ){
				time_flag = 1;
			}
			// 時間が設定＆指定と同一
			if( value_time != '' && in_attack_turn == attack_turn ){	// 凸番号指定されている
				time_flag = 1;
			}
		}
		if( time_flag ){
			DataAry[i] = DataAry[i].replace( value_time, surplus_time)
			break;
		}
	}

	if( time_flag ){
		let time_text = '';			// 予約書き込み用テキスト
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < DataAry.length; i++ ){
			time_text += DataAry[i] + "\n";
		}

		// 進行ファイル記入
		datafile = battle_schedule + "\/" + 'progress.txt';
		await cmd.Write_File(datafile, time_text);

		if( in_attack_turn ){
			msg.reply(`お姉ちゃん、${in_attack_turn}番目のデータに残り時間を設定したよ`)
		}
		else{
			msg.reply(`お姉ちゃん、一番新しいデータに残り時間を設定したよ`)
		}

	}
	else{
		if( in_attack_turn ){
			msg.reply(`弟くん、${in_attack_turn}凸目は討伐じゃないんじゃないかな？`)
		}
		else{
			msg.reply(`弟くん、前回は討伐じゃないんじゃないかな？`)
		}
	}
}


// ダメージ後予約消去
async function Reserve_Delete(guild_id, attack_name, kill_boss_no){

	let battle_schedule = await cmd.Folder(guild_id);

	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'reserve.txt';
	data = await cmd.Read_File(datafile);

	let reserve_change_flag = 0;	// 0新規 1変換
	let ReserveAry;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		ReserveAry = DataAry[i].split('\t');
		if( attack_name == ReserveAry[0] && cmd.Boss_Name[kill_boss_no] == ReserveAry[1]  ){	// 名前＆モンスター一致
			reserve_change_flag = 1;
			DataAry[i] = '';
		}
		else if( cmd.Boss_Name[kill_boss_no] == ReserveAry[1] && ReserveAry[4] == 1 ){			// モンスターが一致＆次次周設定
			reserve_change_flag = 1;
			DataAry[i] = ReserveAry[0] + "\t";	// 名前
			DataAry[i] += ReserveAry[1] + "\t";	// モンスター名
			DataAry[i] += ReserveAry[2] + "\t";	// 物理か魔法か
			DataAry[i] += ReserveAry[3] + "\t";	// ダメージ
			DataAry[i] += "0\t";	// 次次周を減らす
		}
	}
	// 凸が終わったら全消しする

	if( reserve_change_flag ){
		let reserve_text = '';			// 予約書き込み用テキスト
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < DataAry.length; i++ ){
			reserve_text += DataAry[i] + "\n";
		}

		// 予約ファイル記入
		datafile = battle_schedule + "\/" + 'reserve.txt';
		await cmd.Write_File(datafile, reserve_text);
	}
}

// ダメージ後戦闘中消去
async function Battle_Delete(guild_id, attack_name, kill_boss_no, kill_flag){

	let battle_schedule = await cmd.Folder(guild_id);

	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'battle.txt';
	data = await cmd.Read_File(datafile);

	let battle_change_flag = 0;	// 1変換
	let BattleAry;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		BattleAry = DataAry[i].split('\t');
		if( attack_name == BattleAry[0] ){	// 本人を消す。念のため
			battle_change_flag = 1;
			DataAry[i] = '';
		}
		else if( cmd.Boss_Name[kill_boss_no] == BattleAry[1] && kill_flag == 1 ){	// 討伐したら戦闘中ボスを全て消す
			battle_change_flag = 1;
			DataAry[i] = '';
		}
	}

	if( battle_change_flag ){
		let battle_text = '';			// 戦闘中書き込み用テキスト
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < DataAry.length; i++ ){
			battle_text += DataAry[i] + "\n";
		}

		// 戦闘中ファイル記入
		datafile = battle_schedule + "\/" + 'battle.txt';
		await cmd.Write_File(datafile, battle_text);
	}
}


// 現在の周回数や難易度をチェック
function Battle_After(Boss_Lap){
	let mincounter = 9999;
	for( let i = 0; i < Boss_Lap.length; i++ ){
		if( mincounter > Boss_Lap[i] ){
			mincounter = Boss_Lap[i];
		}
	}
	let level_num = 1;
	for( let i = 0; i < cmd.Level_List.length; i++ ){
		if( mincounter >= cmd.Level_List[i] ){
			level_num++;
		}
	}
	return [mincounter, level_num];
}


// ダメージを消去する
async function Damage_Del(msg, type, boss_no, other_name ){

	let [user_id] = cmd.Set_Id(msg);

	let check;		// trueならエラー
	let kill_boss_no;	// GOOGLE用ちょっと煩雑…

	// 日付は正しいか
	check = await checkcmd.Day_Check(msg);
	if( check == true ){ return; }

	// クランメンバーか
	check = await checkcmd.Member_Check(msg, user_id, other_name);
	if( check == true ){	return;	}
	let attack_name = check;

	console.log("ダメージ削除")

	// ファイルを読み込む
	let battle_schedule = await cmd.Folder(msg.guildId);
	let data = '';
	let datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除

	// 現時点までの進行状況からボスの討伐数とボスの残りHPを確認
	let VALUE_DATA = { "type":"google" };
	let [Boss_Lap, Attack_Count] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List, VALUE_DATA);

	let file_change_flag = 0;
	// ボスNoか人の名前が書かれている場合
	if( boss_no >= 0 || other_name ){
		for( let i = DataAry.length - 1; i >= 0; i-- ){
			let ValueAry = DataAry[i].split('\/');
			let name = ValueAry[0];			// メンバーの名前
			let damage = ValueAry[1] * 1;	// 与えたダメージ
			let over = ValueAry[2];			// 持ち越しなら1
			let value_time = ValueAry[3];	// 持ち越し時間
			let day = ValueAry[4];			// 凸日
			let charge_time = ValueAry[5];	// 凸時間
			let boss_counter = ValueAry[6];	// 凸したボス
			let attack_turn = ValueAry[7];	// 凸番号
			kill_boss_no = boss_counter;
			if( value_time ){	value_time = '討伐';	}

			if( boss_no >= 0 && boss_no == boss_counter ){
				file_change_flag = 1;
			}
			if( attack_name != '' && attack_name == name ){
				file_change_flag = 1;
			}
			if( file_change_flag ){
				if( type == 0 ){	// 選択肢の表示
					let BUTTON_DATA = [];
					let Select_Label = [`いいよ`, `だめ`]
					for( let i = 1; i <= 2; i++ ){
						let key1 = `b${i}_id`;
						let key2 = `b${i}_label`;
						// カスタムIDの設定
						BUTTON_DATA[key1] = `del_select+${msg.id}+0+0+0+${boss_no}+${other_name}+${i}`;
						BUTTON_DATA[key2] = Select_Label[i - 1];	// ラベル
					}
					let button_text = `お姉ちゃん、${name}さんの${day}日${attack_turn}凸目の${cmd.Boss_Name[boss_counter]}${value_time}${damage}ダメージを削除するよ\n本当にいいのかな？　20秒以内に決めてね！`;
					await buttoncmd.Interaction_Button( msg, button_text, 2, 0, BUTTON_DATA);
					return;
				}
				else{
					DataAry[i] = '';
					msg.reply(`お姉ちゃん、${name}さんの${day}日${attack_turn}凸目の${cmd.Boss_Name[boss_counter]}${value_time}${damage}ダメージを削除したよ`);
					break;
				}
			}
		}
		if( !file_change_flag ){
			msg.reply(`削除するダメージが見つからなかったよ`);
			return;
		}
	}
	// 最新のデータを消す場合
	else{
		file_change_flag = 1;
		let ValueAry = DataAry[DataAry.length - 1].split('\/');
		let name = ValueAry[0];			// メンバーの名前
		let damage = ValueAry[1] * 1;	// 与えたダメージ
		let over = ValueAry[2];			// 持ち越しなら1
		let value_time = ValueAry[3];	// 持ち越し時間
		let day = ValueAry[4];			// 凸日
		let charge_time = ValueAry[5];	// 凸時間
		let boss_counter = ValueAry[6];	// 凸したボス
		kill_boss_no = boss_counter;
		let attack_turn = ValueAry[7];	// 凸番号
		if( value_time ){	value_time = '討伐';	}
		DataAry.pop();
		msg.reply(`お姉ちゃん、${name}さんの${day}日${attack_turn}凸目の${cmd.Boss_Name[boss_counter]}${value_time}${damage}ダメージを削除したよ`);
	}

	if( file_change_flag ){

		let file_text = '';			// 進行書き込み用テキスト
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < DataAry.length; i++ ){
			file_text += DataAry[i] + "\n";
		}

		// 進行ファイル記入
		await cmd.Write_File(datafile, file_text);

		// 残凸状況更新
		let target_day;
		let Update = [1,1,1,1,1];
		nowcmd.Now_Main( msg, target_day, Update );

		// スプレッドシート書き込み（そのボスの周回数、ボスの番号、攻撃回数）
		googlecmd.Damage_Delete(msg, Boss_Lap[kill_boss_no], kill_boss_no, Attack_Count[kill_boss_no]);
	}
	return;
}

// ダメージから予測持ち越し時間を推測する
async function Kill_Time_For( data, damage, boss_no, level ){

	let VALUE_DATA = { "type":"average" };
	// 平均ダメージ
	let [Average_Damage, Average_Num] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List, VALUE_DATA );

	// 初期平均ダメージ
	let Standard_Damage = [
		['6000000','8000000','10000000','12000000','15000000',],	// 0
		['9000000','10000000','12000000','14000000','17000000',],	// 1段階目
		['9000000','10000000','12000000','14000000','17000000',],	// 2段階目
		['12000000','14000000','17000000','19000000','22000000'],	// 3段階目
		['15000000','15000000','15000000','15000000','15000000'],	// 4段階目
		['15000000','15000000','15000000','15000000','15000000']	// 5段階目
	];

	// 基本となる平均ダメージを追加
	Average_Damage[boss_no].push(Standard_Damage[boss_no][level]);
	Average_Num[boss_no]++;

	// 平均ダメージ算出
	let average_all = 0;
	let average_damage = 0;
	for( let i = 0; i < Average_Damage[boss_no].length; i++ ){
		if( Average_Damage[boss_no][i] > 0 ){
			average_all += Average_Damage[boss_no][i] * 1;
		}
	}
	average_damage = parseInt(average_all / Average_Num[boss_no]);

	let rest_time = '';	// 持ち越し時間
	// 2段階目以前、かつ200万ダメージ以下なら全残し
	if( level <= 2 && damage <= 2000000 ){
		//console.log("2段階目以前、かつ200万ダメージ以下なら全残し")
		rest_time = `1:30\?`;
	}
	// 3段階目以上、かつ100万ダメージ以下なら全残し
	else if( level >= 3 && damage <= 1000000 ){
		//console.log("3段階目以上、かつ100万ダメージ以下なら全残し")
		rest_time = `1:30\?`;
	}
	// 平均ダメージを超えていたら、かなりギリギリで倒したということにする
	else if( average_damage < damage ){
		//console.log("平均ダメージを超えていたら、かなりギリギリで倒したということにする")
		rest_time = `0:20\?`;
	}
	// 平均を下回っている場合
	else{
		rest_time = parseInt(90 * (1 - (damage / average_damage)));
		rest_time += 20;	// 残り時間の加算
		if( rest_time > 90 ){ rest_time = 90; }
		let time1 = parseInt(rest_time / 60);
		let time2 = parseInt(rest_time % 60);	time2 = ( '00' + time2 ).slice( -2 );
		rest_time = `${time1}:${time2}?`;
	}

	/*console.log("　　ダメ:" + damage);
	console.log("平均ダメ:" + average_damage);
	console.log("ボスNo:" + boss_no);
	console.log("難易度:" + level);
	console.log("rest_time:" + rest_time);*/
	return rest_time;

}

// ダメージや凸番号修正
async function Damage_Revise(msg, other_name, damage, kill_boss_no, attack_turn, over_time_data){

	let [user_id] = cmd.Set_Id(msg);

	let check;		// trueならエラー

	// 日付は正しいか
	check = await checkcmd.Day_Check(msg);
	if( check == true ){ return; }

	// クランメンバーか
	check = await checkcmd.Member_Check(msg, user_id, other_name);
	if( check == true ){ return; }
	let attack_name = check;

	if( other_name == undefined ){ other_name = ''; }	// カスタムID用に文字数削減

	// ファイルを読み込む
	let battle_schedule = await cmd.Folder(msg.guildId);
	let data = '';
	let datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = [];
	if( data != undefined ){
		DataAry = data.split('\n');
		DataAry = DataAry.filter(Boolean);	// 空白削除
	}

	// 本人のダメージリスト確認
	let VALUE;
	VALUE = { "type" : "list", "list_name" : attack_name };
	let [Member_Damage_List] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List, VALUE);

	let damage_id = 'damage_no';	// 入れ替え時
	let damage_add = '';
	let attack_turn_sub = attack_turn;
	let damage_sub = damage;
	if( damage > 0 ){	// ダメージ入力（修正）の場合はカスタムIDを変更
		damage_id = 'damage_on';
		damage_add = `${damage}-${kill_boss_no}-${attack_turn}`;
	}
	else if( damage < 0 ){	// ダメージ削除の場合はカスタムIDを変更
		damage_id = 'damage_del';
		damage_add = `${damage}`;
	}

	// 選択肢の全Noを取得
	let select_contents = '';
	for( let i = 0; i < Member_Damage_List.length; i++ ){
		let [attack_turn, damage, boss_counter, over_mark, kill_mark, damage_number] = Member_Damage_List[i].split(/\t/);
		if( damage_sub > 0 && attack_turn_sub != '' && attack_turn_sub != attack_turn ){	// ダメージ入力時、指定された凸番号以外は表示しない
			//console.log("A:" + damage_sub);
			Member_Damage_List[i] = '';
			continue;
		}
		if( damage_sub < 0 ){	// delの時。マイナス値なら削除
			damage_number *= 1;
			for( let j = damage_number + 1; j < DataAry.length; j++ ){
				let [name1, damage1, over1, value_time1, day1, charge_time1, boss_counter1, attack_turn1] = DataAry[j].split('\/');
				if( boss_counter == boss_counter1 && value_time1 != '' ){	// そのダメージ以後ボスモンスターが討伐されていたら
					Member_Damage_List[i] += "\t1";
					break;
				}
				else if( kill_mark && boss_counter == boss_counter1 ){	// 討伐データの後にダメージが入っている
					Member_Damage_List[i] += "\t1";
					break;
				}
			}
		}
		select_contents += `${damage_number}-`;
	}
	select_contents = select_contents.slice( 0, -1 );
	Member_Damage_List = Member_Damage_List.filter(Boolean);	// 空白削除

	let BUTTON_DATA = [];
	let type = 0;
	let select_num = Member_Damage_List.length;
	if( Member_Damage_List.length > 5 ){	// 5以上は入らないので
		if( damage_sub < 0 ){	// delの時。ダメージマイナス値なら削除	
			Member_Damage_List[0] = '';	// 一番古いデータを削る
			Member_Damage_List = Member_Damage_List.filter(Boolean);	// 空白削除
		}
		select_num = 5;
	}

	// 表示すべきダメージが存在しない
	if( select_num == 0 ){
		if( attack_turn > 0 ){
			msg.reply(`弟くん、${attack_turn}凸目のダメージが存在しないよ`);
		}
		else{
			msg.reply(`弟くん、修正するダメージが存在しないよ`);
		}
		return;
	}

	let button_text = ``;
	for( let i = 1; i <= select_num; i++ ){
		let key1 = `b${i}_id`;
		let key2 = `b${i}_label`;
		let key3 = `b${i}_disble`;
		let key4 = `b${i}_style`;
		// 凸情報をまとめる
		let [attack_turn, damage, boss_counter, over_mark, kill_mark, damage_number, after_kill] = Member_Damage_List[i - 1].split(/\t/);
		// カスタムIDの設定（※ボスNoはラスト）
		if( damage_sub > 0 ){	// ダメージ入力（修正）の場合はカスタムIDを変更
			BUTTON_DATA[key1] = `${damage_id}+${msg.id}+${damage_number}+${damage_add}`;
			button_text = `弟くん、修正したいダメージを選んで！　20秒以内だよ！`;
		}
		else if( damage_sub < 0 ){	// ダメージ削除の場合はカスタムIDを変更
			BUTTON_DATA[key1] = `${damage_id}+${msg.id}+${damage_number}+${damage_add}`;
			button_text = `弟くん、削除したいダメージを選んで！　20秒以内だよ！\n『青』は安全で『緑』はすぐにダメージ入力すれば安全で『赤』はすっごく危険だよ！`;
			if( kill_mark ){
				BUTTON_DATA[key4] = 'SUCCESS';
			}
			if( after_kill ){
				BUTTON_DATA[key4] = 'DANGER';
			}
		}
		else{
			BUTTON_DATA[key1] = `${damage_id}+${msg.id}+${Member_Damage_List[i - 1]}+${damage_number}+${select_contents}`;
			button_text = `弟くん、凸番号を修正・入替したいものを選んで！　20秒以内だよ！`;
		}
		//console.log(BUTTON_DATA[key1]);
		let top_boss_counter = boss_counter * 1 + 1;
		BUTTON_DATA[key2] = `${attack_turn}凸${over_mark} ${damage}[${top_boss_counter}.${cmd.Boss_Name[boss_counter]}${kill_mark}]`;	// ラベル
		//BUTTON_DATA[key3] = 'true';	// disble
	}
	await buttoncmd.Interaction_Button( msg, button_text, select_num, 0, BUTTON_DATA);
}

// ダメージや凸番号修正
async function Damage_Revise_Type(msg, type, change_last, change_next, attack_turn, over){

	// ファイルを読み込む
	let battle_schedule = await cmd.Folder(msg.guildId);
	let data = '';
	let datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = [];
	if( data != undefined ){
		DataAry = data.split('\n');
		DataAry = DataAry.filter(Boolean);	// 空白削除
	}

	let result_text = '';

	if( type == 0 ){	// 凸番号入れ替え
		// 入れ替え先にダメージが存在する
		if( change_last >= 0 && change_next >= 0 ){
			let [name1, damage1, over1, value_time1, day1, charge_time1, boss_counter1, attack_turn1] = DataAry[change_last].split('\/');
			damage1 *= 1;
			let [name2, damage2, over2, value_time2, day2, charge_time2, boss_counter2, attack_turn2] = DataAry[change_next].split('\/');
			damage2 *= 1;

			let VALUE;

			// 入れ替え元のダメージが討伐している
			VALUE = { "type" : "change", "number" : change_last };
			let [Boss_Lap, Boss_Rest_Hp, level_num, round_counter] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List, VALUE);
			// 討伐していたら
			if( Boss_Rest_Hp[boss_counter1] - damage1 <= 0 ){
				if( over1 != over2 ){	// 通常凸と持ち越しを入れ替えた場合
					if( over1 == 0 && over2 == 1 ){	// 通常凸から持ち越しへ
						value_time1 = '×';
					}
					else if( over1 == 1 && over2 == 0 ){	// 持ち越しから通常凸へ
						value_time1 = '0:20?';
					}
				}
			}else{	value_time1 = '';	}

			// 入れ替え先のダメージが討伐している
			VALUE = { "type" : "change", "number" : change_next };
			[Boss_Lap, Boss_Rest_Hp, level_num, round_counter] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List, VALUE);
			// 討伐していたら
			if( Boss_Rest_Hp[boss_counter2] - damage2 <= 0 ){
				if( over1 != over2 ){	// 通常凸と持ち越しを入れ替えた場合
					if( over2 == 0 && over1 == 1 ){	// 通常凸から持ち越しへ
						value_time2 = '×';
					}
					else if( over2 == 1 && over1 == 0 ){	// 持ち越しから通常凸へ
						value_time2 = '0:20?';
					}
				}
			}else{	value_time2 = '';	}

			// 凸番号及び持ち越しフラグ（あとは持ち越し秒数もあれば）入れ替え
			DataAry[change_last] = `${name1}/${damage1}/${over2}/${value_time1}/${day1}/${charge_time1}/${boss_counter1}/${attack_turn2}`;
			DataAry[change_next] = `${name2}/${damage2}/${over1}/${value_time2}/${day2}/${charge_time2}/${boss_counter2}/${attack_turn1}`;
			let over_text1 = '';	if( over1 == 1 ){ over_text1 = 'の持ち越し' }
			let over_text2 = '';	if( over2 == 1 ){ over_text2 = 'の持ち越し' }
			result_text = `${attack_turn1}凸目${over_text1}と${attack_turn2}凸目${over_text2}を入れ替えたよ`;
		}
		// 入れ替え先が空の場合
		else if( change_last >= 0 && change_next < 0 ){
			let [name1, damage1, over1, value_time1, day1, charge_time1, boss_counter1, attack_turn1] = DataAry[change_last].split('\/');
			damage1 *= 1;
			if( value_time1 != '' ){			// 残り秒数が存在
				if( over1 == 0 && over == 1 ){	// 通常凸から持ち越しに変わった場合
					value_time1 = '×';			// ★持ち越しキルのマークを決めたら修正すること
				}
				else if( over1 == 1 && over == 0 ){	// 持ち越し凸から通常凸
					value_time1 = '0:20?';		// 秒数は適当
				}
			}
			DataAry[change_last] = `${name1}/${damage1}/${over}/${value_time1}/${day1}/${charge_time1}/${boss_counter1}/${attack_turn}`;
			let over_text = '';
			if( over == 1 ){ over_text = 'の持ち越し' }
			let over_text1 = '';	if( over1 == 1 ){ over_text1 = '持ち越し' }
			result_text = `${name1}さんの${attack_turn1}凸目${over_text1}の${damage1}を${attack_turn}凸目${over_text}に入れ替えたよ`;
		}
	}
	else if( type == 1 ){	// ダメージ入力、ボス番号修正
		let damage = change_next;	// わかりにくいが許せ
		let boss_counter = over;	// わかりにくいが許せ
		let [name1, damage1, over1, value_time1, day1, charge_time1, boss_counter1, attack_turn1] = DataAry[change_last].split('\/');
		damage1 *= 1;

		let boss_text1 = '';		let boss_text2 = '';
		if( boss_counter > 0 ){	// ボス番号が何かしら入力されている
			boss_text1 = `${cmd.Boss_Name[boss_counter1]}への`;
			boss_counter1 = boss_counter - 1;	// 強制代入
			boss_text2 = `${cmd.Boss_Name[boss_counter1]}への`;
		}

		DataAry[change_last] = `${name1}/${damage}/${over1}/${value_time1}/${day1}/${charge_time1}/${boss_counter1}/${attack_turn1}`;
		let over_text = '';
		if( over1 == 1 ){ over_text = 'の持ち越し' }
		result_text = `${name1}さんの${attack_turn1}凸目${over_text}${boss_text1}${damage1}ダメージを${boss_text2}${damage}ダメージに修正したよ！`;
	}
	else if( type == 2 ){	// ダメージ削除
		let damage = change_next;	// わかりにくいが許せ
		let boss_counter = over;	// わかりにくいが許せ
		let [name1, damage1, over1, value_time1, day1, charge_time1, boss_counter1, attack_turn1] = DataAry[change_last].split('\/');
		let boss_text1 = '';
		if( boss_counter1 > 0 ){	// ボス番号が何かしら入力されている
			boss_text1 = `${cmd.Boss_Name[boss_counter1]}への`;
		}

		DataAry[change_last] = ``;
		DataAry = DataAry.filter(Boolean);	// 空白削除
		let over_text = '';
		if( over1 == 1 ){ over_text = 'の持ち越し' }
		result_text = `${name1}さんの${attack_turn1}凸目${over_text}${boss_text1}${damage1}ダメージを削除したよ！`;
	}


	// ダメージファイル記入
	try{
		if( result_text != '' ){
			msg.reply(`弟くん！　${result_text}`);

			data = '';
			for( let i = 0; i < DataAry.length; i++ ){
				data += `${DataAry[i]}\n`;
			}

			// データを記録
			await cmd.Write_File(datafile, data);

			// 残凸状況更新
			let Update = [1,1,1,1,1];
			let target_day;
			nowcmd.Now_Main( msg, target_day, Update );
		}
	}
	catch(e){
		console.log("進行データエラー");
	}
}


module.exports = {
	Main_Damage,
	Damage_Del,
	Surplus_Time,
	Kill_Time_For,
	Damage_Revise,
	Damage_Revise_Type
}

