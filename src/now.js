'use strict';

const { MessageEmbed } = require('discord.js');
const progresscmd = require('./progress');
const checkcmd = require('./check');
const cmd = require('./set');

const icon_url_main = 'http://yellow.ribbon.to/~gabapuri/image/';

// 疑似wait
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function Now_Main(msg, target_day, Boss_Update){

	// 残凸用のチャンネルを探す
	let channel_id = await checkcmd.Channel_Search(msg.guildId, "status");
	if( channel_id == false ){	console.log("チャンネル非存在");	return;	}

	// 進行から内容を作成
	let [now_text, Boss_New_Damage_Text, Boss_Lap, Boss_Rest_Hp, level_num, RESERVE_NOW, BATTLE_NOW] = await Now_Set(msg.guildId, target_day);

	let member_now_text = now_text.slice( 0, now_text.indexOf('```diff') );	// now_text 前を取得
	let member_damage_text = now_text.slice( now_text.indexOf('```diff') );	// now_text 後ろを取得
	//console.log(member_damage_text.length);

	// embedを作成
    const exampleEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('ダメージ履歴')
      .setDescription(member_damage_text)
      .addFields(
        { name: ":one:" + cmd.Boss_Name[0], value: Boss_New_Damage_Text[0], inline: true },
        { name: ":two:" + cmd.Boss_Name[1], value: Boss_New_Damage_Text[1], inline: true },
        { name: ":three:" + cmd.Boss_Name[2], value: Boss_New_Damage_Text[2], inline: true },
        { name: ":four:" + cmd.Boss_Name[3], value: Boss_New_Damage_Text[3], inline: true },
        { name: ":five:" + cmd.Boss_Name[4], value: Boss_New_Damage_Text[4], inline: true },
      )
      .setTimestamp()

	try{
		// 新規か更新か　今日、メッセージIDがあるかどうかを探す
		let msg_id = await Now_Search(msg.guildId, target_day);
		// 新規
		if( msg_id == false ){
			console.log("残凸状況新規");
			let botmsg = await msg.guild.channels.cache.get(channel_id).send( { content : member_now_text,  embeds: [exampleEmbed] } );
			// botのメッセージを取得してIDを記憶
			Now_Id(botmsg);	
		}
		// 更新
		else if( msg_id.match(/\d{18}/) ){
			console.log("残凸状況更新");
			const m = await msg.guild.channels.cache.get(channel_id).messages.fetch(msg_id);
			m.edit( { content : member_now_text,  embeds: [exampleEmbed] } );
		}
		// 取得ミス
		else{
			console.log("メッセージID取得ミス")
		}
	}
	catch{
		console.log("残凸更新エラー")
	}

// 手間過ぎる！　面白いんだけど予約が殺到したときの負荷が怖い
// 戦闘中データは個別でいい
// 予約データも個別でいい
// ダメージ入力時は通常時個別
// 周回進行時はリミットになっていたボスのみ必要
// 段階行時は全部復活のための必要
// delの時はクソ面倒だから全部やることになるか…

	// ボス情報まとめ用チャンネルを探す
	channel_id = await checkcmd.Channel_Search(msg.guildId, "info");
	if( channel_id == false ){	console.log("チャンネル非存在");	return;	}

	// ボスの名前の長さ調整
	let boss_name_length = 0;
	let Boss_Name_Om = JSON.parse(JSON.stringify(cmd.Boss_Name));
	for( let i = 0; i < Boss_Name_Om.length; i++ ){
		if( boss_name_length < Boss_Name_Om[i].length ){
			boss_name_length = Boss_Name_Om[i].length;
		}
	}
	for( let i = 0; i < Boss_Name_Om.length; i++ ){
		if( boss_name_length > Boss_Name_Om[i].length ){
			for( let j = Boss_Name_Om[i].length; j < boss_name_length; j++ ){
				Boss_Name_Om[i] += "　";
			}
		}
	}

	// 最も周回数の少ないボスをチェック
	let min_counter = 9999;
	for( let i= 0; i < Boss_Lap.length - 1; i++ ){
		if( min_counter > Boss_Lap[i] ){
			min_counter = Boss_Lap[i];
		}
	}
	let limit_counter = min_counter + 2;	// 次の限界値を規定
	if( cmd.Level_List[level_num - 1] < limit_counter ){	// 超えていたら
		limit_counter = cmd.Level_List[level_num - 1];
	}

	let Reserve_List = ['0','1','255'];
	// 新規か更新か　今日、メッセージIDがあるかどうかを探す
	let Boss_MsgId = [];
	Boss_MsgId = await NowBoss_Search(msg.guildId, target_day);
	let Boss_MsgId_New = [];
	for( let i = 0; i < cmd.Boss_Name.length; i++ ){

		// 更新フラグが立っていないなら次へ
		if( Boss_Update[i] != 1 && Boss_MsgId.length != undefined ){ continue; }

		let text = '';
		let BOSS_FIELD = [];

		let Log = Boss_New_Damage_Text[i].split('\n');
		Log = Log.filter(Boolean);	// 空白削除
		text = '';
		for( let j = 0; j < Log.length; j++ ){
			let LogData = Log[j].split(' ');
			if(LogData[0] == Boss_Lap[i] ){
				text += `${LogData[1]}\n`;
			}
		}
		if( text != '' ){
			BOSS_FIELD.push({ name: "⚔ダメージ", value: text, inline: true })
		}

		if( BATTLE_NOW[cmd.Boss_Name[i]] != undefined ){
			Log = BATTLE_NOW[cmd.Boss_Name[i]].split('\n');
			Log = Log.filter(Boolean);	// 空白削除
			text = '';
			for( let j = 0; j < Log.length; j++ ){
				let LogData = Log[j].split('\t');
				text += `${LogData[0]}[${LogData[1]}]\n`;
			}
			if( text != '' ){
				BOSS_FIELD.push({ name: "🆚戦闘中", value: text, inline: true })
			}
		}

		text = '';
		for( let k = 0; k < Reserve_List.length; k++ ){
			let key_sub = cmd.Boss_Name[i] + "_" + Reserve_List[k];
			//console.log("A:"+ Reserve_List[k] + ":" + RESERVE_NOW[key_sub]);
			//console.log(RESERVE_NOW[key_sub], key_sub)
			if( RESERVE_NOW[key_sub] != '' && RESERVE_NOW[key_sub] != undefined ){
				let type = '';
				if( k == 0 ){ type = '［今］'; }
				else if( k == 1 ){ type = '［次］'; }
				else if( k == 2 ){ type = '［希望］'; }
				text += `${type}`;
				Log = RESERVE_NOW[key_sub].split('\n');
				Log = Log.filter(Boolean);	// 空白削除
				for( let j = 0; j < Log.length; j++ ){
					let LogData = Log[j].split('\t');
					text += `${LogData[0]}[${LogData[1]}] `;
				}
				text += `\n`;
			}
		}
		if( text != '' ){
			BOSS_FIELD.push({ name: "🈯予約", value: text, inline: true })
		}


		// 残りHP周り
		let rest_hp = 0;
		let round_text = ``
		let icon_url = ``;
		if( limit_counter > Boss_Lap[i] ){
			rest_hp = Boss_Rest_Hp[i];
			let limit_counter_sub = limit_counter - 1;
			round_text = `${Boss_Lap[i]}周目/${limit_counter_sub}`;
			icon_url = icon_url_main + cmd.Boss_Icon[i];
		}
		else{
			rest_hp = 0;
			round_text = `CLEAR!`;
			icon_url = icon_url_main + 'treasure_box.png';
		}

		let hash_key = `boss${i}_${level_num}`;	// BOSS_HP用


		let basis_num = 30;
		let hp_fraction = rest_hp / cmd.BOSS_HP[hash_key];
		let hp_count = (basis_num * hp_fraction) - 1;
		let bar_text = '';
		for( let k = 0; k < basis_num; k++ ){
			if( k > hp_count ){	bar_text += ' ';	}
			else{ bar_text += '■'; }
		}
		let give_damage = parseInt((cmd.BOSS_HP[hash_key] - rest_hp) / 10000);
		let hpbar_text = '```md\n' + `HP[${bar_text}](${give_damage}万)` + '```';

		let Color = ['#76bf63','#5eaae4','#ff67ac','#fe4641','#c167d9',]

		// embedを作成
		const exampleEmbed = new MessageEmbed()
			.setColor(Color[i])
			.setTitle(`[${round_text}]${Boss_Name_Om[i]}　[${Number(rest_hp).toLocaleString()}/${Number(cmd.BOSS_HP[hash_key]).toLocaleString()}]`)
			.setDescription(hpbar_text)
			.addFields(BOSS_FIELD)
			.setThumbnail(icon_url)
			.setTimestamp()

		// 新規　IDが存在しない
		if( Boss_MsgId.length == undefined ){
			//console.log("ボスまとめ新規");
			let botmsg = await msg.guild.channels.cache.get(channel_id).send( { content : " ",  embeds: [exampleEmbed] } );
			// botのメッセージを取得してIDを記憶
			Boss_MsgId_New.push(botmsg.id);
			await _sleep(1000);
		}
		// 更新
		else if( Boss_MsgId[i].match(/\d{18}/) ){
			//console.log("ボスまとめ更新");
			const m = await msg.guild.channels.cache.get(channel_id).messages.fetch(Boss_MsgId[i]);
			m.edit( { content : " ",  embeds: [exampleEmbed] } );
			await _sleep(1000);
		}
		// 取得ミス
		else{
			console.log("メッセージID取得ミス")
		}
	}
	// 新規でIDを記録
	if( Boss_MsgId_New.length > 0 ){
		await NowBoss_Id(msg, Boss_MsgId_New);
	}

}

