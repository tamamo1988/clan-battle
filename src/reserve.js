'use strict';

const checkcmd = require('./check');
const progresscmd = require('./progress');
const nowcmd = require('./now');
const cmd = require('./set');

// 予約基本
async function Main_Reserve(msg, name, damage, boss_name, attack_type, attack_when, other_name){

	// ギルドIDからアドレス
	let battle_schedule = await cmd.Folder(msg.guildId);

	let check;		// trueならエラー

	// 日付は正しいか
	check = await checkcmd.Day_Check(msg);
	if( check == true ){ return; }

	// クランメンバーか
	check = await checkcmd.Member_Check( msg, name, other_name);
	if( check == true ){ return; }
	let attack_name = check;

	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'reserve.txt';
	data = await cmd.Read_File(datafile);

	// 予約入力	nameは返信場所のフラグ。IDが来たら返信場所を変更
	await Reserve(data, msg, name, attack_name, attack_type, attack_when, damage, boss_name);

	// 残凸状況更新
	let target_day;
	let Update = [];
	Update[cmd.BOSS_NO[boss_name]] = 1;
	nowcmd.Now_Main( msg, target_day, Update );
}

// 予約
async function Reserve(data, msg, name, attack_name, attack_type, attack_when, damage, boss_name){

	let progress_data; 
	let battle_schedule = await cmd.Folder(msg.guildId);

	// ファイルを読み込む
	let datafile = battle_schedule + "\/" + 'progress.txt';
	progress_data = await cmd.Read_File(datafile);

	let Charge_Flag = await checkcmd.Progress_Player(progress_data, attack_name);
	//console.log(Charge_Flag);

	// 以下ふたつはチャンネルからの予約とボタンでの予約による差異を埋めるもの
	// 何かしら記入があったので返信先を抽出
	let channel_id = '';
	if( name && name != undefined ){
		channel_id = await checkcmd.Channel_Search(msg.guildId, "command");
	}

	// IDがない場合はつける
	if( name == '' || name == undefined ){
		name = msg.author.id;
	}


	// 持ち越し周り　キャンセルもだな

	let reserve_change_flag = 0;	// 0新規 1変換
	let reserve_cancel_flag = 0;	// 予約をキャンセルした1
	let reserve_text = '';			// 予約書き込み用テキスト
	let reserve_count = 0;			// 予約数
	let ReserveAry;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = DataAry.length - 1; i >= 0 ; i-- ){
		ReserveAry = DataAry[i].split('\t');
		if( attack_name == ReserveAry[0] ){	// 名前を発見
			reserve_count++;
			if( attack_type == 'キャンセル' && boss_name == ReserveAry[1] ){	// キャンセルでボスがいたら
				reserve_change_flag = 1;
				reserve_cancel_flag = 1;
				DataAry[i] = '';
			}
			else if( reserve_change_flag == 0 ){	// 変換フラグなし
				if( damage ){
					reserve_change_flag = 2;
					DataAry[i] = attack_name + "\t";
					DataAry[i] += ReserveAry[1] + "\t";	// ボス名
					DataAry[i] += ReserveAry[2] + "\t";	// 物理魔法
					DataAry[i] += damage + "\t";		// ダメージ
					DataAry[i] += ReserveAry[4] + "\t";	// 次週次次周
				}
				else if( boss_name == ReserveAry[1] ){	// ボスの名前を発見
					// 次回次々回を修正
					if( attack_when !== '' ){
						reserve_change_flag = 3;
						DataAry[i] = attack_name + "\t";
						DataAry[i] += ReserveAry[1] + "\t";	// ボス名
						DataAry[i] += ReserveAry[2] + "\t";	// 物理魔法
						DataAry[i] += ReserveAry[3] + "\t";	// ダメージ
						DataAry[i] += attack_when + "\t";	// 次週次次周
						//console.log(ReserveAry[1]);
					}
					// 物理・魔法を修正
					else{
						reserve_change_flag = 4;
						DataAry[i] = attack_name + "\t";
						DataAry[i] += ReserveAry[1] + "\t";	// ボス名
						DataAry[i] += attack_type + "\t";	// 物理魔法
						DataAry[i] += ReserveAry[3] + "\t";	// ダメージ
						DataAry[i] += ReserveAry[4] + "\t";	// 次週次次周
						//console.log(ReserveAry[1]);
					}
				}
			}
		}
	}

	DataAry = DataAry.filter(Boolean);	// 空白削除。削除されていればここで消える
	for( let i = 0; i < DataAry.length; i++ ){
		reserve_text += DataAry[i] + "\n";
	}

	// 変換フラグが立っていない。つまり新規登録時
	if( !(reserve_change_flag) ){
		// 予約数超過 0凸なら6個 1凸なら
		let challenge_count = 0;	// 凸回数
		for( let i = 1; i < Charge_Flag.length; i++ ){
			challenge_count += Charge_Flag[i];
		}
		// 予約してないのにキャンセルした
		if( attack_type == 'キャンセル' ){
			msg.reply(`<@${name}>, 弟くん、まだ${boss_name}の予約がないよ？`)
				.then(async function (msg) {
					setTimeout( async function(){
						msg.delete()
							.then(msg => console.log(`Deleted message from ${msg.author.username}`))
							.catch(console.error);
				}, 5000);	})
				.catch(function() {		console.log("リプライエラー")	});
			return;
		}
		// 予約が残り凸数を超えている
		else if( reserve_count >= 6 - challenge_count ){
			msg.reply(`<@${name}>, 弟くん、もうこれ以上の予約はできないよ`)
				.then(async function (msg) {
					setTimeout( async function(){
						msg.delete()
							.then(msg => console.log(`Deleted message from ${msg.author.username}`))
							.catch(console.error);
				}, 5000);	})
				.catch(function() {		console.log("リプライエラー")	});
			return;
		}
		else if( damage ){
			msg.reply(`<@${name}>, 弟くん、ダメージを入れるなら予約してからにしてね`)
				.then(async function (msg) {
					setTimeout( async function(){
						msg.delete()
							.then(msg => console.log(`Deleted message from ${msg.author.username}`))
							.catch(console.error);
				}, 5000);	})
				.catch(function() {		console.log("リプライエラー")	});
			return;
		}
		else{
			reserve_text += attack_name + "\t";
			reserve_text += boss_name + "\t";
			reserve_text += attack_type + "\t";	// 物理魔法
			reserve_text += "\t";				// ダメージ
			if( !attack_when ){	attack_when = 0;	}
			reserve_text += attack_when + "\t";	// 次次周
			reserve_text += "\n";

			let text = `弟くん、${boss_name}を`;
			if( attack_type ){	text += `${attack_type}で`;	}
			else if( attack_when == 1 ){	text += `次回で`;	}
			else if( attack_when == 255 ){	text += `希望で`;	}
			text += `予約したよ <@${name}>`;
			msg.guild.channels.cache.get(channel_id).send(text);
			console.log(`新規予約 ${attack_name} ${boss_name}` );
		}
	}
	else{
		// キャンセルした
		if( reserve_cancel_flag ){
			let text = `弟くん、${boss_name}の予約を取り消したよ！ <@${name}>`;
			msg.guild.channels.cache.get(channel_id).send(text);
			// ファイル保存をする必要があるのでreturnはしない
		}
		else if( reserve_change_flag == 2 ){
			console.log(`ダメージ修正 ${attack_name} ${boss_name} ${damage}` );
		}
		else if( reserve_change_flag == 3 ){
			console.log(`凸予定修正 ${attack_name} ${boss_name} ${attack_when}` );
		}
		else if( reserve_change_flag == 4 ){
			console.log(`凸内容修正 ${attack_name} ${boss_name} ${attack_type}` );
		}
	}

	//console.log(reserve_text);

	// 予約ファイル記入
	datafile = battle_schedule + "\/" + 'reserve.txt';
	await cmd.Write_File(datafile, reserve_text);
}


