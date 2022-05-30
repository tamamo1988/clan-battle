'use strict';

const { MessageActionRow, MessageButton } = require('discord.js');
const fs = require('fs');
const cmd = require('./set');
const checkcmd = require('./check');
const damagecmd = require('./damage');
const membercmd = require('./member');
const bosscmd = require('./boss');
const buttoncmd = require('./button');
const calccmd = require('./calc');
const reservecmd = require('./reserve');
const nowcmd = require('./now');
const reacmd = require('./reaction');
const infocmd = require('./info');

//10045 877364394802176042
//BUTTON_DATA[key1] = `boss_no+${msg.id}+${damage}+${over_time_data}+${other_name}+${disble_flag}+${i}`;

async function Interaction_Main(interaction, client){

	let original_msg = interaction.message;

	let value = interaction.customId;
	let ValueAry = value.split('+');	// 選択肢からIDを分割
	let value_len = ValueAry.length;	// 配列内の数

	let custom_id = ValueAry[0];		// 1個目はカスタムID
	let msg = ValueAry[1];				// 2個目はメッセージID
	let sp1 = ValueAry[2];				// 3個目から5個目は特殊なデータ必要があれば使う
	let sp2 = ValueAry[3];				// 3個目から5個目は特殊なデータ必要があれば使う
	let sp3 = ValueAry[4];				// 3個目から5個目は特殊なデータ必要があれば使う

	// 引き継ぐカスタムIDを雑にまとめておく
	let custom_id_text = '';
	for( let i = 1; i < ValueAry.length; i++ ){
		custom_id_text += `${ValueAry[i]}+`;
	}
	if( custom_id_text.slice(-1) == '+' ){ custom_id_text = custom_id_text.slice( 0, -1); }

	if( msg == undefined ){ // msg_idがなかったら
		console.log(interaction.customId);	// 処理無理
		return;
	}

	// カスタムID仕込んだメッセージIDから選択肢を出した本人のメッセージデータを取得
	let user_msg = await interaction.channel.messages.fetch(msg);
	//let user_msg = await interaction.channel.command.fetch(msg);
	// ★ここがコマンドで行くとまずい
	// ★コマンド入力のIDを持ってこられるか？

	// 本人のボタン押しならば受け付ける
	if( user_msg.author.id != interaction.user.id ){
		const user = client.users.cache.get(user_msg.author.id);
		await user_msg.channel.send("今押したボタンは<@" + user_msg.author.id + ">さんだけが押せるものだよ");
		return;
	}

	if (custom_id === 'boss_no') {
		let disable_key = sp1;
		let Disable_List = disable_key.split('-');

		let target_boss_no = ValueAry[value_len - 1];	// 最後の要素から選んだ選択肢を抽出

		// 選択肢情報まとめ
		let common_id = `${custom_id_text}`;
		let BUTTON_DATA = [];
		for(let i = 1; i <= 3; i++ ){
			let key1 = `b${i}_id`;		let key2 = `b${i}_label`;
			let key3 = `b${i}_style`;	let key4 = `b${i}_disble`;
			// カスタムIDの設定（※ボスNoや）
			BUTTON_DATA[key1] = `c_no+${common_id}+${i}`;
			if( Disable_List[i - 1] == 1 ){		// 持ち越しの場合
				BUTTON_DATA[key2] = `${i}凸♻`;	// ラベル
			}else{								// 未凸あるいは終了してる場合
				BUTTON_DATA[key2] = `${i}凸`;	// ラベル
			}
			BUTTON_DATA[key3] = `SUCCESS`;
			if( Disable_List[i - 1] == 2 ){		// 凸終了してる
				BUTTON_DATA[key4] = `true`;
			}else{
				BUTTON_DATA[key4] = `false`;
			}
		}
		// 戻るボタン
		let j = 4;
		let key1 = `b${j}_id`;		let key2 = `b${j}_label`;
		let key3 = `b${j}_style`;	let key4 = `b${j}_disble`;
		BUTTON_DATA[key1] = `back+${common_id}`;
		BUTTON_DATA[key2] = `戻る`;		// ラベル
		BUTTON_DATA[key3] = `DANGER`;	// スタイル

		let button_text = `選んだのは${cmd.Boss_Name[target_boss_no - 1]}だね！　次に選ぶのは凸番号だよ`;
		buttoncmd.Interaction_Button( msg, button_text, 4, interaction, BUTTON_DATA);
	}
	else if(custom_id === 'back'){	// 戻る
		let BUTTON_DATA = [];
		for( let i = 1; i <= cmd.Boss_Name.length; i++ ){
			let key1 = `b${i}_id`;
			let key2 = `b${i}_label`;
			BUTTON_DATA[key1] = `boss_no+${custom_id_text}+${i}`;
			BUTTON_DATA[key2] = cmd.Boss_Name[i - 1];	// ラベル
		}
		let button_text = `戻ったよ！　ボスを選択してね！`;
		buttoncmd.Interaction_Button( msg, button_text, 5, interaction, BUTTON_DATA);
	}
	else if(custom_id === 'c_no'){	// ダメージ入力
		let damage = ValueAry[5];		// ダメージ
		let over_time = ValueAry[6];	// 持ち越し時間
		let other_name = ValueAry[7];	// 代理投票
		let target_boss_no = ValueAry[value_len - 2];	let attack_turn = ValueAry[value_len - 1];
		let main_text = cmd.Boss_Name[target_boss_no - 1] + 'で' + attack_turn + '凸目を選択したよ！　選択終了だね';
		/*await interaction.update({ content: main_text, components: [] })
			.then()
			.catch(console.error);*/
		await original_msg.delete()
			.then()
			.catch("delete error");
			//.catch(console.error);
		//cmd.BUTTON_FLAG[original_msg.id] = 1;
		// 凸宣言時は予約
		if( sp2 == 1 ){
			await reservecmd.Main_Battle( user_msg, user_msg.author.id, target_boss_no, attack_turn)
		}
		// 通常時はダメージ
		else{
			await damagecmd.Main_Damage( user_msg, 0, 1, damage, target_boss_no, attack_turn, over_time, other_name)
		}
	}
	else if (custom_id === 'boss_cno') {	// ボス選択
		let select_no = ValueAry[value_len - 1];
		let msg_content = ValueAry[value_len - 2];
		await original_msg.delete()
			.then()
			.catch("delete error");
		await calccmd.Main_Calc( user_msg , msg_content, select_no );
	}
	else if(custom_id === 'del_select'){// 削除
		let boss_no = ValueAry[5];		// 選んでいたボス
		let other_name = ValueAry[6];	// 誰のデータか
		let select_no = ValueAry[value_len - 1];
		let select_text = '';
		if( select_no == 1 ){
			select_text = '削除するよ！　';
		}else{ select_text = '削除しないよ！　'; }
		let main_text = `${select_text}選択終了だね`;
		/*await interaction.update({ content: main_text, components: [] })
			.then()
			.catch(console.error);*/
		await original_msg.delete()
			.then()
			.catch(console.error);
		//cmd.BUTTON_FLAG[original_msg.id] = 1;
		if( select_no == 1 ){
			await damagecmd.Damage_Del( user_msg, 1, boss_no, other_name);	// 1で削除
		}
	}
	else if(custom_id === 'damage_no'){// ダメージ修正
		// ファイルを読み込む
		let battle_schedule = await cmd.Folder(original_msg.guildId);
		let data = '';
		let datafile = battle_schedule + "\/" + 'progress.txt';
		data = await cmd.Read_File(datafile);

		let DataAry;
		if( data != undefined ){
			DataAry = data.split('\n');
		}
		DataAry = DataAry.filter(Boolean);	// 空白削除

		let Member_Damage_List = sp3.split('-');	// 前の全選択肢ダメージNo配列
		Member_Damage_List = Member_Damage_List.filter(Boolean);	// 空白削除

		// 選んだ選択肢の内容
		let [attack_turn_o, damage_o, boss_counter_o, over_o] = sp1.split(/\t/);
		let over_o_mark = '';
		if( over_o == "♻" ){ over_o_mark = '♻'; }

		let Member_Damage_List2 = new Array;
		for( let i = 1; i <= 3; i++ ){		// 凸番号
			let kill_flag = 0;
			for( let j = 0; j <= 1; j++ ){	// 持ち越し
				let damage_flag = 0;
				for( let k = 0; k < Member_Damage_List.length; k++ ){
					let [name, damage, over, value_time, day, battle_time, boss_counter, attack_turn] = DataAry[Member_Damage_List[k]].split(/\//);
					if( i == attack_turn && over == j && sp2 != Member_Damage_List[k] ){	// 凸番号＆持ち越しフラグが同じ＆1つ目の選択肢と同じ番号ではない
						Member_Damage_List2.push(`${Member_Damage_List[k]}\t${i}\t${j}\t${damage}\t${boss_counter}\t${value_time}`);
						if( value_time != '' ){
							kill_flag = 1;
						}
						damage_flag = 1;
					}
					else if( i == attack_turn && over == j && sp2 == Member_Damage_List[k] ){	// 凸番号＆持ち越しフラグが同じ＆1つ目の選択肢と同じ
						damage_flag = 1;
					}
				}

				if( damage_flag == 0 ){	// ダメージが存在しない
					let disable_flag = -1;
					if( j == 1 && kill_flag != 1 ){
						disable_flag = -2;
					}
					Member_Damage_List2.push(`${disable_flag}\t${i}\t${j}\t`);
				}
			}
		}

		let DISABLE_DATA = [];
		for( let i = 0; i < Member_Damage_List2.length; i++ ){
			let [list_no, attack_turn, over, damage, boss_counter, value_time] = Member_Damage_List2[i].split(/\t/);
			let key = `${attack_turn}_${over}`;
			DISABLE_DATA[key] = list_no;
		}

		let BUTTON_DATA = [];
		let type = 0;
		let select_num = Member_Damage_List2.length;
		let disable_num = 0;
		// 実際はもっと色々複雑になる…
		// 1～3凸目の持ち越しまで、入れられるものを空でも表示する必要がある
		for( let i = 1; i <= select_num; i++ ){
			let key1 = `b${i}_id`;
			let key2 = `b${i}_label`;
			let key3 = `b${i}_disble`;
			let key4 = `b${i}_style`;
			// 凸情報をまとめる
			let [list_no, attack_turn, over, damage, boss_counter, value_time] = Member_Damage_List2[i - 1].split(/\t/);
			let over_mark = '';
			if( over == 1 ){ over_mark = '♻'; }
			let kill_mark = '';
			if( value_time != '' ){ kill_mark = '⚔'; }

			// カスタムIDの設定（※ボスNoはラスト）
			BUTTON_DATA[key1] = `damage_no2+${msg}+${sp2}+${list_no}+${attack_turn}+${over}`;
			// ダメージが入力されてる凸
			if( list_no >= 0 ){
				//console.log("Z", i, list_no);
				let top_boss_counter = boss_counter * 1 + 1;
				BUTTON_DATA[key2] = `${attack_turn_o}凸${over_o_mark}→${attack_turn}凸${over_mark} ${damage}[${top_boss_counter}.${cmd.Boss_Name[boss_counter]}${kill_mark}]`;	// ラベル

				// 入れ替えで不備が出ないように（1凸目の持ち越しが1凸目の通常前にあるとか）
				// 選択した通常凸に持ち越しが存在する場合、選択先がその持ち越しより後ろの数字であってはならない
				// 選択した通常凸に持ち越しが存在しない場合、
					//1. 選択先の通常凸に持ち越しがある場合、持ち越し前である必要がある
					//2. 選択先の通常凸に持ち越しがない場合、自由
					//3. 選択先が持ち越し凸の場合、通常凸の後ろである必要がある　※前提としてそうなってないとおかしい
				if( over_o == 0 ){	// 選択元が通常なら
					// DISABLE_DATA[key] 持ち越し先
					// sp2 選択元No
					// list_no 選択先No

					let key = `${attack_turn_o}_1`;
					//console.log("A1", "dis:" + DISABLE_DATA[key], "list:" + list_no, "key:" + key);
					// 選択元に持ち越しがあるか調べる
					// ＆選択先が選択元持ち越し凸よりも数字が低い場合は選択できないように
					// ※通常凸を持ち越しより前に置くことの禁止
					// 選択元持ち越し凸No <= 選択先No
					if( DISABLE_DATA[key] <= list_no && DISABLE_DATA[key] >= 0 ){	// 持ち越しの数字より大きかったら選択不可
						BUTTON_DATA[key3] = 'true';	// disble
					}

					// 選択先に持ち越しがあるか調べる
					// ＆選択先の通常凸より自身の数字が低い場合は選択できないように
					key = `${attack_turn}_1`;
					//console.log("A2", "dis:" + DISABLE_DATA[key], "sp2:" + sp2, "key:" + key);
					if( DISABLE_DATA[key] <= sp2 && DISABLE_DATA[key] >= 0 ){	// 通常の数字より小さかったら選択不可
						BUTTON_DATA[key3] = 'true';	// disble
					}

					// 同じ凸番号の通常と持ち越しの入れ替え禁止
					/*if( attack_turn == attack_turn_o ){
						BUTTON_DATA[key3] = 'true';	// disble
					}*/

				}
				// 選択した持ち越し凸は、自前の通常凸より上の前の数字と交換してはならない
				// →選択先が通常凸の場合、選択先の持ち越し凸より前ならばアウト
				// →選択先が持ち越し凸の場合、選択先の通常凸より前ならばアウト？
				else if( over_o == "♻" ){	// 持ち越しなら通常を調べる
					let key = `${attack_turn_o}_0`;
					//console.log("B1", DISABLE_DATA[key], list_no, sp2, key)
					// 選択元の通常凸の番号を調べる
					// ＆選択先が選択元通常凸よりも数字が高い場合は選択できないように
					// ※持ち越しより通常凸を後に置くことの禁止
					// 選択元通常凸No >= 選択先No
					if( DISABLE_DATA[key] >= list_no && DISABLE_DATA[key] >= 0 ){	// 通常の数字より小さかったら選択不可
						BUTTON_DATA[key3] = 'true';	// disble
					}

					key = `${attack_turn}_0`;
					if( DISABLE_DATA[key] >= sp2 && DISABLE_DATA[key] > 0 ){	// 通常の数字より小さかったら選択不可
						BUTTON_DATA[key3] = 'true';	// disble
					}
				}

				if( over_o == 0 && over == 0 ){	// 元が通常で選択肢も通常ならばその持ち越しをチェック
					let key = `${attack_turn}_1`;
					//console.log("C");
					//console.log(DISABLE_DATA[key], key);
					if( DISABLE_DATA[key] >= 0 ){	// 持ち越しが存在しているならダメ
						BUTTON_DATA[key3] = 'true';	// disble
					}
				}
				// 1凸目持ち越しを3凸目持ち越しありのところの3凸目通常に入れられないようにする
				// 3凸目持ち越しを13凸目持ち越しありのところの1凸目通常に入れられないようにする
			}
			// ダメージが入ってない凸　要するに空
			else{
				BUTTON_DATA[key2] = `${attack_turn_o}凸${over_o_mark}→${attack_turn}凸${over_mark} 空`;	// ラベル
				//console.log("over_o_mark:" + over_o_mark);
				if( over_o_mark == '' ){	// 選択元が通常だった場合
					let key = `${attack_turn_o}_1`;
					//console.log("DISABLE_DATA[key]:" + DISABLE_DATA[key]);
					if( DISABLE_DATA[key] > 0 ){	// 持ち越しが存在する場合、通常凸のダメージを空凸に入れるのはそもそも厳禁
						BUTTON_DATA[key3] = 'true';	// disble
					}
				}
				// ここでも選択先の通常凸よりも前の数字だったら～とかをやる必要がある
				//console.log("選択元", attack_turn_o)
				//console.log("選択先", attack_turn)

				if( list_no == -2 ){	// 通常凸で倒していない
					BUTTON_DATA[key3] = 'true';	// disble
					BUTTON_DATA[key4] = 'SECONDARY';	// Style
				}
				else if( over_mark == "♻" ){	// 選択先が持ち越しだった場合
					let key = `${attack_turn}_0`;
					//console.log("B`", DISABLE_DATA[key], sp2, key, attack_turn_o)

					// 選択先が、選択元の通常凸よりも前であってはならない
					if( DISABLE_DATA[key] >= sp2 && DISABLE_DATA[key] > 0 ){	// 通常の数字より小さかったら選択不可
						BUTTON_DATA[key3] = 'true';	// disble
					}
				}
			}
			if( BUTTON_DATA[key3] == 'true' ){
				// あとで直す
				disable_num++;
			}
		}

		let [name, damage, over, value_time, day, battle_time, boss_counter, attack_turn] = DataAry[sp2].split(/\//);
		let over_mark = '';
		if( over == 1 ){ over_mark = '♻'; }
		let kill_mark = '';
		if( value_time != '' ){ kill_mark = '⚔'; }

		if( disable_num != select_num ){	// 選択できる余地がある
			let button_text = `選んだのは${attack_turn}凸${over_mark} ${damage}[${cmd.Boss_Name[boss_counter]}${kill_mark}]だね！　次はどの凸番号に変更したいのか選んで！　20秒以内だよ！`;
			await buttoncmd.Interaction_Button( msg, button_text, select_num, interaction, BUTTON_DATA);
		}
		else{	// 選択の余地がない
			await original_msg.delete()
				.then()
				.catch("delete error");
				//.catch(console.error);
			user_msg.react("❌");
			user_msg.reply(`弟くん…${attack_turn}凸${over_mark} ${damage}[${cmd.Boss_Name[boss_counter]}${kill_mark}]はどこにも入れ替えられないよ…`);
		}
	}
	else if(custom_id === 'damage_no2'){// ダメージ修正先

		let attack_turn = sp3;			// 凸番号
		let over = ValueAry[5];	// 持ち越しフラグ

		// ファイルを読み込む
		let battle_schedule = await cmd.Folder(original_msg.guildId);
		let data = '';
		let datafile = battle_schedule + "\/" + 'progress.txt';
		data = await cmd.Read_File(datafile);

		await original_msg.delete()
			.then()
			.catch("delete error");
			//.catch(console.error);

		// 数字が両方ある場合は凸番号と持ち越しの入れ替え処理
		if( sp1 >= 0 && sp2 >= 0 ){
			damagecmd.Damage_Revise_Type(user_msg, 0, sp1, sp2, attack_turn, over);
		}
		// 入れ替え先がマイナス時は凸番号と持ち越しの代入
		else if( sp1 >= 0 && sp2 < 0 ){
			damagecmd.Damage_Revise_Type(user_msg, 0, sp1, sp2, attack_turn, over);
		}
		// await damagecmd.Main_Damage( user_msg, 0, 0, damage, target_boss_no, attack_turn, over_time, other_name)
		// 数字がひとつしかない場合は数字の変更

	}
	else if(custom_id === 'damage_on'){// ダメージ修正先

		let damage_no = sp1;	// 選択されたダメージのNo
		let damage_add = sp2;	// 入力内容
		let [damage, boss_counter, attack_turn] = sp2.split(/-/);

		// ファイルを読み込む
		let battle_schedule = await cmd.Folder(original_msg.guildId);
		let data = '';
		let datafile = battle_schedule + "\/" + 'progress.txt';
		data = await cmd.Read_File(datafile);

		await original_msg.delete()
			.then()
			.catch("delete error");
			//.catch(console.error);

		damagecmd.Damage_Revise_Type(user_msg, 1, damage_no, damage, attack_turn, boss_counter);

	}
	else if(custom_id === 'damage_del'){// ダメージ修正先

		let damage_no = sp1;	// 選択されたダメージのNo
		let damage_add = sp2;	// 入力内容
		let [damage, boss_counter, attack_turn] = sp2.split(/-/);

		// ファイルを読み込む
		let battle_schedule = await cmd.Folder(original_msg.guildId);
		let data = '';
		let datafile = battle_schedule + "\/" + 'progress.txt';
		data = await cmd.Read_File(datafile);

		await original_msg.delete()
			.then()
			.catch("delete error");
			//.catch(console.error);

		damagecmd.Damage_Revise_Type(user_msg, 2, damage_no, damage, attack_turn, boss_counter);

	}
}

async function Interaction_Command(interaction, client){

	// メッセージ
	//let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send("testtest");
	//console.log(msg_sub);

	if (interaction.commandName === 'blep') {
		//if (interaction.options.getString('language') === 'japanese') {
		let first = interaction.options.getString('animal');
		let second = interaction.options.getInteger('only_smol');
		await interaction.reply({ content: 'Pong!' + `${first} ${second}`, ephemeral: false });
		//await interaction.reply({ content: 'Pong!' + `${first}`, ephemeral: true });
	}
	// ダメージ
	else if (interaction.commandName === 'd') {
		let damage = interaction.options.getInteger('ダメージ');
		let target_boss_no = interaction.options.getString('ボス');
		let attack_turn = interaction.options.getString('凸番号');
		let other_name = interaction.options.getString('代理');
		let target_day = interaction.options.getInteger('日付');
		let over_time_data = interaction.options.getString('残り時間');;

		let text = `<@${interaction.user.id}>, ダメージ入力コマンドを受け取ったよ`;
		if( damage != null ){ text += ` ${damage}`; }
		if( target_boss_no != null ){ text += ` ${target_boss_no}`; }
		if( attack_turn != null ){ text += ` ${attack_turn}`; }
		if( other_name != null ){ text += ` ${other_name}`; }
		if( target_day != null ){ text += ` ${target_day}`; }
		if( over_time_data != null ){ text += ` ${over_time_data}`; }

		let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send(text);
		let user_msg = await interaction.channel.messages.fetch(msg_sub.id);
		user_msg.author.id = interaction.user.id;

		//await interaction.deferReply();
		let end_flag = await damagecmd.Main_Damage(interaction, 0, 1, damage, target_boss_no, attack_turn, over_time_data, other_name, target_day);
		await user_msg.delete()
			.then(user_msg => console.log(`Deleted message from ${user_msg}`))
			.catch(console.error);
		return end_flag;
	}
	// kill
	else if (interaction.commandName === 'kill') {
		let target_boss_no = interaction.options.getString('ボス');
		let attack_turn = interaction.options.getString('凸番号');
		let other_name = interaction.options.getString('代理');
		let target_day = interaction.options.getInteger('日付');
		let over_time_data = interaction.options.getString('残り時間');;

		let text = `<@${interaction.user.id}>, ダメージ入力コマンドを受け取ったよ`;
		text += ` 討伐`;
		if( target_boss_no != null ){ text += ` ${cmd.Boss_Name[target_boss_no - 1]}`; }
		if( attack_turn != null ){ text += ` ${attack_turn}凸`; }
		if( other_name != null ){ text += ` ${other_name}`; }
		if( target_day != null ){ text += ` ${target_day}日`; }
		if( over_time_data != null ){ text += ` ${over_time_data}`; }

		let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send(text);
		let user_msg = await interaction.channel.messages.fetch(msg_sub.id);
		user_msg.author.id = interaction.user.id;

		let end_flag = await damagecmd.Main_Damage(interaction, 0, 1, 'kill', target_boss_no, attack_turn, over_time_data, other_name, target_day);
		await user_msg.delete()
			.then(user_msg => console.log(`Deleted message from ${user_msg}`))
			.catch(console.error);
		return end_flag;
	}
	// ダメージ削除
	else if (interaction.commandName === 'del') {
		let other_name = interaction.options.getString('名前');

		let text = `<@${interaction.user.id}>, ダメージ削除コマンドを受け取ったよ`;
		if( other_name != null ){ text += ` ${other_name}`; }

		let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send(text);
		let user_msg = await interaction.channel.messages.fetch(msg_sub.id);
		user_msg.author.id = interaction.user.id;

		let boss_no;
		if( other_name != null ){	// 誰かのデータを削除する時
			damagecmd.Damage_Revise(interaction, other_name, -1);
		}
		else{	// 最新ダメージdelのみ
			damagecmd.Damage_Del( interaction, 0, boss_no );
		}
		await user_msg.delete()
			.then(user_msg => console.log(`Deleted message from ${user_msg}`))
			.catch(console.error);
		return;
	}
	// 残り時間の設定
	else if (interaction.commandName === 'time') {
		let remaining_time = interaction.options.getString('残り時間');
		let attack_turn = interaction.options.getString('凸番号');

		let text = `<@${interaction.user.id}>, 残り時間コマンドを受け取ったよ`;
		if( remaining_time != null ){ text += ` ${remaining_time}`; }
		if( attack_turn != null ){ text += ` ${attack_turn}凸`; }else{ attack_turn = ''; }

		let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send(text);
		let user_msg = await interaction.channel.messages.fetch(msg_sub.id);
		user_msg.author.id = interaction.user.id;

		damagecmd.Surplus_Time( interaction, remaining_time, attack_turn);

		await user_msg.delete()
			.then(user_msg => console.log(`Deleted message from ${user_msg}`))
			.catch(console.error);
		return;
	}
	// ダメージ修正
	else if (interaction.commandName === 're') {
		let damage = interaction.options.getInteger('ダメージ');
		let target_boss_no = interaction.options.getString('ボス');
		let attack_turn = interaction.options.getString('凸番号');
		let other_name = interaction.options.getString('代理');

		let text = `<@${interaction.user.id}>, ダメージ修正コマンドを受け取ったよ`;
		if( damage != null ){ text += ` ${damage}`; }
		if( target_boss_no != null ){ text += ` ${target_boss_no}`; }
		if( attack_turn != null ){ text += ` ${attack_turn}`; }
		if( other_name != null ){ text += ` ${other_name}`; }

		let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send(text);
		let user_msg = await interaction.channel.messages.fetch(msg_sub.id);
		user_msg.author.id = interaction.user.id;

		await interaction.deferReply();
		if( damage > 0 ){	// 未記入（入れ替え）
			await damagecmd.Damage_Revise(user_msg, other_name);
		}
		else{	// 未記入（代入）
			await damagecmd.Damage_Revise(user_msg, other_name, damage, target_boss_no, attack_turn);
		}
		await interaction.deleteReply();
		return;
	}
	// 名前
	else if (interaction.commandName === 'name') {
		let type = interaction.options.getString('type');
		let name = interaction.options.getString('target');
		let nickname = interaction.options.getString('nickname');
		if( name == null ){ name = undefined; }
		if( nickname == null ){ nickname = undefined; }
		let text = `${type} ${name} ${nickname}`;
		membercmd.Main_Name( interaction, text );
		return;
	}
	// ボスの名前
	else if (interaction.commandName === 'boss') {
		let type = interaction.options.getString('type');
		let name = interaction.options.getString('target');
		let nickname = interaction.options.getString('nickname');
		if( nickname == null ){ nickname = undefined; }
		let text = `${type} ${name} ${nickname}`;
		bosscmd.Main_Boss( interaction, text );
		return;
	}
	// 討伐したボス
	else if (interaction.commandName === 'boss_kill') {
		let nickname = interaction.options.getString('対象名');
		let set_day = interaction.options.getString('日付');
		if( nickname == null ){ nickname = undefined; }
		if( set_day == null ){ set_day = undefined; }
		let text = `${nickname} ${set_day}`;
		bosscmd.Boss_Kill(interaction, nickname, set_day);
		return;
	}
	// 予約簡易入力ページを構成する
	else if (interaction.commandName === 'mark') {
		let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send("予約簡易入力を構成するよ");
		let user_msg = await interaction.channel.messages.fetch(msg_sub.id);
		user_msg.author.id = interaction.user.id;
		await interaction.deferReply();
		reacmd.Reaction_Output(user_msg);
		await interaction.deleteReply();
		return;
	}
	// 予約
	else if (interaction.commandName === 'reserve') {
		let boss = interaction.options.getString('ボス');
		let type = interaction.options.getString('タイプ');
		let timing = interaction.options.getString('凸タイミング');
		let damage = interaction.options.getInteger('予定ダメージ');

		let text = `<@${interaction.user.id}>, 予約コマンドを受け取ったよ`;
		if( boss != null ){ text += ` ${boss}`; }
		if( type != null ){ text += ` ${type}`; }else{ type = ''; }
		if( timing != null ){ text += ` ${timing}`; }else{ timing = ''; }
		if( damage != null ){ text += ` ${damage}`; }else{ damage = ''; }

		let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send(text);
		let user_msg = await interaction.channel.messages.fetch(msg_sub.id);
		user_msg.author.id = interaction.user.id;

		// msg、押した人のID、ダメージ、ボスの名前、物理魔法、いつ（次、希望など）
		reservecmd.Main_Reserve(interaction, user_msg.author.id, damage, cmd.Boss_Name[boss - 1], type, timing);

		await interaction.deferReply();
		await user_msg.delete()
			.then(user_msg => console.log(`Deleted message from ${user_msg}`))
			.catch(console.error);
		await interaction.deleteReply();

		return;
	}
	// 凸宣言
	else if (interaction.commandName === 'battle') {
		let boss = interaction.options.getString('ボス');
		let turn = interaction.options.getString('凸番号');

		let text = `<@${interaction.user.id}>, 凸宣言コマンドを受け取ったよ`;
		if( boss != null ){ text += ` ${boss}`; }
		if( turn != null ){ text += ` ${turn}`; }else{ type = ''; }

		let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send(text);
		let user_msg = await interaction.channel.messages.fetch(msg_sub.id);
		user_msg.author.id = interaction.user.id;

		let boss_no = boss - 1;
		reservecmd.Main_Battle(interaction, user_msg.author.id, boss_no, turn)

		await interaction.deferReply();
		await user_msg.delete()
			.then(user_msg => console.log(`Deleted message from ${user_msg}`))
			.catch(console.error);
		await interaction.deleteReply();

		return;
	}
	// 先月分のメンバーデータをコピー
	else if (interaction.commandName === 'copy') {
		await cmd.Copy_Data( interaction );
		return;
	}
	// 計算
	else if (interaction.commandName === 'calc1' || interaction.commandName === 'calc2' || interaction.commandName === 'calc3' || interaction.commandName === 'calc1_sub') {
		let type = '';
		if( interaction.commandName === 'calc1' ){	type = '*';		}
		else if( interaction.commandName === 'calc2' ){	type = '**';	}
		else if( interaction.commandName === 'calc3' ){	type = '***';	}
		else if( interaction.commandName === 'calc1_sub' ){	type = '*';		}

		let boss = interaction.options.getString('ボス');
		let reduce = interaction.options.getString('削りダメージ');
		let finish = interaction.options.getString('トドメダメージ');

		let text = `${type}`;
		if( boss != null ){ text += ` ${boss}`; }
		if( reduce != null ){ text += ` ${reduce}`; }else{ reduce = ''; }
		if( finish != null ){ text += ` ${finish}`; }else{ finish = ''; }

		//let boss_no = boss - 1;
		let boss_no = boss;
		await calccmd.Main_Calc( interaction, text, boss_no );
		return;
	}
	// 残凸更新
	else if (interaction.commandName === 'now') {
		let target_day = interaction.options.getInteger('日付');
		let Update = [1,1,1,1,1];
		await interaction.reply({ content: '残凸状況を更新したよ', ephemeral: true });
		if( target_day == null ){ target_day = undefined; }
		nowcmd.Now_Main( interaction, target_day, Update);
		return;
	}
	// 開始日設定
	else if (interaction.commandName === 'start') {
		let start_day = interaction.options.getInteger('開始日');
		let period = interaction.options.getInteger('期間');
		let text = `start ${start_day} ${period}`;
		cmd.start_day = await cmd.Start_Func( interaction, text );
		return;
	}
	// 段階設定
	else if (interaction.commandName === 'level') {
		let level2 = interaction.options.getInteger('level2');
		let level3 = interaction.options.getInteger('level3');
		let level4 = interaction.options.getInteger('level4');
		let level5 = interaction.options.getInteger('level5');
		let text = `level ${level2} ${level3} ${level4} ${level5}`;
		cmd.start_day = await cmd.Level_Func( interaction, text );
		return;
	}
	// インフォ
	else if (interaction.commandName === 'info') {
		let type = interaction.options.getString('type');
		let contents = interaction.options.getString('contents');
		let start = interaction.options.getString('start');
		let end = interaction.options.getString('end');
		if( end == null ){ end = ''; }
		let text = `${type} ${contents} ${start} ${end}`;
		if( type == 'info' ){
			infocmd.Info_Text(interaction, "all");
		}
		else if( type == 'info_updata' ){
			await interaction.reply({ content: '情報を更新したよ', ephemeral: true });
			infocmd.Info_Update();
		}
		else{
			infocmd.Info_Write(interaction, text);
		}
		return;
	}
	// 当日インフォ
	else if (interaction.commandName === 'main_info') {
		await infocmd.Info_Text(interaction);
		await interaction.reply({ content: '当日の情報を表示するよ', ephemeral: true });
		return;
	}
	// 現時刻通知
	else if (interaction.commandName === 'notice') {
		let [notice_text, greeting_flag] = await infocmd.Notice_Text();
		console.log(notice_text, greeting_flag);
		if( notice_text ){
			let channel_id = await checkcmd.Channel_Search(interaction.guild.id, "info");
			if( channel_id == false ){	console.log("チャンネル非存在");	return;	}
			if( greeting_flag == 100 ){	// クランバトルの結果や最後の日の凸情報
				let embed_text = await infocmd.Charge_Research(interaction.guild.id);
				await client.channels.cache.get(channel_id).send({ content : notice_text,  embeds: [embed_text] });
			}
			else{
				await client.channels.cache.get(channel_id).send(notice_text);
			}
			await interaction.reply({ content: '今通知できる情報はこのくらいだよ', ephemeral: true });
		}
		else{
			await interaction.reply({ content: '今通知できる情報はないよ', ephemeral: true });
		}

		return;
	}
	// 今月の結果
	else if (interaction.commandName === 'result') {
		await nowcmd.Result( interaction );
		await interaction.reply({ content: '今月のクランバトルの結果を表示するよ', ephemeral: true });
		return;
	}
	// 初期化
	else if (interaction.commandName === 'init') {
		if( cmd.master[interaction.user.id] == 1 ){		// botのマスターのみ使用可能？
			cmd.Init_Data(interaction);
			await interaction.reply({ content: '今月のデータを初期化したよ', ephemeral: true });

			/*let BUTTON_DATA = [];
			for( let i = 1; i <= 2; i++ ){
				let key1 = `b${i}_id`;
				let key2 = `b${i}_label`;
				let key3 = `b${i}_style`;
				// カスタムIDの設定（※ボスNoはラスト）
				BUTTON_DATA[key1] = `init+${i}`;
				if( i == 1 ){
					BUTTON_DATA[key2] = `はい`;	// ラベル
				}
				else if( i == 2 ){
					BUTTON_DATA[key2] = `いいえ`;	// ラベル
					BUTTON_DATA[key3] = `DANGER`;	// スタイル
				}
			}
			BUTTON_DATA['etc'] = 1;
			let button_text = '弟くん、今月のクランバトルのデータを初期化するよ？　本当にいいの？　10秒以内に決めてね！';
			await buttoncmd.Interaction_Button( interaction, button_text, 2, 0, BUTTON_DATA);
			return;*/

			/*let msg_sub = await interaction.guild.channels.cache.get(interaction.channelId).send("予約簡易入力を構成するよ");
			let user_msg = await interaction.channel.messages.fetch(msg_sub.id);
			console.log(msg);
				.then(async function (msg) {
					console.log("AAAA");
					console.log(msg);
					await msg.react('🆗');
					await msg.react('🆖');
					setTimeout( async function(){
						msg.delete()
							.then(msg => console.log(`Deleted message from ${msg}`))
							.catch(console.error);
					}, 10000);
			}).catch(function() {
					//Something
			});*/
		}
		else{
			await interaction.reply({ content: '危ないから決められた人以外、使えないよ', ephemeral: true });
		}
		return;
	}
	// ヘルプ
	else if (interaction.commandName === 'help') {
		await interaction.reply("ヘルプを表示するよ");
		await infocmd.Help_Text(interaction);
		return;
	}
	// データベース更新
	else if (interaction.commandName === 'db') {
		let key = interaction.options.getString('database_key');
		let text = `db ${key}`;
		await cmd.Copy_Database( interaction, text );
		return;
	}
	// データベース表示
	else if (interaction.commandName === 'sign') {
		let key = interaction.options.getString('database_key');
		let text = `sign ${key}`;
		await cmd.Sign_Database( interaction, text );
		return;
	}
	else{
		interaction.reply("そのコマンドはまだ実装されてないよ");
		return;
	}
}


module.exports = {
	Interaction_Main,
	Interaction_Command
}