async function Now_Set(guild_id, target_day){

	let battle_schedule = await cmd.Folder(guild_id);

	let data = '';
	let datafile = '';

	// ファイルを読み込む
	data = '';
	datafile = battle_schedule + "\/" + 'member.txt';
	data = await cmd.Read_File(datafile);
	let Member = data.split('\n');
	Member = Member.filter(Boolean);	// 空白削除

	// ファイルを読み込む
	datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	// 現時点までの進行状況からボスの討伐数とボスの残りHPを確認
	let VALUE;
	if( target_day != undefined ){
		VALUE = { "type" : "day", "target_day" : target_day };
	}
	let [Boss_Lap, Boss_Rest_Hp, level_num, round_counter] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List, VALUE);

	// 予約データの取得
	let RESERVE_NOW = await Now_Reserve(guild_id);
	//console.log(RESERVE_NOW);

	// 戦闘中データの取得
	let BATTLE_NOW = await Now_Battle(guild_id);
	//console.log(BATTLE_NOW);

	// タスキルデータの取得
	let TASKKILL_NOW = await Now_Taskkill(guild_id, target_day);
	//console.log(TASKKILL_NOW);

	// 優先データの取得
	let PRIORITY_NOW = await Now_Priority(guild_id, target_day);
	//console.log(PRIORITY_NOW);



	// 現在周回数と最大周回数
	let limit_counter = 9999;
	for( let i = 0; i < Boss_Lap.length; i++ ){
		if( limit_counter > Boss_Lap[i] ){
			limit_counter = Boss_Lap[i];
		}
	}
	round_counter = limit_counter;	// 現在周回数
	limit_counter += 2;	// 最大数
	// 段階によるストッパー
	if( cmd.Level_List[level_num - 1] - 1 < limit_counter ){
		limit_counter = cmd.Level_List[level_num - 1];
	}

	// ボスの名前の長さ調整
	let boss_name_length = 0;
	let Boss_Name_Om = JSON.parse(JSON.stringify(cmd.Boss_Name));
	for( let i = 0; i < Boss_Name_Om.length; i++ ){
		if( boss_name_length < Boss_Name_Om[i].length ){
			boss_name_length = Boss_Name_Om[i].length;
		}
	}
	for( let i = 0; i < Boss_Name_Om.length; i++ ){
		if( boss_name_length > Boss_Name_Om[i].length ){
			for( let j = Boss_Name_Om[i].length; j < boss_name_length; j++ ){
				Boss_Name_Om[i] += "　";
			}
		}
	}

	// 各メンバーの進捗データ
	if( target_day != undefined ){
		VALUE = { "type" : "member_challenge", "target_day" : target_day };
	}
	else{
		VALUE = { "type" : "member_challenge" };
	}
	let [MEMBER_CHALLENGE, MEMBER_DAMAGE, MEMBER_DAMAGE_KILL, MEMBER_BOSS_KILL, BOSS_ALL_DAMAGE, BOSS_ALL_CHALLENGE, MEMBER_ALL_DAMAGE, MEMBER_ALL_CHALLENGE, MEMBER_MAX_DAMAGE] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List, VALUE);
	let MEMBER_CHALLENGE2 = new Array;


	// ここから残凸状況テキスト

	let now_text = '';

	// 日時情報、本来の日付と時間取得
	let [year, month, day, hours, minutes, second] = await cmd.Time_Get(true);

	let start_day = cmd.start_day * 1;
	let period_day = cmd.period * 1;
	let set_day = day - start_day + 1;

	if( target_day != undefined ){	// 日付指定 過ぎてから使うこと
		day = target_day * 1 + 1;		// day 26 なら 27日になる
		set_day = day - start_day;	// day 26 1日目になる
		hours = '04';		minutes = '59';
	}
	else{
		if( hours >= 0 && hours < 5 ){	set_day--;	}	// 0時～5時はまだ今日
	}
	hours = ( '00' + hours ).slice( -2 );
	minutes = ( '00' + minutes ).slice( -2 );

	now_text += `${set_day}日目 ${month}月${day}日 ${hours}時${minutes}分の状況だよ`;
	now_text += "\n";

	// 周回情報
	now_text += "```md\n";
	now_text += `第${level_num}段階 ${round_counter}周目`;
	if( level_num < cmd.Level_List.length ){
		let number = cmd.Level_List[level_num - 1] - 1;
		now_text += `/${number}`;
	}
	now_text += ``;
	now_text += "\n";

	// 予測周回データ
	let guess_text = await Progress_Prediction(guild_id, data, cmd.BOSS_HP, cmd.Level_List);
	if( guess_text ){
		now_text += `周回開始時間目安 ${guess_text}`;
		now_text += "\n";
	}

	// ボスの残りHPと周回数データ ---------------------------
	let reserve_flag = 0;
	let limit_counter_sub = limit_counter - 1;
	for( let i = 0; i < Boss_Lap.length; i++ ){
		let hash_key = "boss" + i + "_" + level_num;
		let i2 = i + 1;
		now_text += "#" + i2 + "." + Boss_Name_Om[i] + " ";
		if( limit_counter > Boss_Lap[i] ){
			//now_text += "[" + Number(Boss_Rest_Hp[i]).toLocaleString() + "/" + Number(cmd.BOSS_HP[hash_key]).toLocaleString() + "]";
			now_text += "[" + Boss_Rest_Hp[i] + "/" + cmd.BOSS_HP[hash_key] + "]";
			now_text += "[" + Boss_Lap[i] + "/" + limit_counter_sub + "]";
		}
		else{
			//now_text += "[" + 0 + "/" + Number(cmd.BOSS_HP[hash_key]).toLocaleString() + "]";
			now_text += "[" + 0 + "/" + cmd.BOSS_HP[hash_key] + "]";
			now_text += " CLEAR!";
		}
		now_text += "\n";

		// 戦闘中表示
		let battle_text = '';
		if( BATTLE_NOW[cmd.Boss_Name[i]] ){
			now_text += "【🆚戦闘中】";
			let ValueAry = BATTLE_NOW[cmd.Boss_Name[i]].split('\n');
			for( let j = 0; j < ValueAry.length - 1; j++ ){
				let BattleAry = ValueAry[j].split('\t');
				let sos_text = '';
				if( BattleAry[2] ){ sos_text = '🚑' }
				let taskkill_text = '';
				if( TASKKILL_NOW[BattleAry[0]] ){ taskkill_text = '✝' }
				let priority_text = '';
				if( PRIORITY_NOW[BattleAry[0]] ){ priority_text = '⌚' }
				now_text += taskkill_text + priority_text + sos_text + BattleAry[0];	// 名前
				let member_key2 = BattleAry[0] + "_" + BattleAry[1] + "_0";
				battle_text = '';
				if( MEMBER_DAMAGE_KILL[member_key2] ){
					battle_text = `.${MEMBER_DAMAGE_KILL[member_key2]}`
				}
				now_text += `[${BattleAry[1]}${battle_text}]`;	// 凸番号
				now_text += " ";
			}
			// ラストが の時削る
			if( now_text.slice(-1) == ' ' ){ now_text = now_text.slice( 0, -1); }
			now_text += "\n";
		}

		// 予約表示
		reserve_flag = 0;
		let Next = [0, 1, 255];	// 次周・次次周
		for( let k = 0; k < Next.length; k++ ){
			let key = cmd.Boss_Name[i] + "_" + Next[k];
			if( Next[k] == 0 ){
				if( limit_counter > Boss_Lap[i] ){
					now_text += '［今］';
				}else{ now_text += '［次］'; }
				let key_sub1 = cmd.Boss_Name[i] + "_1";
				let key_sub2 = cmd.Boss_Name[i] + "_255";
				if( !RESERVE_NOW[key] ){
					if( RESERVE_NOW[key_sub1] || RESERVE_NOW[key_sub2] ){
						now_text += '不在 ';
					}
				}
			}
			if( RESERVE_NOW[key] ){
				reserve_flag = 1;
				if( Next[k] == 1 ){
					if( limit_counter > Boss_Lap[i] ){
						now_text += '［次］';
					}else{ now_text += '［次々］'; }
				}
				if( Next[k] == 255 ){
					now_text += '［希望］';
				}
				
				let ValueAry = RESERVE_NOW[key].split('\n');
				for( let j = 0; j < ValueAry.length - 1; j++ ){
					let ReserveAry = ValueAry[j].split('\t');
					let taskkill_text = '';
					if( TASKKILL_NOW[ReserveAry[0]] ){ taskkill_text = '✝' }
					let priority_text = '';
					if( PRIORITY_NOW[ReserveAry[0]] ){ priority_text = '⌚' }
					now_text += taskkill_text + priority_text + ReserveAry[0];	// 名前
					if( ReserveAry[1] ){
						now_text += `[${ReserveAry[1]}]`;	// 物理・魔法
					}
					if( ReserveAry[2] ){
						now_text += `(${ReserveAry[2]})`;	// ダメージ
					}else{ now_text += `(-)`; }
					now_text += " ";
				}
				// ラストが の時削る
				if( now_text.slice(-1) == ' ' ){ now_text = now_text.slice( 0, -1); }
			}
		}
		if( reserve_flag == 0 ){
			now_text += "【🏳️‍️予約者不在】";
		}
		now_text += "\n";
	}
	now_text += "\n";


	// 凸数の整理 -------------------------------------------
	let main_count = 0;			// 本凸
	let deferment_count = 0;	// 持ち越し凸
	for( let i = 0; i < Member.length; i++ ){
		let ValueAry = Member[i].split('\t');
		let name = ValueAry[0];			// メンバーの名前
		MEMBER_CHALLENGE[name] = 0;
	    MEMBER_CHALLENGE2[name] = 0;
		for( let j = 1; j <= 3; j++ ){	// 凸番号
			let member_key = name + "_" + j;	// CHALLENGE
		    // ひとまず終わっている
			if( MEMBER_CHALLENGE[member_key] ){
				MEMBER_CHALLENGE[name]++;
				main_count++;
			}
			// 持ち越しがある
			if( MEMBER_CHALLENGE[member_key] == 1 ){
				deferment_count++;
			}
			// 完全に終わっている
			else if( MEMBER_CHALLENGE[member_key] == 2 ){
				MEMBER_CHALLENGE2[name]++;
			}
		}
	}

	// 凸数のリストテキスト -------------------------------------------
	let limit_count = (Member.length) * 3;
	let count = 0;
	let now_text_tmp = '';
	let now_text_tmp2 = '';
	let Deferment_Count = [0,0,0,0];
	let deferment_count_text = '';
	for( let i = 3; i >= 0; i-- ){
		count = 0;
		now_text_tmp = '';
		for( let j = 0; j < Member.length; j++ ){
			let ValueAry = Member[j].split('\t');
			let name = ValueAry[0];			// メンバーの名前
			if( MEMBER_CHALLENGE[name] == i ){
				let taskkill_text = '';
				if( TASKKILL_NOW[name] ){ taskkill_text = '✝' }
				let priority_text = '';
				if( PRIORITY_NOW[name] ){ priority_text = '⌚' }
				now_text_tmp += `${taskkill_text}${priority_text}${name}`;
				count++;
				for( let k = 1; k <= 3; k++ ){
					let member_key = name + "_" + k;
					let member_key2 = name + "_" + k + "_0";	// ラストの0はoverの数字
					//[MEMBER_CHALLENGE, MEMBER_DAMAGE, MEMBER_DAMAGE_KILL, MEMBER_BOSS_KILL]
					//console.log(MEMBER_DAMAGE_KILL[member_key2])
					//console.log(MEMBER_CHALLENGE[member_key])
					if( MEMBER_DAMAGE_KILL[member_key2] && MEMBER_CHALLENGE[member_key] != 2 ){
						now_text_tmp += `[${k}.${MEMBER_DAMAGE_KILL[member_key2]}]`;
						let boss_hankaku = await zenkana2Hankana(cmd.Boss_Name[MEMBER_BOSS_KILL[member_key2]]);
						now_text_tmp += `(${boss_hankaku})+`;
						Deferment_Count[i]++;
					}
				}
				// ラストが+の時削る
				if( now_text_tmp.slice(-1) == '+' ){ now_text_tmp = now_text_tmp.slice( 0, -1); }
				now_text_tmp += `/`;
			}
		}
		deferment_count_text = '';
		if( Deferment_Count[i] ){ deferment_count_text = `(${Deferment_Count[i]})` }
		now_text_tmp2 += `# ${i}凸 ${count}名${deferment_count_text}\n`;
		if( now_text_tmp ){
			now_text_tmp = now_text_tmp.slice( 0, -1);	// 最後の1文字を削る
			now_text_tmp2 += `${now_text_tmp}`;
			now_text_tmp2 += `\n`;
		}
	}
	deferment_count_text = '';;
	if( deferment_count ){ deferment_count_text = `(${deferment_count})` }
	now_text += `[${main_count}${deferment_count_text}/${limit_count}]\n`;
	now_text += `${now_text_tmp2}\n`;
	now_text += "```";



	// メンバーダメージ -------------------------------------------
	// 平均算出 -------------------------------------------
	let Boss_Average = new Array;
	let Member_Average = new Array;
	for( let i = 0; i < Boss_Name_Om.length; i++ ){
	// BOSS_ALL_DAMAGE, BOSS_ALL_CHALLENGE, MEMBER_ALL_DAMAGE, MEMBER_ALL_CHALLENGE
		let boss_key = i + "_" + level_num;
		let Boss_All_Damage = new Array;
		if( BOSS_ALL_DAMAGE[boss_key] != undefined ){
			Boss_All_Damage = BOSS_ALL_DAMAGE[boss_key].split("\t");
			Boss_All_Damage = Boss_All_Damage.filter(Boolean);	// 空白削除
		}
		//console.log(Boss_All_Damage);
		let boss_all_damage = 0;
		let boss_all_challenge = 0;
		//console.log(Boss_All_Damage);
		for( let j = 0; j < Boss_All_Damage.length; j++ ){
			boss_all_damage += Boss_All_Damage[j] * 1;
			boss_all_challenge++;
		}
		Boss_Average[boss_key] = boss_all_damage / boss_all_challenge;
		//ave = parseInt(ave / 1000000);
		//now_text += `${Boss_Name_Om[i]} 平均ダメージ${ave}\n`;
		//console.log(`${Boss_Name_Om[i]}\t平均ダメ\t${Boss_Average[boss_key]}`)
	}
	for( let i = 0; i < Member.length; i++ ){
		let ValueAry = Member[i].split('\t');
		let name = ValueAry[0];			// メンバーの名前
		let member_key = name + "_" + level_num;
		Member_Average[member_key] = MEMBER_ALL_DAMAGE[member_key] / MEMBER_ALL_CHALLENGE[member_key];
		//ave = parseInt(ave / 1000000);
		//now_text += `${name} 平均ダメージ${ave}\n`;
		//console.log(`${name}\t平均ダメ\t${MEMBER_ALL_DAMAGE[member_key]}\t最大ダメ\t${MEMBER_ALL_CHALLENGE[member_key]}`)
	}

	// メンバーダメージ表記 -------------------------------------------
	now_text += "```diff\n";
	// [MEMBER_CHALLENGE, MEMBER_DAMAGE, MEMBER_DAMAGE_KILL, MEMBER_BOSS_KILL]
	// BOSS_ALL_DAMAGE, BOSS_ALL_CHALLENGE, MEMBER_ALL_DAMAGE, MEMBER_ALL_CHALLENGE
	//let member_key2 = name + "_" + attack_turn + "_" + over;
	let member_key = '';
	let damage_om = 0;
	for( let i = 0; i < Member.length; i++ ){
		let ValueAry = Member[i].split('\t');
		let name = ValueAry[0];			// メンバーの名前
		if( MEMBER_CHALLENGE2[name] >= 3 ){ // 完全に凸が終わっている
			now_text += "-";
		}else{ now_text += " "; }
		now_text += name + " ";
		for( let j = 1; j <= 3; j++ ){
			member_key = name + "_" + j + "_0";
			if( MEMBER_DAMAGE[member_key] ){
				if( MEMBER_DAMAGE[member_key] == "error" ){
					damage_om = MEMBER_DAMAGE[member_key];
				}
				else{
					damage_om = Math.floor(MEMBER_DAMAGE[member_key] / 10000);
				}
				/*if( MEMBER_BOSS_KILL[member_key] == 0 ){ now_text += "1⃣" }
				else if( MEMBER_BOSS_KILL[member_key] == 1 ){ now_text += "2⃣" }
				else if( MEMBER_BOSS_KILL[member_key] == 2 ){ now_text += "3⃣" }
				else if( MEMBER_BOSS_KILL[member_key] == 3 ){ now_text += "4⃣" }
				else if( MEMBER_BOSS_KILL[member_key] == 4 ){ now_text += "5⃣" }*/
				//now_text += damage_om + "万";		// 通常ダメージ
				//now_text += MEMBER_BOSS_KILL[member_key] + "." + damage_om + "万";		// ボスNo※-1※＆通常ダメージ
				if( MEMBER_DAMAGE[member_key] == "error" ){
					now_text += damage_om;	// 持ち越しダメージ
				}
				else{
					now_text += damage_om + "万";	// 持ち越しダメージ
				}
				if( MEMBER_DAMAGE_KILL[member_key] ){	// 討伐
					now_text += "⚔";
				}
				member_key = name + "_" + j + "_1";
				//console.log(member_key, MEMBER_DAMAGE[member_key] );
				if( MEMBER_DAMAGE[member_key] ){		// 持ち越しダメージがあれば
					if( MEMBER_DAMAGE[member_key] == "error" ){
						damage_om = MEMBER_DAMAGE[member_key];
					}
					else{
						damage_om = Math.floor(MEMBER_DAMAGE[member_key] / 10000);
					}
					/*if( MEMBER_BOSS_KILL[member_key] == 0 ){ now_text += "1⃣" }
					else if( MEMBER_BOSS_KILL[member_key] == 1 ){ now_text += "2⃣" }
					else if( MEMBER_BOSS_KILL[member_key] == 2 ){ now_text += "3⃣" }
					else if( MEMBER_BOSS_KILL[member_key] == 3 ){ now_text += "4⃣" }
					else if( MEMBER_BOSS_KILL[member_key] == 4 ){ now_text += "5⃣" }*/
					if( MEMBER_DAMAGE[member_key] == "error" ){
						now_text += "-" + damage_om;	// 持ち越しダメージ
					}
					else{
						now_text += "-" + damage_om + "万";	// 持ち越しダメージ
					}
					//now_text += "-" +  MEMBER_BOSS_KILL[member_key] + "." + damage_om + "万";	// ボスNo※-1※持ち越しダメージ
					//now_text += "(" +  damage_om + "万";	// 持ち越しダメージ
					if( MEMBER_DAMAGE_KILL[member_key] ){	// 討伐
						now_text += "⚔";
					}
					//now_text += ")";
				}
			}
			else{
				now_text += "-";
			}
			// 平均から逸脱チェック
			member_key = name + "_" + j;
			if( MEMBER_CHALLENGE[member_key] == 2 ){	// 凸終了
				let member_key = name + "_" + j + "_0";
				let boss_key1 = MEMBER_BOSS_KILL[member_key] + "_" + level_num;
				let damage = MEMBER_DAMAGE[member_key];
				member_key = name + "_" + j + "_1";
				let boss_key2 = MEMBER_BOSS_KILL[member_key] + "_" + level_num;
				if( MEMBER_DAMAGE[member_key] > 0 ){
					damage += MEMBER_DAMAGE[member_key];
				}

				member_key = name + "_" + level_num;
				//console.log(Member_Average[member_key]);
				if( Member_Average[member_key] > 0 ){
					//let total_average = Member_Average[member_key]
					let total_average = 0;
					if( Boss_Average[boss_key2] == undefined ){	// 持ち越しがない
						total_average = (Member_Average[member_key] + Boss_Average[boss_key1]) / 2;
					}else{	// 持ち越しがある
						total_average = (Member_Average[member_key] + Boss_Average[boss_key1] + Boss_Average[boss_key2]) / 2;
					}
					//console.log(member_key, total_average);
					//console.log(Member_Average[member_key] , Boss_Average[boss_key1] , Boss_Average[boss_key2]);
					//let criterion_damage = Member_Average[member_key] - Boss_Average[boss_key];
					if( damage > total_average * 1.5 ){
						now_text += `?`;
					}
					else if( damage < total_average * 0.7 ){
						now_text += `!`;
					}
				}
				
				//now_text += `${damage}`;
			}

			now_text += "/";
		}
		now_text = now_text.slice( 0, -1);	// 最後の1文字を削る
		now_text += "\n";
	}
	now_text += "```";

	let Boss_New_Damage = await New_Damage(data, cmd.BOSS_HP, cmd.Level_List, target_day)

	return [now_text, Boss_New_Damage, Boss_Lap, Boss_Rest_Hp, level_num, RESERVE_NOW, BATTLE_NOW];
}