// 戦闘中
async function Main_Battle(msg, name, kill_boss_no, attack_turn){

	let check;		// trueならエラー

	// 日付は正しいか
	check = await checkcmd.Day_Check(msg);
	if( check == true ){ return; }

	// クランメンバーか
	check = await checkcmd.Member_Check(msg, name);
	if( check == true ){ return; }
	let attack_name = check;

	// 戦闘中入力
	let boss_no = await Battle(msg, name, kill_boss_no, attack_turn);

	// 残凸状況更新
	let target_day;
	let Update = [];
	Update[boss_no] = 1;
	nowcmd.Now_Main( msg, target_day, Update );
}

// 戦闘中書き込み
async function Battle(msg, name, kill_boss_no, attack_turn){

	let battle_schedule = await cmd.Folder(msg.guildId);

	// 以下ふたつはチャンネルからの予約とボタンでの予約による差異を埋めるもの
	// 何かしら記入があったので返信先を抽出
	let channel_id = '';
	if( name && name != undefined ){
		channel_id = await checkcmd.Channel_Search(msg.guildId, "command");
	}

	// IDがない場合はつける
	if( name == '' || name == undefined ){
		name = msg.author.id;
	}

	// クランメンバーか
	let check = await checkcmd.Member_Check(msg, name);
	if( check == true ){ return; }
	let attack_name = check;

	// 日時情報、クラバトの日付と時間取得
	let [year, month, today, hours, minutes, second] = await cmd.Time_Get();

	// ファイルを読み込む
	let progress_data; 
	let datafile = battle_schedule + "\/" + 'progress.txt';
	progress_data = await cmd.Read_File(datafile);

	let Charge_Flag = await checkcmd.Progress_Player(progress_data, attack_name);

	// 現時点までの進行状況からボスの討伐数とボスの残りHPを確認
	let [Boss_Lap, Boss_Rest_Hp, level_num, round_counter] = await progresscmd.Progress(progress_data, cmd.BOSS_HP, cmd.Level_List);

	// 指定されたボスが倒せる状態か否か（2周超過or段階制限）
	if( progresscmd.Round_Check(Boss_Lap, Boss_Rest_Hp, cmd.Level_List, kill_boss_no, level_num) ){
		await msg.reply(`<@${name}>, 弟くん、${cmd.Boss_Name[kill_boss_no]}は討伐済みだよ！　周回の進行を待ってね`)
			.then(async function (msg) {
				setTimeout( async function(){
					msg.delete()
						.then(msg => console.log(`Deleted message from ${msg.author.username}`))
						.catch(console.error);
			}, 5000);	})
			.catch(function() {		console.log("リプライエラー")	});
		return;
	}

	if( Charge_Flag[attack_turn] == 2 ){
		await msg.reply(`<@${name}>, 弟くん、${attack_turn}凸目は使えないよ`)
			.then(async function (msg) {
				setTimeout( async function(){
					msg.delete()
						.then(msg => console.log(`Deleted message from ${msg.author.username}`))
						.catch(console.error);
			}, 5000);	})
			.catch(function() {		console.log("リプライエラー")	});
		return;
	}

	// ファイルを読み込む
	let data = '';
	datafile = battle_schedule + "\/" + 'battle.txt';
	data = await cmd.Read_File(datafile);

	let boss_no = kill_boss_no;	// 消した時のボスのNo
	let battle_flag = 0;	// 1現在戦闘中
	let cancel_flag = 0;	// 1凸宣言キャンセル
	let battle_text = '';	// 戦闘中書き込み用テキスト
	let another_member = '';// 他に戦闘中の者の名前
	let sos_boss = '';		// 救援をしたボスの名前
	let BattleAry;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = DataAry.length - 1; i >= 0 ; i-- ){
		BattleAry = DataAry[i].split('\t');
		if( attack_name == BattleAry[0] ){	// 名前を発見
			//if( kill_boss_no == 99 ){	// キャンセルなら
			if( attack_turn == 99 ){	// キャンセルなら
				battle_flag = 1;
				boss_no = cmd.BOSS_NO[BattleAry[1]];	// ボスNo注入
				cancel_flag = 1;
				DataAry[i] = '';
			}
			else if( kill_boss_no == 999 ){	// SOSなら
				boss_no = cmd.BOSS_NO[BattleAry[1]];	// ボスNo注入
				if( BattleAry[3] == 'SOS' ){	// すでにSOS済み
					await msg.reply(`<@${name}>, 弟くん、もう君は${BattleAry[1]}を救援を出してるよ`)
						.then(async function (msg) {
							setTimeout( async function(){
								msg.delete()
									.then(msg => console.log(`Deleted message from ${msg.author.username}`))
									.catch(console.error);
						}, 5000);	})
						.catch(function() {		console.log("リプライエラー")	});
					return;
				}
				battle_flag = 1;
				sos_boss = BattleAry[1];
				DataAry[i] += 'SOS\t';
			}
			/*else if( attack_turn ){
				battle_flag = 1;
				boss_no = cmd.BOSS_NO[BattleAry[1]];	// ボスNo注入
				DataAry[i] = BattleAry[0] + "\t";	// メンバーの名前
				DataAry[i] += BattleAry[1] + "\t";	// ボスの名前
				DataAry[i] += attack_turn + "\t";	// 凸番号
				DataAry[i] += BattleAry[3] + "\t";	// SOS
			}*/
			else{
				await msg.reply(`<@${name}>, 弟くん、今君は${BattleAry[1]}と戦闘中だよ`)
					.then(async function (msg) {
						setTimeout( async function(){
							msg.delete()
								.then(msg => console.log(`Deleted message from ${msg.author.username}`))
								.catch(console.error);
					}, 5000);	})
					.catch(function() {		console.log("リプライエラー")	});
				return;
			}
		}
		// 同ボスに凸してるメンバーをまとめておく
		else if( cmd.Boss_Name[kill_boss_no] == BattleAry[1] ){
			another_member += `${BattleAry[0]}さんと`
		}
	}

	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		battle_text += DataAry[i] + "\n";
	}

	if( !(battle_flag) ){	// 新規用battle_flagが立っていない
		let challenge_count = 0;	// 凸回数
		/*if( attack_turn > 0 ){
			await msg.reply(`<@${name}>, 弟くん、凸番号は凸宣言をしてからだよ`)
				.then(async function (msg) {
					setTimeout( async function(){
						msg.delete()
							.then(msg => console.log(`Deleted message from ${msg.author.username}`))
							.catch(console.error);
				}, 5000);	})
				.catch(function() {		console.log("リプライエラー")	});
			return;
		}*/
		// 凸番号未記入時は一番若い番号を探す（新規用）
		/*if( attack_turn == '' ){
			for( let i = 1; i < Charge_Flag.length; i++ ){
				challenge_count += Charge_Flag[i];
				if( Charge_Flag[4 - i] < 2 ){	// 前から凸番号の空きを探す
					attack_turn = 4 - i;
				}
			}
		}*/
		//if( kill_boss_no == 99 ){	// キャンセルボタンを押した
		if( attack_turn == 99 ){	// キャンセルボタンを押した
			await msg.reply(`<@${name}>, 弟くん、まだ凸宣言してないよ？`)
				.then(async function (msg) {
					setTimeout( async function(){
						msg.delete()
							.then(msg => console.log(`Deleted message from ${msg.author.username}`))
							.catch(console.error);
				}, 5000);	})
				.catch(function() {		console.log("リプライエラー")	});
			return;
		}
		else if( challenge_count >= 6 ){
			console.log(Charge_Flag)
			await msg.reply(`<@${name}>, 弟くん、もう今日の分は終わってるよ`)
				.then(async function (msg) {
					setTimeout( async function(){
						msg.delete()
							.then(msg => console.log(`Deleted message from ${msg.author.username}`))
							.catch(console.error);
				}, 5000);	})
				.catch(function() {		console.log("リプライエラー")	});
			return;
		}

		if( kill_boss_no < 10 ){
			// 新規テキスト
			battle_text += attack_name + "\t";	// メンバーの名前
			battle_text += cmd.Boss_Name[kill_boss_no] + "\t";	// ボスの名前
			battle_text += attack_turn + "\t";	// 凸番号
			battle_text += "\n";
			let defer_text = '';
			if( Charge_Flag[attack_turn] ){
				defer_text = 'の持ち越し';
			}

			let text = `<@${name}>, **弟くんが${attack_turn}凸目${defer_text}で${cmd.Boss_Name[kill_boss_no]}に挑戦するよ！**`;
			if( another_member ){
				if( another_member.slice(-1) == 'と' ){ another_member = another_member.slice( 0, -1); }
				text += `　**${another_member}が戦闘中だから注意してね！**`;
			}
			await msg.guild.channels.cache.get(channel_id).send(text);
			console.log(`凸宣言 ${attack_name} ${cmd.Boss_Name[kill_boss_no]}` );
		}
	}
	else{
		if( cancel_flag ){
			let text = `<@${name}>, **弟くん！　${cmd.Boss_Name[boss_no]}への挑戦を取り消したよ**`;
			await msg.guild.channels.cache.get(channel_id).send(text);
			console.log(`凸宣言キャンセル ${attack_name}` );
		}
		if( attack_turn ){
			console.log(`凸番号変更 ${attack_turn}凸目` );
		}
	}

	if( kill_boss_no == 999 ){	// 救援ボタンを押した
		let text = ``;
		if( sos_boss ){
			await Danger(msg, attack_name);
			text = `@everyone, **<@${name}>さんが${sos_boss}で大変みたいだよ！　誰か助けられる人はいるかな？**`;
			let botmsg = await msg.guild.channels.cache.get(channel_id).send(text);
			cmd.Set_Thread(botmsg, sos_boss);
		}
		else{
			text = `@everyone, **<@${name}>さんが大変みたいだよ！　誰か助けられる人はいるかな？**`;
			await msg.guild.channels.cache.get(channel_id).send(text);
			return;	// ファイル記入の必要がない
		}
	}

	// 凸宣言ファイル記入
	datafile = battle_schedule + "\/" + 'battle.txt';
	await cmd.Write_File(datafile, battle_text);

	return boss_no;
}




