'use strict';

const cmd = require('./set');
const procmd = require('./progress');
const buttoncmd = require('./button');

// 持ち越し計算
async function Main_Calc(msg, text, boss){

	let calc_text = '';
	calc_text = text;
	calc_text = calc_text.replace(/　/g, " ");	// 全角スペースを半角に
	calc_text = calc_text.replace(/ +/g, " ");	// 半角スペースが複数あったらひとつに
	calc_text = calc_text.replace(/\//g, "");	// スラッシュ削除

	let calc_type = 0;
	// フルで残すための削りの必要ダメージ
	if( calc_text.match(/\*\*\*/) ){	calc_type = 3;	}
	// フルで残すためのトドメの必要ダメージ
	else if( calc_text.match(/\*\*/) ){	calc_type = 2;	}
	// 持ち越し計算
	else if( calc_text.match(/\*/) ){	calc_type = 1;	}
	else{
		console.log("AAAA")
		// ここに来ることはない
		return;
	}

	calc_text = calc_text.replace(/\*/g, "");		// *削除
	if( calc_text.match(/[\-|\/|\*]/) ){
		msg.reply("弟くん、-とか/は使っちゃダメだよ");
		console.log(`-や/とか*必要ないよね？`);
		return;
	}

	calc_text = calc_text.replace(/万/g, "0000");	// 万を0000に変換

	let boss_no = '';
	let DataAry = calc_text.split(/ /);			// 数字を抽出
	for( let i = 0; i < DataAry.length; i++ ){
		//if( DataAry[i] != '' && !(DataAry[i].match(/^[\d|\+]{1,9}$/)) ){
		if( DataAry[i] != '' && !(DataAry[i].match(/^[\d|\+]+$/)) ){
			msg.reply("弟くん、半角数字と+以外の文字はダメだよ");
			console.log(`半角数字と+以外はやめて`);
			return;
		}
		// 一桁数字だったらボスNoとして使用する
		if( DataAry[i] != '' && DataAry[i].match(/^[1-5]{1}$/) ){
			boss_no = DataAry[i] - 1;
			DataAry[i] = '';
		}
		else if( boss > 0 ){
			boss_no = boss - 1;
		}
		else{
			DataAry[i] = eval(DataAry[i]);	// 計算式によって答えを割り出す
		}
	}
	DataAry = DataAry.filter(Boolean);	// 空白削除
	if( boss_no === '' && DataAry.length < 3 ){	// ボスNoがない＆データがみっつない（※3つ目が現在HPに置き換わる）

		// ファイルを読み込む
		let battle_schedule = await cmd.Folder(msg.guildId);
		let data = '';
		let datafile = battle_schedule + "\/" + 'progress.txt';
		data = await cmd.Read_File(datafile);

		// 現時点までの進行状況からボスの討伐数とボスの残りHPを確認
		let [Boss_Lap, Boss_Rest_Hp, level_num, round_counter, target_line] = await procmd.Progress(data, cmd.BOSS_HP, cmd.Level_List);
		let min_counter = 9999;
		for( let i= 0; i < Boss_Lap.length - 1; i++ ){
			if( min_counter > Boss_Lap[i] ){
				min_counter = Boss_Lap[i];
			}
		}

		/*let id_text = '';
		for( let i= 0; i < DataAry.length - 1; i++ ){
			id_text += `${DataAry[i]}+`
		}*/

		let button_text = `弟くん、計算したいボスを選んで！　20秒以内だよ！`;

		let BUTTON_DATA = [];
		let type = 0;
		for( let i = 1; i <= cmd.Boss_Name.length; i++ ){
			let key1 = `b${i}_id`;
			let key2 = `b${i}_label`;
			let key3 = `b${i}_disble`;
			// ↓のコメントアウトデータは旧データ。こんなにいらない…今後必要になるとしたら日付強制入力時？
    	    //let button_text = "boss_no<>" + msg + "<>" + damage_num + "<>" + over_flag + "<>" + over_time_data + "<>" + other_name + "<>" + compel_flag + "<>" + target_name + "<>" + target_damage + "<>" + designated_date + "<>" + disable_key;
			// 凸情報をまとめる
			// カスタムIDの設定（※ボスNoはラスト）
			BUTTON_DATA[key1] = `boss_cno+${msg.id}++++${msg.content}+${i}`;
			BUTTON_DATA[key2] = `${cmd.Boss_Name[i - 1]} HP${Boss_Rest_Hp[i - 1]}`;	// ラベル
			if( Boss_Lap[i - 1] >= min_counter + 2 || Boss_Lap[i - 1] >= cmd.Level_List[level_num - 1] ){
				BUTTON_DATA[key3] = 'true';	// disble
			}
		}
		await buttoncmd.Interaction_Button( msg, button_text, 5, 0, BUTTON_DATA);

		//msg.reply(`ボスNoを入力してね`);
		return;
	}

	// ファイルを読み込む
	let battle_schedule = await cmd.Folder(msg.guildId);
	let data = '';
	let datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	// 現時点までの進行状況からボスの討伐数とボスの残りHPを確認
	let [Boss_Lap, Boss_Rest_Hp, level_num] = procmd.Progress(data, cmd.BOSS_HP, cmd.Level_List);


	let result_text = '';
	// 持ち越し時間計算
	if( calc_type == 1 ){
		// 削りダメージもトドメダメージもない
		if( DataAry.length == 0 ){
			msg.reply(`弟くん、今のHPからオーバーキルしたらどれくらいの持ち越し時間になるのか計算するよ\nトドメのダメージや削りダメージを入れてね`);
			return;
		}
		else if( DataAry.length > 0 ){
			let boss_hp = 0;
			let rest_hp = 0;
			let shave_damage = 0;
			let kill_damage = 0;
			let result_text_add1 = '';
			
			if( DataAry.length == 1 ){		// ダメージがひとつならトドメとして計算
				boss_hp = Boss_Rest_Hp[boss_no];
				rest_hp = Boss_Rest_Hp[boss_no] - DataAry[0];
				result_text_add1 = `${Boss_Rest_Hp[boss_no]}`;
				kill_damage = DataAry[0];
			}
			else if( DataAry.length == 2 ){	// ダメージがふたつなら前を削り、後ろでトドメ
				boss_hp = Boss_Rest_Hp[boss_no];
				rest_hp = Boss_Rest_Hp[boss_no] - DataAry[0] - DataAry[1];
				result_text_add1 = `${Boss_Rest_Hp[boss_no]} - 削り${DataAry[0]}`;
				shave_damage = DataAry[0]
				kill_damage = DataAry[1];
			}
			else if( DataAry.length == 3 ){	// ダメージがみっつなら前を削り、中でトドメ。後ろは現在HP
				boss_hp = DataAry[2];
				rest_hp = DataAry[2] - DataAry[0] - DataAry[1];
				result_text_add1 = `${DataAry[2]} - 削り${DataAry[0]}`;
				shave_damage = DataAry[0]
				kill_damage = DataAry[1];
			}

			// ここから結果
			//console.log(rest_hp , shave_damage , kill_damage);
			if( rest_hp > 0 ){
				result_text = '弟くん、トドメをさせてないよ```';
				let nec_damage = parseInt(rest_hp - kill_damage);
				result_text +=`ボスHP${result_text_add1} - トドメ${kill_damage} = 残りHP${rest_hp}`;
				result_text += '```';
			}
			else if( boss_hp - shave_damage <= 0 ){
				result_text = '弟くん、最初のダメージで討伐しちゃってるよ```';
				let nec_damage = parseInt(boss_hp - shave_damage);
				result_text +=`ボスHP${boss_hp} - 削り${shave_damage} = 残りHP${nec_damage}`;
				result_text += '```';
			}
			else{
				let rest_time = Math.ceil( 90 - ((boss_hp - shave_damage) * 90 / kill_damage - 20) );
				if( rest_time > 90 ){ rest_time = 90; }
				let time1 = parseInt(rest_time / 60);
				let time2 = parseInt(rest_time % 60);	time2 = ( '00' + time2 ).slice( -2 );
				result_text = '弟くん、残り時間は' + `${time1}:${time2}` + 'だよ```';
				result_text +=`90 - ((ボスHP${result_text_add1}) * 90 / トドメ${kill_damage} - 20) = ${rest_time}秒`;
				result_text += '```';
			}
			msg.reply(`${result_text}`);
			return;
		}
	}
	// フルを残すための必要なオーバーキル計算
	if( calc_type == 2 ){
		// トドメダメージがない
		if( DataAry.length == 0 ){
			result_text = '弟くん、そのHPから90秒残すにはこのぐらいのダメージが必要になるよ```';
			let nec_damage = parseInt(Boss_Rest_Hp[boss_no] * 4.3);
			result_text += `ボスHP${Boss_Rest_Hp[boss_no]} * 4.3 = 必要ダメージ${nec_damage}`;
			result_text += '```';
			msg.reply(`${result_text}`);	
			return;
		}
		// 削りダメージがある
		else if( DataAry.length > 0 ){
			let boss_hp = Boss_Rest_Hp[boss_no];
			let rest_hp = Boss_Rest_Hp[boss_no] - DataAry[0];
			let shave_damage = DataAry[0];
			if( rest_hp <= 0 ){
				result_text = '弟くん、削りダメージで討伐しちゃってるよ```';
				result_text += `ボスHP${boss_hp} - 削りダメージ${shave_damage} = 残りHP${rest_hp}`;
				result_text += '```';
			}
			else{
				result_text = '弟くん、そのダメージから90秒残すにはこのぐらいのダメージが必要になるよ```';
				let nec_damage = parseInt((boss_hp - shave_damage) * 4.3);
				result_text += `(ボスHP${boss_hp} - 削りダメージ${shave_damage}) * 4.3 = 必要ダメージ${nec_damage}`;
				result_text += '```';
			}
			msg.reply(`${result_text}`);	
			return;
		}
	}
	// 入力されたダメージでフルを残すために必要な削りダメージ
	if( calc_type == 3 ){
		// トドメダメージがない
		if( DataAry.length == 0 ){
			result_text = '弟くん、そのHPから90秒残すにはこのぐらいのダメージが必要になるよ```';
			let nec_damage = parseInt(Boss_Rest_Hp[boss_no] * 4.3);
			result_text += `ボスHP${Boss_Rest_Hp[boss_no]} * 4.3 = 必要ダメージ${nec_damage}`;
			result_text += '```';
			msg.reply(`${result_text}`);	
			return;
		}
		// トドメダメージがある
		else if( DataAry.length > 0 ){
			let boss_hp = Boss_Rest_Hp[boss_no];
			let kill_damage = DataAry[0];

			let nec_damage = parseInt(boss_hp - (kill_damage / 4.3));

			if( nec_damage <= 0 ){
				result_text = '弟くん、そのダメージなら削る必要はないよ```';
				nec_damage = parseInt(Boss_Rest_Hp[boss_no] * 4.3);
				result_text += `ボスHP${Boss_Rest_Hp[boss_no]} * 4.3 = 必要ダメージ${nec_damage}`;
				result_text += '```';
			}
			else{
				result_text = '弟くん、そのダメージで90秒残すにはこのぐらいの削りダメージが必要になるよ```';
				result_text += `ボスHP${Boss_Rest_Hp[boss_no]} - (トドメダメージ${kill_damage} / 4.3) = 必要削りダメージ${nec_damage}`;
				result_text += '```';
			}
			msg.reply(`${result_text}`);	
			return;
		}
	}
}


// 残り時間タイムライン変換
function Time_Line_Change(msg){

	let Time_Value_Group = [];
	let Time_Value = [];

	// 残り時間を受け取る
	let time_left = '';
	if( msg.content.match(/\[(\d{1}):(\d{2})\]/) ){
		Time_Value = msg.content.match(/\[(\d{1}):(\d{2})\]/);
		let min = Time_Value[1];
		let sec = Time_Value[2];
		time_left = min * 60 + sec * 1;
		if( time_left < 20 ){
			msg.reply(`弟くん、残り時間は20秒以上で設定してね`);	
			return;
		}
		else if( time_left > 90 ){
			msg.reply(`弟くん、残り時間は1分30秒以下で設定してね`);	
			return;
		}
	}
	else{
		msg.reply(`弟くん、残り時間を**[1:00]**って形式で設定してね`);	
		return;
	}

	let text = '';
	let DataAry = msg.content.split("\n");

	for( let i = 1; i < DataAry.length; i++ ){

		let data_text = DataAry[i];

		if( data_text.match(/(\d)万/g) ){
			Time_Value_Group = data_text.match(/(\d)万/g);
			for( let j = 0; j < Time_Value_Group.length; j++ ){
				data_text = data_text.replace( Time_Value_Group[j], '');			// 調査するテキストは消す
			}
		}
		if( data_text.match(/(\d)%/g) ){
			Time_Value_Group = data_text.match(/(\d)%/g);
			for( let j = 0; j < Time_Value_Group.length; j++ ){
				data_text = data_text.replace( Time_Value_Group[j], '');			// 調査するテキストは消す
			}
		}
		// 01:20の書式
		if( data_text.match(/(\d{2}):(\d{2})/g) ){
			Time_Value_Group = data_text.match(/(\d{2}):(\d{2})/g);
			for( let j = 0; j < Time_Value_Group.length; j++ ){
				data_text = data_text.replace( Time_Value_Group[j], '');			// 調査するテキストは消す
				Time_Value = Time_Value_Group[j].match(/(\d{2}):(\d{2})/);
				let [min, sec] = Time_Change(time_left, Time_Value[1], Time_Value[2]);	// 時間を変換
				if( min == -1 ){	DataAry[i] = 'no';	}
				else{
			 		min = ( '00' + min ).slice( -2 );
			 		sec = ( '00' + sec ).slice( -2 );
					let true_time = `${min}:${sec}`;
					DataAry[i] = DataAry[i].replace( Time_Value_Group[j], true_time);	// 時間を文字変換
				}
			}
		}
		// 1:20の書式
		if( data_text.match(/(\d{1}):(\d{2})/g) ){
			Time_Value_Group = data_text.match(/(\d{1}):(\d{2})/g);
			for( let j = 0; j < Time_Value_Group.length; j++ ){
				data_text = data_text.replace( Time_Value_Group[j], '');			// 調査するテキストは消す
				Time_Value = Time_Value_Group[j].match(/(\d{1}):(\d{2})/);
				let [min, sec] = Time_Change(time_left, Time_Value[1], Time_Value[2]);	// 時間を変換
				if( min == -1 ){	DataAry[i] = 'no';	}
				else{
			 		sec = ( '00' + sec ).slice( -2 );
					let true_time = `${min}:${sec}`;
					DataAry[i] = DataAry[i].replace( Time_Value_Group[j], true_time);	// 時間を文字変換
				}
			}
		}
		// 0120の書式
		if( data_text.match(/(\d{4})/g) ){
			Time_Value_Group = data_text.match(/(\d{4})/g);
			for( let j = 0; j < Time_Value_Group.length; j++ ){
				data_text = data_text.replace( Time_Value_Group[j], '');			// 調査するテキストは消す
				Time_Value = Time_Value_Group[j].match(/(\d{4})/);
				let min = Time_Value[1].slice( 0, 2 );
				let sec = Time_Value[1].slice( -2 );
				if( min > 1 ){ continue; }
				else if( min == 0 && sec > 30 ){ continue; }
				else if( sec > 60 ){ continue; }
				[min, sec] = Time_Change(time_left, min, sec);	// 時間を変換
				if( min == -1 ){	DataAry[i] = 'no';	}
				else{
			 		min = ( '00' + min ).slice( -2 );
			 		sec = ( '00' + sec ).slice( -2 );
					let true_time = `${min}${sec}`;
					DataAry[i] = DataAry[i].replace( Time_Value_Group[j], true_time);	// 時間を文字変換
				}
			}
		}
		// 120の書式
		if( data_text.match(/(\d{3})/g) ){
			Time_Value_Group = data_text.match(/(\d{3})/g);
			for( let j = 0; j < Time_Value_Group.length; j++ ){
				data_text = data_text.replace( Time_Value_Group[j], '');			// 調査するテキストは消す
				Time_Value = Time_Value_Group[j].match(/(\d{3})/);
				let min = Time_Value[1].slice( 0, 1 ) * 1;
				let sec = Time_Value[1].slice( -2 ) * 1;
				if( min > 1 ){ continue; }
				else if( min == 0 && sec > 30 ){ continue; }
				else if( sec > 60 ){ continue; }
				console.log(Time_Value[1], min, sec);
				[min, sec] = Time_Change(time_left, min, sec);	// 時間を変換
				if( min == -1 ){	DataAry[i] = 'no';	}
				else{
			 		sec = ( '00' + sec ).slice( -2 );
					let true_time = `${min}${sec}`;
					DataAry[i] = DataAry[i].replace( Time_Value_Group[j], true_time);	// 時間を文字変換
				}
			}
		}
		// 20の書式
		if( data_text.match(/(\d{2})/g) ){
			Time_Value_Group = data_text.match(/(\d{2})/g);
			for( let j = 0; j < Time_Value_Group.length; j++ ){
				data_text = data_text.replace( Time_Value_Group[j], '');			// 調査するテキストは消す
				Time_Value = Time_Value_Group[j].match(/(\d{2})/);
				let min = 0;
				let sec = Time_Value[1].slice( -2 );
				if( sec > 60 ){ continue; }
				[min, sec] = Time_Change(time_left, min, sec);	// 時間を変換
				if( min == -1 ){
					DataAry[i] = DataAry[i].replace( Time_Value_Group[j], `??`);	// 時間を文字変換
				}
				else{
			 		sec = ( '00' + sec ).slice( -2 );
					let true_time = `${sec}`;
					DataAry[i] = DataAry[i].replace( Time_Value_Group[j], true_time);	// 時間を文字変換
				}
			}
		}
		else{
		}
		if( DataAry[i] != 'no' ){
			text += DataAry[i] + "\n";
		}
	}
	msg.reply("弟くん、変換したタイムラインだよ\n```" + text + "```");	
}

function Time_Change(time_left, min, sec){

	min = min * 1;
	sec = sec * 1;

	let subtract_time = 90 - time_left;	// 減る分の時間

	let now_time = min * 60 + sec;	// 現在時間

	let true_time = now_time - subtract_time;		// 減る分の時間を減らす

	//console.log(true_time, now_time, subtract_time);
	if( true_time < 0 ){	// 残り時間がマイナスになったら
		return [-1, -1]
	}

	min = parseInt(true_time / 60);
	sec = parseInt(true_time % 60);

	return [min, sec];
}


module.exports = {
	Main_Calc,
	Time_Line_Change
}