// 今日すでに書かれているか否かをチェック
async function Now_Search(guild_id, target_day){

	// 日付と時間取得
	let [year, month, day, hours, minutes, second] = await cmd.Time_Get();
	if( target_day != undefined ){ day = target_day; }

	let battle_schedule = cmd.Folder(guild_id);

	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'now_message.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除

	// 今日の日付でメッセージIDがあるかどうかを探す
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		if( day == ValueAry[0] ){
			return ValueAry[1];
		}
	}

	// 見つからなかった。
	return false;
}

// メッセージID記録用 botメッセージ反応
async function Now_Id( msg ){

	// 日付と時間取得
	let [year, month, day, hours, minutes, second] = await cmd.Time_Get();

	let battle_schedule = await cmd.Folder(msg.guildId);
	// 追記
	let datafile = battle_schedule + "\/" + 'now_message.txt';

	let data = await cmd.Read_File(datafile);
	data += `${day}\t${msg.id}\n`;
	await cmd.Write_File(datafile, data);

	return;
}


// 今日すでに書かれているか否かをチェック
async function NowBoss_Search(guild_id, boss_no){

	// 日付と時間取得
	let [year, month, day, hours, minutes, second] = await cmd.Time_Get();
	//if( target_day != undefined ){ day = target_day; }

	let battle_schedule = await cmd.Folder(guild_id);

	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'now_boss.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除

	// 今日の日付でメッセージIDがあるかどうかを探す
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		if( day == ValueAry[0] ){
			ValueAry[0] = '';
			ValueAry = ValueAry.filter(Boolean);	// 空白削除
			return ValueAry;
		}
	}

	// 見つからなかった。
	return false;
}