// タスキル
async function Main_Taskkill(msg, name, taskkill_switch){

	let check;		// trueならエラー

	// 日付は正しいか
	check = await checkcmd.Day_Check(msg);
	if( check == true ){ return; }

	// クランメンバーか
	check = await checkcmd.Member_Check( msg, name);
	if( check == true ){ return; }
	let attack_name = check;

	// タスクキル
	await Taskkill(msg, name, attack_name, taskkill_switch);

	// 残凸状況更新
	let target_day;
	let Update = [];
	nowcmd.Now_Main( msg, target_day, Update );
}

// タスキル
async function Taskkill(msg, name, attack_name, taskkill_switch){

	let battle_schedule = await cmd.Folder(msg.guildId);

	// 以下ふたつはチャンネルからの予約とボタンでの予約による差異を埋めるもの
	// 何かしら記入があったので返信先を抽出
	let channel_id = '';
	if( name && name != undefined ){
		channel_id = await checkcmd.Channel_Search(msg.guildId, "command");
	}

	// IDがない場合はつける
	if( name == '' || name == undefined ){
		name = msg.author.id;
	}

	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'taskkill.txt';
	data = await cmd.Read_File(datafile);

	// 日時情報、クラバトの日付と時間取得
	let [year, month, today, hours, minutes, second] = await cmd.Time_Get();

	let taskkill_flag = 0;		// 1書き換え
	let taskkill_text = '';		// タスクキル書き込み用テキスト
	let TaskkillAry;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = DataAry.length - 1; i >= 0 ; i-- ){
		TaskkillAry = DataAry[i].split('\t');
		if( attack_name == TaskkillAry[0] && today == TaskkillAry[1] ){	// 名前＆日付同一
			if( taskkill_switch === 0 ){		// キャンセルなら
				taskkill_flag = 1;
				DataAry[i] = '';
			}
			else{
				msg.reply(`<@${name}>, 今日はもうこれ以上のやり直しはできないんだよ、弟くん……`)
					.then(async function (msg) {
						setTimeout( async function(){
							msg.delete()
								.then(msg => console.log(`Deleted message from ${msg.author.username}`))
								.catch(console.error);
					}, 5000);	})
					.catch(function() {		console.log("リプライエラー")	});
				return;
			}
		}
	}
	if( taskkill_flag == 0 && taskkill_switch === 0 ){
		msg.reply(`<@${name}>, 弟くん、今日は登録をまだしてないよ？`)
			.then(async function (msg) {
				setTimeout( async function(){
					msg.delete()
						.then(msg => console.log(`Deleted message from ${msg.author.username}`))
						.catch(console.error);
			}, 5000);	})
			.catch(function() {		console.log("リプライエラー")	});
		return;
	}

	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		taskkill_text += DataAry[i] + "\n";
	}
	if( taskkill_switch ){	// 追加かつ名前がなかった
		// ファイルを読み込む
		let data = '';
		datafile = battle_schedule + "\/" + 'battle.txt';
		data = await cmd.Read_File(datafile);

		let battle_text = '';	// 戦闘中書き込み用テキスト
		let battle_flag = '';	// 戦闘中書き込み用フラグ
		let BattleAry;
		let DataAry = data.split('\n');
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = DataAry.length - 1; i >= 0 ; i-- ){
			BattleAry = DataAry[i].split('\t');
			if( attack_name == BattleAry[0] ){	// 名前を発見
				battle_flag = 1;
				DataAry[i] = '';
			}
		}
		await Danger(msg, attack_name);
		if( battle_flag == 1 ){
			DataAry = DataAry.filter(Boolean);	// 空白削除
			for( let i = 0; i < DataAry.length; i++ ){
				battle_text += `${DataAry[i]}\n`;
			}
			// 戦闘中データ記入
			datafile = battle_schedule + "\/" + 'battle.txt';
			await cmd.Write_File(datafile, battle_text);
		}

		taskkill_text += attack_name + "\t";	// メンバーの名前
		taskkill_text += today + "\t";	// 日付
		taskkill_text += "\n";
		let text = `<@${name}>, めっ！　だぞっ。やり直しを許すのは１日１回だけだからね？`;
		msg.guild.channels.cache.get(channel_id).send(text);
		console.log(`タスキル ${attack_name}`)
	}
	if( taskkill_flag ){
		let text = `<@${name}>, 弟くん、今日の登録を取り消したよ！`;
		msg.guild.channels.cache.get(channel_id).send(text);
		console.log(`タスキルキャンセル ${attack_name}`)
	}

	// タスキルデータ記入
	datafile = battle_schedule + "\/" + 'taskkill.txt';
	await cmd.Write_File(datafile, taskkill_text);
}