// メッセージID記録用 botメッセージ反応
async function NowBoss_Id( msg, Boss_MsgId ){

	// 日付と時間取得
	let [year, month, day, hours, minutes, second] = await cmd.Time_Get();

	let battle_schedule = await cmd.Folder(msg.guildId);
	// 追記
	let datafile = battle_schedule + "\/" + 'now_boss.txt';

	let boss_msgid_list = `${day}\t`;
	Boss_MsgId.forEach(async function(item, index, array) {
		boss_msgid_list += `${item}\t`;
	});
	boss_msgid_list += `\n`;

	let data = await cmd.Read_File(datafile);
	data += `${boss_msgid_list}`;
	await cmd.Write_File(datafile, data);

	return;
}





// 各ボス最新ダメージ
function New_Damage(data, BOSS_HP, Level_List, target_day){

	let VALUE = { "type" : "new_damage" };
	let [Boss_Lap, Boss_Rest_Hp, level_num, round_counter, Boss_New_Damage] = progresscmd.Progress(data, BOSS_HP, Level_List, VALUE);

	// 日時情報、クラバトの日付と時間取得
	let [year, month, today, hours, minutes, second] = cmd.Time_Get();
	if( target_day != undefined ){ today = target_day; }

	let Boss_New_Damage_Text = ['','','','',''];
	for( let i = 0; i < Boss_New_Damage.length; i++ ){
		let DataAry = Boss_New_Damage[i].split('\n');
		DataAry = DataAry.filter(Boolean);	// 空白削除
		//console.log(DataAry.length);
		for( let j = DataAry.length - 1; j >= DataAry.length - 10; j-- ){
			if( !DataAry[j] ){ break; }	// 存在しないなら止める
			let ValueAry = DataAry[j].split('\t');

			let lap = ValueAry[6];
			Boss_New_Damage_Text[i] += `${lap} `;		// 周回

			let damage = ValueAry[1];
			//if( today == ValueAry[5] ){
			if( Boss_Lap[i] == lap ){
				damage = `\*\*${damage}\*\*`;
			}
			else if( ValueAry[4] == 1 ){
				damage = `__${damage}__`;
			}
			Boss_New_Damage_Text[i] += damage;			// ダメージ

			if( ValueAry[4] == 1 ){
				Boss_New_Damage_Text[i] += '⚔';			// キルしていたら
			}

			let name = ValueAry[0];
			name = hiraToKana(name);		// ひらがなからカタカナ
			name = hankaku2Zenkaku(name);	// 全角英数字→半角英数字
			name = zenkana2Hankana(name);	// 全角カナ→半角カナ
			name = name.replace(/！/g,'!')

			Boss_New_Damage_Text[i] += `(${name}/${ValueAry[2]}`;	// 名前＆凸番号
			if( ValueAry[3] == 1 ){
				Boss_New_Damage_Text[i] += '♻';			// 持ち越しなら
			}
			Boss_New_Damage_Text[i] += `)`;	// 名前＆凸番号
			Boss_New_Damage_Text[i] += `\n`;
		}
	}
	//console.log(Boss_New_Damage_Text);
	for( let i = 0; i < Boss_New_Damage.length; i++ ){
		if( !Boss_New_Damage_Text[i] ){
			Boss_New_Damage_Text[i] = 'Nodamage';
		}
	}

	return Boss_New_Damage_Text;
}


// プレイヤーの予約データ
async function Now_Reserve(guild_id){

	let battle_schedule = await cmd.Folder(guild_id);

	let RESERVE_NOW = new Array;	// モンスター毎に紐付けた予約データ

	let data = '';
	let datafile = '';

	// ファイルを読み込む
	data = '';
	datafile = battle_schedule + "\/" + 'reserve.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let boss_name = ValueAry[1];
		let key1 = boss_name + "_0";
		let key2 = boss_name + "_1";
		let key3 = boss_name + "_255";
		RESERVE_NOW[key1] = '';
		RESERVE_NOW[key2] = '';
		RESERVE_NOW[key3] = '';
	}
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let boss_name = ValueAry[1];
		let key = boss_name + "_" + ValueAry[4];
		RESERVE_NOW[key] += ValueAry[0] + "\t";	// 名前
		RESERVE_NOW[key] += ValueAry[2] + "\t";	// 物理か魔法か
		RESERVE_NOW[key] += ValueAry[3] + "\n";	// ダメージ
	}
	return RESERVE_NOW;
}


// プレイヤーの戦闘中データ
async function Now_Battle(guild_id){

	let battle_schedule = await cmd.Folder(guild_id);

	let BATTLE_NOW = new Array;	// モンスター毎に紐付けた予約データ

	let data = '';
	let datafile = '';

	// ファイルを読み込む
	data = '';
	datafile = battle_schedule + "\/" + 'battle.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let boss_name = ValueAry[1];
		BATTLE_NOW[boss_name] = '';
	}
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let boss_name = ValueAry[1];
		BATTLE_NOW[boss_name] += ValueAry[0] + "\t";	// 名前
		BATTLE_NOW[boss_name] += ValueAry[2] + "\t";	// 凸番号
		BATTLE_NOW[boss_name] += ValueAry[3] + "\n";	// SOS
	}
	return BATTLE_NOW;
}