// 優先権
async function Main_Priority(msg, name, switch_flag){

	let check;		// trueならエラー

	// 日付は正しいか
	check = await checkcmd.Day_Check(msg);
	if( check == true ){ return; }

	// クランメンバーか
	check = await checkcmd.Member_Check( msg, name);
	if( check == true ){ return; }
	let attack_name = check;

	// タスクキル
	await Priority(msg, name, attack_name, switch_flag);

	// 残凸状況更新
	let target_day;
	let Update = [];
	nowcmd.Now_Main( msg, target_day, Update );
}

// 優先権登録
async function Priority(msg, name, attack_name, switch_flag){

	let battle_schedule = await cmd.Folder(msg.guildId);

	// 以下ふたつはチャンネルからの予約とボタンでの予約による差異を埋めるもの
	// 何かしら記入があったので返信先を抽出
	let channel_id = '';
	if( name && name != undefined ){
		channel_id = await checkcmd.Channel_Search(msg.guildId, "command");
	}

	// IDがない場合はつける
	if( name == '' || name == undefined ){
		name = msg.author.id;
	}

	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'priority.txt';
	data = await cmd.Read_File(datafile);

	// 日時情報、クラバトの日付と時間取得
	let [year, month, today, hours, minutes, second] = await cmd.Time_Get();

	let flag = 0;		// 1書き換え
	let text = '';		// タスクキル書き込み用テキスト
	let ValueAry;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = DataAry.length - 1; i >= 0 ; i-- ){
		ValueAry = DataAry[i].split('\t');
		if( attack_name == ValueAry[0] && today == ValueAry[1] ){	// 名前＆日付同一
			if( switch_flag === 0 ){		// キャンセルなら
				flag = 1;
				DataAry[i] = '';
			}
			else{
				msg.reply(`<@${name}>, 弟くん、もう優先登録してあるよ？`)
					.then(async function (msg) {
						setTimeout( async function(){
							msg.delete()
								.then(msg => console.log(`Deleted message from ${msg.author.username}`))
								.catch(console.error);
					}, 5000);	})
					.catch(function() {		console.log("リプライエラー")	});
				return;
			}
		}
	}
	if( flag == 0 && switch_flag === 0 ){
		msg.reply(`<@${name}>, 弟くん、今日はまだ優先登録してないよ？`)
			.then(async function (msg) {
				setTimeout( async function(){
					msg.delete()
						.then(msg => console.log(`Deleted message from ${msg.author.username}`))
						.catch(console.error);
			}, 5000);	})
			.catch(function() {		console.log("リプライエラー")	});
		return;
	}

	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		text += DataAry[i] + "\n";
	}
	if( switch_flag ){	// 追加かつ名前がなかった
		text += attack_name + "\t";	// メンバーの名前
		text += today + "\t";	// 日付
		text += "\n";
		let msg_text = `<@${name}>, 弟くん、優先登録したよ！`;
		msg.guild.channels.cache.get(channel_id).send(msg_text);
		console.log(`優先登録 ${attack_name}`)
	}
	if( flag ){
		let msg_text = `<@${name}>, 弟くん、優先登録を取り消したよ`;
		msg.guild.channels.cache.get(channel_id).send(msg_text);
		console.log(`優先キャンセル ${attack_name}`)
	}

	// 優先ファイル記入
	datafile = battle_schedule + "\/" + 'priority.txt';
	await cmd.Write_File(datafile, text);
}