// プレイヤーのタスキルデータ
async function Now_Taskkill(guild_id, target_day){

	let battle_schedule = await cmd.Folder(guild_id);

	let TASKKILL_NOW = new Array;	// モンスター毎に紐付けた予約データ

	// 日付と時間取得
	let [year, month, day, hours, minutes, second] = await cmd.Time_Get();
	if( target_day != undefined ){ day = target_day; }

	let data = '';
	let datafile = '';

	// ファイルを読み込む
	data = '';
	datafile = battle_schedule + "\/" + 'taskkill.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let name = ValueAry[0];		// メンバーの名前
		let pday = ValueAry[1];		// 日付
		if( pday == day ){
			TASKKILL_NOW[name] = '1';
		}
	}
	return TASKKILL_NOW;
}


// プレイヤーの優先データ
async function Now_Priority(guild_id, target_day){

	let battle_schedule = await cmd.Folder(guild_id);

	let PRIORITY_NOW = new Array;	// モンスター毎に紐付けた予約データ

	// 日付と時間取得
	let [year, month, day, hours, minutes, second] = await cmd.Time_Get();
	if( target_day != undefined ){ day = target_day; }

	let data = '';
	let datafile = '';

	// ファイルを読み込む
	data = '';
	datafile = battle_schedule + "\/" + 'priority.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let name = ValueAry[0];		// メンバーの名前
		let pday = ValueAry[1];		// 日付
		if( pday == day ){
			PRIORITY_NOW[name] = '1';
		}
	}
	return PRIORITY_NOW;
}


// 進行の予測
async function Progress_Prediction(guild_id, data, BOSS_HP, Level_List){

	let text = '';

	// 日時情報、本来の日付と時間取得
	let [year, month, today, hours, minutes, second] = await cmd.Time_Get();

	// メンバーファイルを読み込む
	let battle_schedule = cmd.Folder(guild_id);
	let member_data = '';
	let datafile = battle_schedule + "\/" + 'member.txt';
	member_data = await cmd.Read_File(datafile);

	let MemberAry = member_data.split('\n');
	MemberAry = MemberAry.filter(Boolean);	// 空白削除
	let max_member = MemberAry.length;
	//console.log("max_member:" + max_member);


	// ここから進行チェック
	let Boss_Lap = [1,1,1,1,1];	// 各ボスの討伐数
	let Boss_Rest_Hp = [0,0,0,0,0];	// 各ボスのHP
	let level_num = 1;			// 現在の段階
	let round_counter = 1;		// 現在の周回
	Boss_Rest_Hp = await progresscmd.Boss_Recovery_Hp(BOSS_HP, Boss_Rest_Hp, level_num);

	let all_charge_count = 0;		// 持ち越し含む全凸数
	let standard_damage = 4000000;	// 400万の数字は適当

	let kill_flag = 0;	// ボスを倒したフラグ
	let Attack_Count_Now = [0,0,0,0,0];		// 各ボスの現在の攻撃回数
	let Attack_Count_Last = [0,0,0,0,0];	// 各ボスの前回凸回数
	let New_Time = ['','','','',''];		// 各ボスの討伐時間
	let Last_Time = ['','','','',''];		// 各ボスの前の討伐時間
	let last_round_time = '';				// 周回の進んだ最後の時間
	let charge_count = '';					// 持ち越しを含まない本日の凸回数

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i=0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\/');
		let name = ValueAry[0];			// メンバーの名前
		let damage = ValueAry[1] * 1;	// 与えたダメージ
		let over = ValueAry[2];			// 持ち越しなら1
		let value_time = ValueAry[3];	// 持ち越し時間
		let day = ValueAry[4];			// 凸日
		let charge_time = ValueAry[5];	// 凸時間
		let boss_counter = ValueAry[6];	// 凸したボス
		let attack_turn = ValueAry[7];	// 凸番号

		// ボスへの攻撃回数
		if( damage > standard_damage && today == day ){	// 基準ダメージを超えたら
			Attack_Count_Now[boss_counter]++;	// 攻撃回数加算
			all_charge_count++;					// 持ち越しを含む凸数加算
		}

		Boss_Rest_Hp[boss_counter] -= damage;	// ダメージ与える

		if( over == 0 && today == day ){	// 持ち越しを含まないかつ同じ日
			charge_count++;					// 持ち越しを含まない凸数加算
		}

		// 討伐した場合
		if( Boss_Rest_Hp[boss_counter] <= 0 ){

			kill_flag = 1;	// 討伐フラグを立てる

			// 各ボスの凸回数を記憶し、現在凸回数を初期化
			Attack_Count_Last[boss_counter] = Attack_Count_Now[boss_counter];
			Attack_Count_Now[boss_counter] = 0;
			Last_Time[boss_counter] = New_Time[boss_counter];	// 前の時間を記録
			New_Time[boss_counter] = charge_time;				// 最新の時間を記録

			// 討伐数
			Boss_Lap[boss_counter]++;

			// 周回進行判定
			if( await progresscmd.Round_Up(Boss_Lap, Boss_Rest_Hp, round_counter) ){
				round_counter++;	// 周回進行
				last_round_time = charge_time;	// 最後に進んだ周回
			}

			// 段階進行判定
			if( await progresscmd.Level_Up(Boss_Lap, Boss_Rest_Hp, Level_List, level_num) ){
				level_num++;	// 段階進行
				// ボス全体HP回復
				Boss_Rest_Hp = progresscmd.Boss_Recovery_Hp(BOSS_HP, Boss_Rest_Hp, level_num)
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
	}

	// マックス凸数の半分を超えたらテキストを作成する。凸完了したらいらない
	if( charge_count > (max_member * 3 / 2) && charge_count != max_member * 3 ){

		// 最も周回数の少ないボスをチェック
		let min_counter = 9999;
		for( let i= 0; i < Boss_Lap.length; i++ ){
			if( min_counter > Boss_Lap[i] ){
				min_counter = Boss_Lap[i];
			}
		}
		let limit_counter = min_counter + 2;	// 次の限界値を規定
		if( cmd.Level_List[level_num - 1] < limit_counter ){	// 段階進行の周回を超えていたら
			limit_counter = cmd.Level_List[level_num - 1];		// その段階ストッパの数字にする
		}

		let round_charge_count = 0;	// 1周にかかる凸数
		let flat_count = 0;		// 完全平坦にする最後の周に必要な凸数
		let flat_count_sub = 0;	// 平坦にするひとつ前までの凸数
		// 周回を合わせるための凸数を数える
		for( let i = 0; i < Boss_Lap.length; i++ ){
			round_charge_count += Attack_Count_Last[i];
			// まだリミットまで行っていない
			if( limit_counter > Boss_Lap[i] ){
				if( limit_counter - Boss_Lap[i] == 1 ){	// 1周遅れ
					flat_count += Attack_Count_Last[i] - Attack_Count_Now[i];
				}
				else if( limit_counter - Boss_Lap[i] == 2 ){	// 2周遅れ
					flat_count += Attack_Count_Last[i];
					flat_count_sub += Attack_Count_Last[i] - Attack_Count_Now[i];	// 平坦1周目に掛かる凸数を計算
				}
			}
		}

		// 1周にかかる時間を雑に計算
		let average_time = 0;
		for( let i= 0; i < Boss_Lap.length; i++ ){
			let [hour, min] = Last_Time[i].split(':');
			if( hour >= 0 && hour < 5 ){ hour += 24; }	// 日付の更新日時の問題
			let last_time = hour * 60 + min * 1;
			[hour, min] = New_Time[i].split(':');
			if( hour >= 0 && hour < 5 ){ hour += 24; }	// 日付の更新日時の問題
			let new_time = hour * 60 + min * 1;
			average_time += new_time - last_time;
			//console.log(Last_Time[i], New_Time[i]);
		}
		// 5体で掛かった時間を割って平均に
		average_time = average_time / Boss_Lap.length;

		let charge_revision = all_charge_count / charge_count;	// 持ち越し分増加によるチャージ回数補正
		//console.log(charge_revision, all_charge_count, charge_count);
		// 残りの凸数を計算（平坦にするまでも加算）
		let beleft_charge = max_member * 3 * charge_revision - (charge_count + flat_count + flat_count_sub);
		//console.log(beleft_charge, charge_count, flat_count, flat_count_sub);

		// 残りの周回数を計算
		let beleft_round = parseInt(beleft_charge / round_charge_count);
		let beleft_round2 = parseInt(beleft_charge % round_charge_count);

		//console.log("最後に周回した時間:" + last_round_time);

		let [hour, min] = last_round_time.split(':');
		let last_round_min = hour * 60 + min * 1;	// 最後に周回した時間を分にする

							// 平均時間　　残り凸数　　　周回進行時間　、現在周回数　、平均凸にする、最初に平均凸にする、1周にかかる凸数、凸れる周回、進行の段階
		text = await Time_Schedule(average_time, beleft_round, last_round_min, round_counter, flat_count, flat_count_sub, round_charge_count, limit_counter, level_num)

		/*console.log("現在凸数:" + charge_count);
		console.log("平坦用凸数:" + flat_count + "+" + flat_count_sub);
		console.log("平坦後残り凸数:" + beleft_charge);
		console.log("1周凸数:" + round_charge_count);
		console.log("残りの周回数:" + beleft_round);
		console.log("beleft_round2:" + beleft_round2);
		console.log(Attack_Count_Now);
		console.log(Attack_Count_Last);
		console.log("flat_count:" + flat_count);
		console.log("flat_count_sub:" + flat_count_sub);
		let average_time1 = parseInt(average_time / 60);
		let average_time2 = parseInt(average_time % 60);
		console.log("average_time:" + average_time +"→"+ average_time1 +":"+ average_time2);
		console.log(text);*/
	}

	return text;
}

				// 平均時間　　残り凸数　　　周回進行時間　、現在周回数　、平均凸にする、最初に平均凸にする、1周にかかる凸数
function Time_Schedule(average_time, beleft_round, last_round_min, round_counter, flat_count, flat_count_sub, round_charge_count, limit_counter, level_num){

	let text = '';

	let Flat_Count = [];
	if( flat_count_sub ){
		Flat_Count.push(flat_count_sub);
	}
	if( flat_count ){
		Flat_Count.push(flat_count);
	}


	for( let i = 0; i < beleft_round + Flat_Count.length; i++ ){
		let time_adjustment = 0;
		if( Flat_Count[i] != undefined ){
			time_adjustment = parseInt(Flat_Count[i] / round_charge_count * average_time);
			last_round_min += time_adjustment;
		}
		else{
			time_adjustment = average_time;
			last_round_min += average_time;
		}
		let average_hour = parseInt(last_round_min / 60);
		let average_min = parseInt(last_round_min % 60);
		average_min = ( '00' + average_min ).slice( -2 );
		round_counter++;
		let round = round_counter;
		average_hour = average_hour % 24;
		//console.log(last_round_min)
		//console.log(round_counter)
		//console.log(cmd.Level_List[level_num - 1])
		let next_level_num = level_num + 1;
		if( round_counter >= cmd.Level_List[level_num - 1] ){	// 周回数がリミットを超えたら強制終了
			text += `[${next_level_num}段階目]${average_hour}:${average_min} `;
			break;
		}
		else{
			text += `[${round}周目]${average_hour}:${average_min} `;
		}
	}
	return text;
}

// 今月の結果を表示
async function Result(msg){

	let channel_id = await checkcmd.Channel_Search(msg.guildId, "status");

	// ファイルを読み込む
	let battle_schedule = cmd.Folder(msg.guildId);
	let data = '';
	let datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	let VALUE_DATA = { "type":"result" };
	// 討伐ボス一覧テキスト
	let [MAX_DAMAGE, MAX_DAMAGE_TEXT, FINISH_KILL, KILL_BOSS] = await progresscmd.Progress(data, cmd.BOSS_HP, cmd.Level_List, VALUE_DATA )
	//console.log(FINISH_KILL)
	//console.log(MAX_DAMAGE)
	//console.log(MAX_DAMAGE_TEXT)

	let text = '';

	//キーを含んだ配列に変換 オブジェクト⇒配列
	FINISH_KILL = await Object.keys(FINISH_KILL).map((k)=>({ key: k, value: FINISH_KILL[k] }));
	//値段順
	await FINISH_KILL.sort((b, a) => a.value - b.value);

	let count = 0;
	let last_round = 0;
	let FIELD = [];
	let title = '';

	for( let i = 0; i < FINISH_KILL.length; i++ ){
		if( last_round != FINISH_KILL[i].value ){
			last_round = FINISH_KILL[i].value;
			count++;
		}
		if( count > 5 ){	break;	}				// 6位以降もシャットアウト
		if( FINISH_KILL[i].value < 5 ){	break;	}	// 5回未満もシャットアウト
		title = `${FINISH_KILL[i].value}回　${FINISH_KILL[i].key}`;
		//FIELD[i] = title;
		let Boss_List = KILL_BOSS[FINISH_KILL[i].key].split('\n');
		Boss_List = Boss_List.filter(Boolean);	// 空白削除
		let Boss_Count = [0,0,0,0,0];
		let kill_text = '';
		for(let j = 0; j < Boss_List.length; j++ ){
			Boss_Count[Boss_List[j]]++;
		}
		for(let j = 0; j < Boss_Count.length; j++ ){
			if( Boss_Count[j] > 0 ){
				kill_text += `${cmd.Boss_Name[j]} ${Boss_Count[j]}回/`
			}
		}
		if( kill_text.slice(-1) == '/' ){ kill_text = kill_text.slice( 0, -1); }
		FIELD[title] = kill_text;
	}
	FIELD = await Object.keys(FIELD).map((k)=>({ name: k, value: FIELD[k] }));

	// embedを作成
	let exampleEmbed = new MessageEmbed()
		.setColor('#EEEEEE')
		.setTitle('ラストアタック回数')
		//.setDescription(text)
		.addFields(FIELD)
		.setFooter('※ワンパンは除外');

	await msg.guild.channels.cache.get(channel_id)
		.send( { content: "弟くん、今月のクランバトルの結果だよ", embeds: [exampleEmbed] });
	await _sleep(1000);	// 1秒待つ


	// 段階別の色
	let Color = ['','#76bf63','#5eaae4','#ff67ac','#fe4641','#c167d9',]

	// ここから各段階のボス
	for( let i = 1; i <= cmd.Level_List.length; i++ ){
		text = '';
		title = `■第${i}段階ボス最大ダメージ`;
		let Boss_Damage = [];
		let Boss_Battle = [];
		let Boss_Battle_Sub = [];
		let FIELDS = [];
		for( let j = 0; j < cmd.Boss_Name.length; j++ ){
			for( let k = 1; k <= 3; k++ ){
				let hash_key = `${j}_${i}_${k}`;
				if( i != cmd.Level_List.length ){	// 最大段階以外
					Boss_Damage[j] = `${cmd.Boss_Name[j]}　${MAX_DAMAGE[hash_key]}ダメージ\n`;
					Boss_Battle[j] = Result_Person(MAX_DAMAGE_TEXT[hash_key]);
					Boss_Battle_Sub[j] = Boss_Battle[j];
				}
				else{	// 最大段階時
					Boss_Damage[j] = `${cmd.Boss_Name[j]}\n`;
					Boss_Battle[j] = Result_Person(MAX_DAMAGE_TEXT[hash_key]);
					if( Boss_Battle_Sub[j] == undefined ){ Boss_Battle_Sub[j] = ''; }
					let medal;
					if( k == 1 ){ medal = '🥇'; }
					else if( k == 2 ){ medal = '🥈'; }
					else if( k == 3 ){ medal = '🥉'; }
					Boss_Battle_Sub[j] += `${medal}**${MAX_DAMAGE[hash_key]}ダメージ** ${Boss_Battle[j]}\n`;
				}
				//FIELDS[j].name = Boss_Damage[j];
				//FIELDS[j].value = Boss_Battle[j];
				//console.log(i, cmd.Level_List.length);
				if( i != cmd.Level_List.length ){ break; }	// 段階最大数の時以外はひとつ目で終わり
			}
			FIELDS[Boss_Damage[j]] = Boss_Battle_Sub[j];
		}
		FIELDS = await Object.keys(FIELDS).map((k)=>({ name: k, value: FIELDS[k] }));
		// embedを作成
		exampleEmbed = new MessageEmbed()
			.setColor(Color[i])
			.setTitle(title)
			.setDescription(text)
			.addFields(FIELDS)
		await msg.guild.channels.cache.get(channel_id)
			.send( { embeds: [exampleEmbed] });
		await _sleep(1000);	// 1秒待つ
	}
}

function Result_Person(text){

	let Name_List = [];
	let PERSON_DATA = [];

	//console.log(text);
	if( text == undefined ){
		return "データなし";
	}

	let DataAry = text.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let name = ValueAry[0];
		let round = ValueAry[1];
		if( !Name_List.includes(name) ){	// 発見できない
			Name_List.push(name);
		}
		if( PERSON_DATA[name] == undefined ){ PERSON_DATA[name] = ''; }
		PERSON_DATA[name] += `${round}周/`;
	}

	let return_text = '';
	for( let i = 0; i < Name_List.length; i++ ){
		let round_text = PERSON_DATA[Name_List[i]];
		if( round_text.slice(-1) == '/' ){ round_text = round_text.slice( 0, -1); }
		return_text += `${Name_List[i]}[${round_text}]　`;
	}
	return return_text;
}