// 危険登録
async function Danger(msg, name){

	let battle_schedule = await cmd.Folder(msg.guildId);

	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'battle.txt';
	data = await cmd.Read_File(datafile);

	let BattleAry;
	let danger_boss = '';
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	//console.log("data:" + data);
	for( let i = DataAry.length - 1; i >= 0; i-- ){
		BattleAry = DataAry[i].split('\t');
		//console.log("name:" + name);
		//console.log("BattleAry[0]:" + BattleAry[0]);
		if( name == BattleAry[0] ){	// 名前を発見
			danger_boss = BattleAry[1];
		}
	}

	//console.log("danger_boss:" + danger_boss);
	if( danger_boss == '' ){ return; }	// ボス名が発見できない場合はそのまま帰る

	// 以下、タスキル及びSOS

	// 日時情報、クラバトの日付と時間取得
	let [year, month, today, hours, minutes, second] = await cmd.Time_Get();

	// ファイルを読み込む
	datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	// 現時点までの進行状況からボスの討伐数とボスの残りHPを確認
	let [Boss_Lap, Boss_Rest_Hp, level_num, round_counter] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List);


	// ファイルを読み込む
	data = '';
	datafile = battle_schedule + "\/" + 'danger.txt';
	data = await cmd.Read_File(datafile);

	let text = '';		// タスクキル書き込み用テキスト
	let ValueAry;
	DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除

	for( let i = 0; i < DataAry.length; i++ ){
		text += DataAry[i] + "\n";
	}
	text += `${name}\t${danger_boss}\t${today}\t${level_num}\t${Boss_Lap[cmd.BOSS_NO[danger_boss]]}\n`;

	// 優先ファイル記入
	datafile = battle_schedule + "\/" + 'danger.txt';
	await cmd.Write_File(datafile, text);
	//console.log("end:" + text);
}


module.exports = {
	Main_Reserve,
	Main_Battle,
	Main_Taskkill,
	Main_Priority
}