// ひらがな→カタカナ
function hiraToKana(str) {
    return str.replace(/[\u3041-\u3096]/g, function(match) {
        let chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
}

// 全角英数字→半角英数字
function hankaku2Zenkaku(str) {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

function zenkana2Hankana(str) {
    const kanaMap = {
         "ガ": "ｶﾞ", "ギ": "ｷﾞ", "グ": "ｸﾞ", "ゲ": "ｹﾞ", "ゴ": "ｺﾞ",
         "ザ": "ｻﾞ", "ジ": "ｼﾞ", "ズ": "ｽﾞ", "ゼ": "ｾﾞ", "ゾ": "ｿﾞ",
         "ダ": "ﾀﾞ", "ヂ": "ﾁﾞ", "ヅ": "ﾂﾞ", "デ": "ﾃﾞ", "ド": "ﾄﾞ",
         "バ": "ﾊﾞ", "ビ": "ﾋﾞ", "ブ": "ﾌﾞ", "ベ": "ﾍﾞ", "ボ": "ﾎﾞ",
         "パ": "ﾊﾟ", "ピ": "ﾋﾟ", "プ": "ﾌﾟ", "ペ": "ﾍﾟ", "ポ": "ﾎﾟ",
         "ヴ": "ｳﾞ", "ヷ": "ﾜﾞ", "ヺ": "ｦﾞ",
         "ア": "ｱ", "イ": "ｲ", "ウ": "ｳ", "エ": "ｴ", "オ": "ｵ",
         "カ": "ｶ", "キ": "ｷ", "ク": "ｸ", "ケ": "ｹ", "コ": "ｺ",
         "サ": "ｻ", "シ": "ｼ", "ス": "ｽ", "セ": "ｾ", "ソ": "ｿ",
         "タ": "ﾀ", "チ": "ﾁ", "ツ": "ﾂ", "テ": "ﾃ", "ト": "ﾄ",
         "ナ": "ﾅ", "ニ": "ﾆ", "ヌ": "ﾇ", "ネ": "ﾈ", "ノ": "ﾉ",
         "ハ": "ﾊ", "ヒ": "ﾋ", "フ": "ﾌ", "ヘ": "ﾍ", "ホ": "ﾎ",
         "マ": "ﾏ", "ミ": "ﾐ", "ム": "ﾑ", "メ": "ﾒ", "モ": "ﾓ",
         "ヤ": "ﾔ", "ユ": "ﾕ", "ヨ": "ﾖ",
         "ラ": "ﾗ", "リ": "ﾘ", "ル": "ﾙ", "レ": "ﾚ", "ロ": "ﾛ",
         "ワ": "ﾜ", "ヲ": "ｦ", "ン": "ﾝ",
         "ァ": "ｧ", "ィ": "ｨ", "ゥ": "ｩ", "ェ": "ｪ", "ォ": "ｫ",
         "ッ": "ｯ", "ャ": "ｬ", "ュ": "ｭ", "ョ": "ｮ",
         "。": "｡", "、": "､", "ー": "ｰ", "「": "｢", "」": "｣", "・": "･"
    }
    const reg = new RegExp('(' + Object.keys(kanaMap).join('|') + ')', 'g');
    return str
            .replace(reg, function (match) {
                return kanaMap[match];
            })
            .replace(/゛/g, 'ﾞ')
            .replace(/゜/g, 'ﾟ');
};




module.exports = {
	Now_Id,
	Now_Main,
	Result
}

