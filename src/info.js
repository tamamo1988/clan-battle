'use strict';

const { MessageEmbed } = require('discord.js');
const request = require('request-promise');
const cmd = require('./set');
const checkcmd = require('./check');

//ヘッダーを定義
const headers = {
  'Content-Type':'application/json'
}

const icon_url_main = 'http://yellow.ribbon.to/~gabapuri/image/';

// 疑似wait
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function Help_Text( msg, help_word ){

	// 手動側ファイルを読み込む
	let data = '';
	let datafile = 'common_data/help.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	//DataAry = DataAry.filter(Boolean);	// 空白削除

	let help_count = -1;
	let help_disable = 1;
	let Help_Text = [];
	for( let i = 0; i < DataAry.length; i++ ){
		if( DataAry[i].match(/^▼▼/) ){	help_disable = 0;	}	// 非表示フラグを立てる
		else if( DataAry[i].match(/^▼/) ){	help_disable = 1;	}	// 表示フラグを立てる
		if( DataAry[i].match(/○(.*?)○/) ){
			help_count++;	help_disable = 1;
		}
		if( help_disable ){
			if( Help_Text[help_count] == undefined ){ Help_Text[help_count] = ''; }
			Help_Text[help_count] += `${DataAry[i]}\n`;
		}
	}

	Help_Text.forEach(async function(item, index, array) {
		if( msg.type == 'APPLICATION_COMMAND' ){
			await msg.guild.channels.cache.get(msg.channelId).send(item);
		}
		else{
			await msg.reply(item);
		}
		await _sleep(1000);	// 1秒待つ
	});

	return;
}



// インフォメーションアップデート
async function Info_Update(){
	let data_text = '';
	let data_key = {};
	let data_num = 0;
	let options = {
		url: "https://redive.estertion.win/ver_log_redive/?page=1&filter=filter_name", method: 'GET',
		headers: headers,
		json: true,
	}
	await request(options, async function (error, response, body) {
		let end_temp = {};
		let start_temp = {};
		//console.log(body.data)
		for( let i = 0; i < body.data.length; i++ ){	// iはデータ最大値まで回す
			let hash_key;
			let id_key;
			//console.log(i + ":" +	body.data[i].campaign)
			// キャンペーン回り
			if( body.data[i].campaign ){
				for( let h = 0; h < body.data[i].campaign.length; h++ ){
					hash_key = body.data[i].campaign[h].category + ":" + body.data[i].campaign[h].start;	// キャンペーン開始日
					id_key = body.data[i].campaign[h].id;			 // キャンペーンに紐付けられているID
					//console.log("id_key:" + id_key);
					if( data_key[hash_key] ){ continue; }
					if( data_key[id_key] ){ continue; }
					//console.log("A" + body.data[i].campaign[h].id)
					let category_flag = '';
					if( body.data[i].campaign[h].category == 31 ){	// ノーマルX倍キャンペーン
						category_flag = 'Normal';
					}
					else if( body.data[i].campaign[h].category == 32 ){	// ハードX倍キャンペーン
						category_flag = 'Hard';
					}
					else if( body.data[i].campaign[h].category == 34 ){	// 探索X倍キャンペーン
						category_flag = 'Quest';
					}
					else if( body.data[i].campaign[h].category == 37 ){	// 調査X倍キャンペーン 38はおそらく神殿
						category_flag = 'Research';
					}
					else if( body.data[i].campaign[h].category == 39 ){	// ベリーハードX倍キャンペーン
						category_flag = 'VHard';
					}
					else if( body.data[i].campaign[h].category == 45 ){	// ダンジョンマナX倍キャンペーン
						category_flag = 'Dungeon';
					}
					else if( body.data[i].campaign[h].category == 91 ){	// マスターコインX倍キャンペーン　92はおそらく取得量の方
						category_flag = "Master";
					}
					else if( body.data[i].campaign[h].category == 541 ){	// ＳＰダンジョン
						category_flag = "SPDungeon";
					}
					else if( body.data[i].campaign[h].category == 151	){ // イベントノーマル経験値1.5倍 ハード152もあるが基本一緒
						category_flag = "";
						let start_flag = body.data[i].campaign[h].start.match(/([0-9]{1,4})/g);	// 左から年、月、日、時、分、秒を取る
						let start_key = start_flag[0] + "/" + ( '00' + start_flag[1] ).slice( -2 ) + "/" + start_flag[2] + " " + start_flag[3] + ":" + start_flag[4] + ":" + start_flag[5];
						let start_key2 = start_flag[0] + "/" + start_flag[1] + "/" + start_flag[2] + " " + start_flag[3] + ":" + start_flag[4] + ":" + start_flag[5];
						let start_key3 = "2030/12/30 14:59:59";
						let start_key4 = "2030/12/30 12:00:00";
						//console.log("151:" + start_key + ":	 " + body.data[i].campaign[h].start + ":" + body.data[i].campaign[h].end);
						end_temp[start_key] = body.data[i].campaign[h].end;
						end_temp[start_key2] = body.data[i].campaign[h].end;
						start_temp[start_key3] = body.data[i].campaign[h].start;	// 結構無理矢理。大本の順番が正しくないと瓦解する
						start_temp[start_key4] = body.data[i].campaign[h].start;	// 結構無理矢理。大本の順番が正しくないと瓦解する
						end_temp[start_key3] = body.data[i].campaign[h].end;
						end_temp[start_key4] = body.data[i].campaign[h].end;
						// ここは設定するだけ
					}
					else if( body.data[i].campaign[h].category == 251	){ // 復刻イベントノーマル経験値1.5倍 ハード252もあるが基本一緒
						category_flag = "";
						let start_flag = body.data[i].campaign[h].start.match(/([0-9]{1,4})/g);	// 左から年、月、日、時、分、秒を取る
						let start_key = start_flag[0] + "/" + ( '00' + start_flag[1] ).slice( -2 ) + "/" + start_flag[2] + " " + start_flag[3] + ":" + start_flag[4] + ":" + start_flag[5];
						let start_key2 = start_flag[0] + "/" + start_flag[1] + "/" + start_flag[2] + " " + start_flag[3] + ":" + start_flag[4] + ":" + start_flag[5];
						let start_key3 = "2030/12/30 14:59:59";
						let start_key4 = "2030/12/30 12:00:00";
						//console.log("BBBB:" + start_key + ":	 " + body.data[i].campaign[h].start + ":" + body.data[i].campaign[h].end);
						end_temp[start_key] = body.data[i].campaign[h].end;
						end_temp[start_key2] = body.data[i].campaign[h].end;
						start_temp[start_key3] = body.data[i].campaign[h].start;	// 結構無理矢理。大本の順番が正しくないと瓦解する
						start_temp[start_key4] = body.data[i].campaign[h].start;	// 結構無理矢理。大本の順番が正しくないと瓦解する
						end_temp[start_key3] = body.data[i].campaign[h].end;
						end_temp[start_key4] = body.data[i].campaign[h].end;
						// ここは設定するだけ
					}

					if( category_flag ){
						data_text = data_text + category_flag + "\t\t" + body.data[i].campaign[h].start +	"\t" + body.data[i].campaign[h].end + "\t" + body.data[i].campaign[h].value + "\n";
						data_num++;
						data_key[hash_key] = 1;
						data_key[id_key] = 1;
						//console.log("hash_key:" + hash_key);
						//console.log("data_key:" + data_key[hash_key]);
					}
				}
			}
			// ガチャ回り
			if( body.data[i].gacha ){
				for( let h = 0; h < body.data[i].gacha.length; h++ ){
					hash_key = body.data[i].gacha[h].detail + ":" + body.data[i].gacha[h].start;
					id_key = body.data[i].gacha[h].id;			 // キャンペーンに紐付けられているID
					if( data_key[hash_key] ){ continue; }
					if( data_key[id_key] ){ continue; }
					if( !body.data[i].gacha[h].detail ){ continue; }
					let category_flag = 'gacha';
					//console.log("gacha:" + body.data[i].gacha[h].detail + ":" + body.data[i].gacha[h].start);
					data_text = data_text + category_flag + "\t" + body.data[i].gacha[h].detail + "\t" + body.data[i].gacha[h].start +	"\t" + body.data[i].gacha[h].end +	"\t0" + "\n";
					if( category_flag ){
						data_key[hash_key] = 1;
						data_key[id_key] = 1;
					}
				}
			}
			// イベント回り
			if( body.data[i].event ){
				for( let h = 0; h < body.data[i].event.length; h++ ){
					hash_key = body.data[i].event[h].name + ":" + body.data[i].event[h].start;
					id_key = body.data[i].event[h].id;			 // キャンペーンに紐付けられているID
					if( data_key[hash_key] ){ continue; }
					if( body.data[i].event[h].type == 'tower' ){ body.data[i].event[h].name = 'ルナの塔'; }
					if( !body.data[i].event[h].name ){ continue; }	// イベントに名前がなかったらスルー
					let category_flag = 'event';
					//console.log("event:[" + i + "]:[" + h + "]:" + body.data[i].event[h].name + ":" + body.data[i].event[h].start + ":" + end_temp[body.data[i].event[h].start]);
					if( body.data[i].event[h].start == "2030/12/30 14:59:59" ){	// そもそも開始時間がおかしいケース
						body.data[i].event[h].start = start_temp[body.data[i].event[h].start];
						body.data[i].event[h].end = end_temp[body.data[i].event[h].end];
					}
					else if( body.data[i].event[h].start == "2030/12/30 12:00:00" ){	// そもそも開始時間がおかしいケース2
						body.data[i].event[h].start = start_temp[body.data[i].event[h].start];
						body.data[i].event[h].end = end_temp[body.data[i].event[h].end];
					}
					else if( body.data[i].event[h].end == body.data[i].event[h].start ){	// 開始時間と終了時間が一緒だったら
						body.data[i].event[h].end = end_temp[body.data[i].event[h].start];
					}
					data_text = data_text + category_flag + "\t" + body.data[i].event[h].name + "\t" + body.data[i].event[h].start + "\t" + body.data[i].event[h].end +	"\t0" + "\n";
					if( category_flag ){
						data_key[hash_key] = 1;
						data_key[id_key] = 1;
					}
				}
			}
			// クランバトル
			if( body.data[i].clan_battle ){
				for( let h = 0; h < body.data[i].clan_battle.length; h++ ){
					hash_key = "clan_battle:" + body.data[i].clan_battle[h].start;
					if( data_key[hash_key] ){ continue; }
					let category_flag = 'clan_battle';
					data_text = data_text + category_flag + "\t\t" + body.data[i].clan_battle[h].start + "\t" + body.data[i].clan_battle[h].end + "\t0" + "\n";
					if( category_flag ){	data_key[hash_key] = 1;	}
				}
			}
		}
		//console.log(end_temp);
	})

	let datafile = 'common_data/info.txt';
	await cmd.Write_File(datafile, data_text);

	return;
}

// インフォメーションテキスト（当日）
async function Info_Text(msg, mode, dm_flag){

	// ファイルを読み込む
	let data = '';
	let datafile = 'common_data/info.txt';
	data = await cmd.Read_File(datafile);
	let DataAry = data.split('\n');

	// ファイルを読み込む
	data = '';
	datafile = 'common_data/info_manual.txt';
	data = await cmd.Read_File(datafile);
	let SubAry = data.split('\n');
	
	DataAry = DataAry.concat(SubAry);
	DataAry = DataAry.filter(Boolean);	// 空白削除

	let text = '';
	let embed_text = [];		// クランバトル用テキスト 
	let now_text = '';			// 開催中
	let start_text = '';		// 本日開始
	let end_text = '';			// 本日終了
	let to_start_text = '';		// 明日開始
	let to_end_text = '';		// 明日終了
	let a_start_text = '';		// 明後日開始やら…ダンジョン専用
	let manual_text = '';		// 手動で入れたテキスト
	let manual_text2 = '';		// 手動で入れたテキスト
	let caution_text = '';		// 注意テキスト
	let clanbattle_text = '';	// クランバトルテキスト
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let type = ValueAry[0];		// タイプ
		let name = ValueAry[1];		// 名前
		let start_main = ValueAry[2];	// 開始日
		let end_main = ValueAry[3];		// 終了日
		let value = ValueAry[4];		// その他

		if( start_main == 'undefined' ){ continue; }		// 前以て設定された復刻などは時間が指定できない
		if( end_main == 'undefined' ){ continue; }		// 前以て設定された復刻などは時間が指定できない

		let [syear, smon, sday, shour, smin, ssec] = await Day_Resolve(start_main);
		let [eyear, emon, eday, ehour, emin, esec] = await Day_Resolve(end_main);
		if( ehour < 5 ){ eday--; }		// 深夜帯のものを当日に修正

		// 一ヶ月すべて
		if( mode == 'all' ){
			// 調べる日付、範囲の開始日時、範囲の終了日時
			let [o_year, o_month, o_day, o_hour, o_min, o_sec] = cmd.Time_Get(true);
			let [c_year, c_month, c_day, c_hour, c_min, c_sec] = cmd.Time_Get(true, "day", 30);

			//isWithinRangeDays([2001, 3, 4, 10, 0, 0], [2001, 3, 1], [2001, 3, 5]);
			if( isWithinRangeDays([syear, smon, sday, shour, smin, ssec], [o_year, o_month, o_day, o_hour, o_min, o_sec], [c_year, c_month, c_day, c_hour, c_min, c_sec])
			|| isWithinRangeDays([eyear, emon, eday, ehour, emin, esec], [o_year, o_month, o_day, o_hour, o_min, o_sec], [c_year, c_month, c_day, c_hour, c_min, c_sec]) ){
				name =  Name_Omission(type, name, value);

				let main_text = start_main;
				if( start_main != end_main ){
					main_text += `～${end_main}`;
				}
				text += `${name} ${main_text}\n`;
			}
		}
		else{
			name =  Name_Omission(type, name, value);
			let [o_year, o_month, o_day, o_hour, o_min, o_sec] = cmd.Time_Get(true);			// 今日の日付
			let [t_year, t_month, t_day, t_hour, t_min, t_sec] = cmd.Time_Get(true, "day", 1);	// 明日の日付
			let [a_year, a_month, a_day, a_hour, a_min, a_sec] = cmd.Time_Get(true, "day", 2);	// 明後日の日付

			// 本日開始
			if( isWithinRangeDays([syear, smon, sday], [o_year, o_month, o_day], [o_year, o_month, o_day]) ){
				if( type == 'manual_add' ){
					if( sday == eday && shour != ehour ){	// 同じ日だが終了時間が違う
						manual_text += `${shour}時${smin}から${ehour}時${emin}分まで${name}、`;
					}
					else{
						manual_text += `${shour}時に${name}、`;
					}
				}
				else{
					if( type == 'clan_battle' ){
						clanbattle_text += `それと今日から${name}だよ！　弟くん頑張って！`;
					}
					else{
						start_text += `${name}、`;
					}
				}
			}
			// 本日終了
			else if( isWithinRangeDays([eyear, emon, eday], [o_year, o_month, o_day], [o_year, o_month, o_day]) ){
				let ehour2 = (ehour * 1) + 1;
				// 終了時は注意が多い
				if( type == 'event' ){
					if( name == 'ルナの塔' ){
						caution_text += `${name}が${ehour2}時に終わるからやり残しがないよう注意してね`;
					}
					else{
						caution_text += `${name}が${ehour2}時に終わるからボスチケットは使い切っておいた方がいいかな`;
					}
				}
				else if( type == 'gacha' ){
					/*if( name.match(/プラチナガチャ/) ){
						caution_text += `${ehour2}時に星3確定プラチナガチャが終わるみたい`;
					}*/
					if( name.match(/復刻ガチャ/) ){
						caution_text += `${ehour2}時に復刻ガチャが終わるからキャラ交換ポイントには注意するんだよ\n`;
					}
					if( name.match(/(.*?)ピックアップガチャ/) ){
						let Name_Tmp = name.match(/(.*?)ピックアップガチャ/);
						let chara_name = Name_Tmp[1];
						caution_text += `${ehour2}時に${chara_name}のピックアップが終わるからキャラ交換ポイントには注意するんだよ\n`;
					}
				}
				else if( type == 'clan_battle' ){
					clanbattle_text += `それと${name}は今日の24時で終わりだよ！　弟くん、最後まで気をつけてね！`;
					embed_text = await Charge_Research(msg.guildId);
				}
				else{
					end_text += `${name}、`;
				}
			}
			// 明日開始
			else if( isWithinRangeDays([syear, smon, sday], [t_year, t_month, t_day], [t_year, t_month, t_day]) ){
				if( type == 'manual_add' ){
					if( sday == eday && shour != ehour ){	// 同じ日だが終了時間が違う
						manual_text2 += `${shour}時${smin}から${ehour}時${emin}分まで${name}、`;
					}
					else{
						manual_text2 += `${shour}時に${name}、`;
					}
				}
				else if( type == 'Dungeon' ){
					a_start_text += `明日から${name}が始まるから今日はボスを倒すだけかな`;
				}
				else{
					to_start_text += `${name}、`;
				}
			}
			// 明後日開始
			else if( isWithinRangeDays([syear, smon, sday], [a_year, a_month, a_day], [a_year, a_month, a_day]) ){
				if( type == 'Dungeon' ){
					a_start_text += `明後日から${name}が始まるから今日はボスを倒さないように注意してね`;
				}
			}
			// 明日終了？　クランバトル終了後
			else if( isWithinRangeDays([eyear, emon, eday], [t_year, t_month, t_day], [t_year, t_month, t_day]) ){
				to_end_text += `${name}、`;
				if( type == 'clan_battle' ){
					embed_text = await Charge_Research(msg.guildId);
				}
			}
			// 現在開催中
			else if( isWithinRangeDays([o_year, o_month, o_day], [syear, smon, sday, shour, smin, ssec], [eyear, emon, eday, ehour, emin, esec]) ){
				now_text += `${name}、`;
				if( type == 'clan_battle' ){	// クラバト時は時間調査をつける
					embed_text = await Charge_Research(msg.guildId);
				}
			}
		}
	}

	if( mode == 'all' ){
		console.log("インフォメーション一ヶ月");
		if( text ){
			text = '弟くん、今日から一ヶ月の予定だよ```' + text + '```';
			msg.reply(text);
		}
		else{
			msg.reply(`弟くん、この先一ヶ月は何もないよ`);
		}
	}
	else{
		let text_sub = '';
		let add_flag = 0;
		console.log("インフォメーション当日");

		[text_sub, add_flag] = Today_Infotext(start_text, "今日から", "だね", add_flag);
		text += text_sub;

		[text_sub, add_flag] = Today_Infotext(now_text, "今は", "が開催中だよ", add_flag);
		text += text_sub;

		[text_sub, add_flag] = Today_Infotext(end_text, "", "は今日で終わりだね", add_flag);
		text += text_sub;

		[text_sub, add_flag] = Today_Infotext(to_start_text, "明日からは", "が始まるよ", add_flag);
		text += text_sub;

		[text_sub, add_flag] = Today_Infotext(a_start_text, "", "", add_flag);
		text += text_sub;

		[text_sub, add_flag] = Today_Infotext(to_end_text, "", "は明日で終わりだね", add_flag);
		text += text_sub;

		[text_sub, add_flag] = Today_Infotext(manual_text, "今日は", "だね", add_flag);
		text += text_sub;

		[text_sub, add_flag] = Today_Infotext(manual_text2, "明日は", "だよ", add_flag);
		text += text_sub;

		text += caution_text + "\n";
		text += clanbattle_text + "\n";
		text = text.replace(/\n\n/g, "\n");	// 連続改行ふたつをひとつに

		if( text ){
			if( msg.channel.type === "DM" ){	// DMフラグが立っている
				msg.reply(text);
			}
			else{
				let channel_id = await checkcmd.Channel_Search(msg.guildId, "info");
				if( channel_id == false ){	console.log("チャンネル非存在");	return;	}
				if( embed_text != '' ){
					msg.guild.channels.cache.get(channel_id).send({ content : text,  embeds: [embed_text] });
				}
				else{
					msg.guild.channels.cache.get(channel_id).send(text);
				}
			}
		}
	}
}

// インフォメーションテキスト追加
async function Info_Write(msg, text){

	console.log("インフォメーション追加");

	text = text.replace(/　/g, " ");	// 全角スペースを半角に
	text = text.replace(/ +/g, " ");	// 半角スペースが複数あったらひとつに
	text = text.replace(/^\//g, "");	// 先頭スラッシュ削除

	// コマンドや名前などを算出
	let DataAry = text.split(/ /);
	let command = DataAry[0];		// infoなど
	let name = DataAry[1];			// 登録する名前
	let start_day = DataAry[2];		// 開始日
	let start_time = DataAry[3];	// 開始時間
	let end_day = DataAry[4];		// 終了日
	let end_time = DataAry[5];		// 終了時間
	console.log(command);

	let start_text = '';
	let end_text = '';
	if( command == 'info_add' ){
		start_text = Time_Check(start_day, start_time);
		if( !start_text ){
			msg.reply(`弟くん、日付や時間の書式がおかしいよ`);
			return;
		}
		end_text = Time_Check(end_day, end_time);
		if( !end_text ){ end_text = start_text;	}
	}

	// 追加することになる書式
	let add_text = '';
	add_text = 'manual_add\t';
	add_text += `${name}\t`;
	add_text += `${start_text}\t`;
	add_text += `${end_text}\t`;
	add_text += `0`;
	let main_text = start_text;
	if( start_text != end_text ){ main_text += `～${end_text}` }


	let data = '';
	let datafile = "common_data/info_manual.txt";
	data = await cmd.Read_File(datafile);

	DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除

	let file_write_flag = 0;
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		ValueAry = ValueAry.filter(Boolean);	// 空白削除
		let event_type = ValueAry[0];
		let event_name = ValueAry[1];
		let event_start = ValueAry[2];
		let event_end = ValueAry[3];
		let event_now = ValueAry[4];		// 今どの状況か 0未通知 1 15分前通知? 999完全終了通知

		if( command == 'info_add' ){
			// 同じ名前のイベントが存在している
			if( name == event_name ){
				file_write_flag = 1;
				msg.reply(`弟くん、${name}を${main_text}で修正したよ`)
				DataAry[i] = '';
				break;
			}
		}
		if( command == 'info_del' ){
			// 同じ名前のイベントが存在している
			if( name == event_name ){
				file_write_flag = 1;
				msg.reply(`弟くん、${name}を削除したよ`)
				DataAry[i] = '';
				break;
			}
		}
	}

	// 同名の情報が見つからない
	if( !file_write_flag && command == 'info_add' ){
		file_write_flag = 1;
		msg.reply(`弟くん、${name}を${main_text}で追加したよ`);
	}
	else if( !file_write_flag && command == 'info_del' ){
		msg.reply(`弟くん、${name}が見つからないから削除できなかったよ`);
		return;
	}

	// ファイル書き込み処理
	if( file_write_flag ){
		let text = '';
		DataAry = DataAry.filter(Boolean);	// 空白削除
		if( command == 'info_add' ){
			text += add_text + "\n";
		}
		for( let i = 0; i < DataAry.length; i++ ){
			text += DataAry[i] + "\n";
		}

		// 情報ファイル書き込み
		await cmd.Write_File(datafile, text);
	}
}




// 通知テキスト表示
async function Notice_Text(){

	let data = '';
	let datafile = '';
	let Event_List = [];
	let Event_List2 = [];

	// ここからテキスト周り
	let text = '';

	// 調べる日付、範囲の開始日時、範囲の終了日時
	let [year, month, day, hour, min, sec] = cmd.Time_Get(true);
	let greeting_flag = 0;
	if( hour >= 5 && hour < 12 ){	// 5時から12時まで通知を立てておく
		// 挨拶フラグファイルを読み込む
		data = '';
		datafile = 'common_data/day_notice.txt';
		data = await cmd.Read_File(datafile);
		data = data.replace(/\n/g, '');
		
		if( data != '' && day.toString() != data ){	// 日付が違っていたら
			// 情報ファイル書き込み
			await cmd.Write_File(datafile, day.toString());

			await Info_Update();	// このタイミングで自動情報アップデート

			Event_List.push(`日付が変わったね\tDay`)
			text += `\n`;
			greeting_flag = 1;
		}
	}

	// 手動側ファイルを読み込む
	data = '';
	datafile = 'common_data/info_manual.txt';
	data = await cmd.Read_File(datafile);

	Event_List2 = await Notice_Text_Sub(datafile, data);
	Event_List = Event_List.concat(Event_List2);

	// 自動側ファイルを読み込む
	data = '';
	datafile = 'common_data/info.txt';
	data = await cmd.Read_File(datafile);

	Event_List2 = await Notice_Text_Sub(datafile, data);
	Event_List = Event_List.concat(Event_List2);


	if( Event_List.length > 0 ){
		text = '弟くん、';
	}
	for( let i = 0; i < Event_List.length; i++ ){
		let ValueAry = Event_List[i].split(/\t/);
		let name = ValueAry[0];
		let type = ValueAry[1];
		if( type == 'Day' ){
			text += `${name}\n`;
		}
		else if( type == 'Start30' ){
			text += `そろそろ「${name}」が始まるよ\n`;
		}
		else if( type == 'Start0' ){
			text += `「${name}」が始まったよ\n`;
		}
		else if( type == 'End30' ){
			text += `そろそろ「${name}」が終わるよ\n`;
		}
		else if( type == 'End0' ){
			text += `「${name}」が終わったよ\n`;
		}
		else if( type == 'Sp0' ){	// クラバト処理
			greeting_flag = 100;
			text += `クランバトルの結果を貼ったよ\n`;
		}
		else{
			text += `「${name}」で何かがあるけどこれはバグだよ\n`;
		}
	}

	return [text, greeting_flag];
}

// 通知テキストある意味
async function Notice_Text_Sub(file, data){

	let flag = 0;
	let Event_List = [];

	let file_write_flag = 1;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除

	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let type = ValueAry[0];		// タイプ
		let name = ValueAry[1];		// 名前
		let start_main = ValueAry[2];	// 開始日
		let end_main = ValueAry[3];		// 終了日
		let value = ValueAry[4];		// その他

		if( value == 999 ){ continue; }			// 通知がすでに行った後なら飛ばす
		if( type == 'Normal' ){ continue; }		// ここからは内容的に飛ばすもの
		if( type == 'Hard' ){ continue; }		// ここからは内容的に飛ばすもの
		if( type == 'VHard' ){ continue; }		// ここからは内容的に飛ばすもの
		if( type == 'Dungeon' ){ continue; }	// ここからは内容的に飛ばすもの
		if( type == 'Quest' ){ continue; }		// 探索。ここからは内容的に飛ばすもの
		if( type == 'Research' ){ continue; }	// 調査。ここからは内容的に飛ばすもの
		if( type == 'Master' ){ continue; }		// マスターコイン。ここからは内容的に飛ばすもの

		if( start_main == 'undefined' ){ continue; }		// 前以て設定された復刻などは時間が指定できない
		if( end_main == 'undefined' ){ continue; }		// 前以て設定された復刻などは時間が指定できない

		name =  Name_Omission(type, name, value);

		flag = 0;

		// イベント側の開始と終了日時
		let [syear, smon, sday, shour, smin, ssec] = await Day_Resolve(start_main);
		let [eyear, emon, eday, ehour, emin, esec] = await Day_Resolve(end_main);

		let o_year, o_month, o_day, o_hour, o_min, o_sec;
		let c_year, c_month, c_day, c_hour, c_min, c_sec;


		[o_year, o_month, o_day, o_hour, o_min, o_sec] = cmd.Time_Get(true, "min", -35);	// 35分前と
		[c_year, c_month, c_day, c_hour, c_min, c_sec] = cmd.Time_Get(true, "min", -5);		// 5分前の間
		// クラバト終了後の処理
		if( flag == 0 && value == 900 && isWithinRangeDays([eyear, emon, eday, ehour, emin, esec], [o_year, o_month, o_day, o_hour, o_min, o_sec], [c_year, c_month, c_day, c_hour, c_min, c_sec]) ){
			flag = 1;
			file_write_flag = 1;
			DataAry[i] = `${type}\t${name}\t${start_main}\t${end_main}\t999`
			Event_List.push(`${name}\tSp0`);
		}

		[o_year, o_month, o_day, o_hour, o_min, o_sec] = cmd.Time_Get(true, "min", -5);	// -5分後と
		[c_year, c_month, c_day, c_hour, c_min, c_sec] = cmd.Time_Get(true, "min", 5);	// 5分後の間
		// 開始時間通知
		if( value <= 1 && isWithinRangeDays([syear, smon, sday, shour, smin, ssec], [o_year, o_month, o_day, o_hour, o_min, o_sec], [c_year, c_month, c_day, c_hour, c_min, c_sec]) ){
			flag = 1;
			file_write_flag = 1;
			let value_num = 99;
			if( start_main == end_main ){ value_num = 999; }
			DataAry[i] = `${type}\t${name}\t${start_main}\t${end_main}\t${value_num}`;
			Event_List.push(`${name}\tStart0`);
		}
		// 終了時間通知
		else if( start_main != end_main && isWithinRangeDays([eyear, emon, eday, ehour, emin, esec], [o_year, o_month, o_day, o_hour, o_min, o_sec], [c_year, c_month, c_day, c_hour, c_min, c_sec]) ){
			flag = 1;
			file_write_flag = 1;
			if( type == 'clan_battle' ){
				DataAry[i] = `${type}\t${name}\t${start_main}\t${end_main}\t900`
			}
			else{
				DataAry[i] = `${type}\t${name}\t${start_main}\t${end_main}\t999`
			}
			Event_List.push(`${name}\tEnd0`);
		}

		// 調べる日付、範囲の開始日時、範囲の終了日時
		[o_year, o_month, o_day, o_hour, o_min, o_sec] = cmd.Time_Get(true, "min", -5);	// 5分後と
		[c_year, c_month, c_day, c_hour, c_min, c_sec] = cmd.Time_Get(true, "min", 35);	// 35分後の間

		// 開始時間30分前通知
		if( flag == 0 && value == 0 && isWithinRangeDays([syear, smon, sday, shour, smin, ssec], [o_year, o_month, o_day, o_hour, o_min, o_sec], [c_year, c_month, c_day, c_hour, c_min, c_sec]) ){
			flag = 1;
			file_write_flag = 1;
			DataAry[i] = `${type}\t${name}\t${start_main}\t${end_main}\t1`;
			Event_List.push(`${name}\tStart30`);
		}
		// 終了時間30分前通知
		else if( flag == 0 && start_main != end_main && value < 100 && isWithinRangeDays([eyear, emon, eday, ehour, emin, esec], [o_year, o_month, o_day, o_hour, o_min, o_sec], [c_year, c_month, c_day, c_hour, c_min, c_sec]) ){
			flag = 1;
			file_write_flag = 1;
			DataAry[i] = `${type}\t${name}\t${start_main}\t${end_main}\t100`;
			Event_List.push(`${name}\tEnd30`);
		}
	}

	try{
		if( file_write_flag ){
			let data_text = '';
			for( let i = 0; i < DataAry.length; i++ ){
				data_text += DataAry[i] + "\n";
			}
			// 情報ファイル書き込み
			await cmd.Write_File(file, data_text);
		}
	}
	catch{
		console.log("fileファイルエラー")
	}

	return Event_List;
}

function Time_Check(eday, etime){

	if( eday == undefined || etime == undefined ){
		return false;
	}

	// 日付と時間取得
	let [year, month, day, hours, minutes, second] = cmd.Time_Get();

	let text = '';
	let year_text = '';		let month_text = '';	let day_text = '';
	let hour_text = '';		let min_text = '';		let sec_text = '';
	// 年が含まれている
	if( eday.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/) ){
		let Result_Data = eday.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
		year_text = Result_Data[1];
		month_text = Result_Data[2];
		day_text = Result_Data[3];
	}
	// 年が含まれていない場合は今の年を記録
	else if( eday.match(/(\d{1,2})\/(\d{1,2})/) ){
		let Result_Data = eday.match(/(\d{1,2})\/(\d{1,2})/);
		year_text = year;
		month_text = Result_Data[1];
		day_text = Result_Data[2];
	}
	else{
		consolelog(eday, etime)
		return false;
	}

	// 秒まで含まれている
	if( etime.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/) ){
		let Result_Data = etime.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);
		hour_text = Result_Data[1];
		min_text = Result_Data[2];
		sec_text = Result_Data[3];
	}
	// 分が含まれている
	else if( etime.match(/(\d{1,2}):(\d{1,2})/) ){
		let Result_Data = etime.match(/(\d{1,2}):(\d{1,2})/);
		hour_text = Result_Data[1];
		min_text = Result_Data[2];
		sec_text = '00';
	}
	// 分が含まれている
	else if( etime.match(/(\d{1,2})/) ){
		let Result_Data = etime.match(/(\d{1,2})/);
		hour_text = Result_Data[1];
		min_text = '00';
		sec_text = '00';
	}
	else{
		return false;
	}

	month_text = ( '00' + month_text ).slice( -2 );
	day_text = ( '00' + day_text ).slice( -2 );
	hour_text = ( '00' + hour_text ).slice( -2 );
	min_text = ( '00' + min_text ).slice( -2 );
	sec_text = ( '00' + sec_text ).slice( -2 );

	text = `${year_text}\/${month_text}\/${day_text} ${hour_text}:${min_text}:${sec_text}`;
	return text;

}

function Today_Infotext(text, last_text, end_text, type){
	let add_text = '';
	let Conjunction_Text = ["","それから","それと","あと"];
	let rand_no = getRandomInt(4)
	if( type != 0 ){
		add_text = Conjunction_Text[rand_no]
	}
	if( text ){
		if( text.slice(-1) == '、' ){ text = text.slice( 0, -1); }
		let main_text = `${add_text}${last_text}${text}${end_text}\n`;
		type = 1;
		return [main_text, type];
	}
	return ["", type];
}

function getRandomInt(max) {
	return Math.floor(Math.random() * max);
}

function Name_Omission(type, name, value){

	if( type == 'Normal' )		{ name = 'N';	}
	else if( type == 'Hard' )	{ name = 'H';	}
	else if( type == 'VHard' )	{ name = 'VH';	}
	else if( type == 'Quest' )	{ name = '探索';	}
	else if( type == 'Research' ){ name = '調査';	}
	else if( type == 'Dungeon' ){ name = 'ダンジョンマナ';	}
	else if( type == 'Master' )	{ name = 'マスターコイン';	}
	else if( type == 'clan_battle' ){ name = 'クランバトル';	}
	if( value >= 1000 ){
		let set_value = value / 1000;
		name += `${set_value}倍キャンペーン`
	}
	// SPダンジョンにvalueの2000ついてるから前の挙動を消すように修正
	if( type == 'SPDungeon' ){ name = 'SPダンジョン';	}

	name = name.replace("　", " ");	// 全角の空白を半角に
	name = name.replace("\\n", " ");	// 改行を空白に
	// ここからちょっと特殊
	if( name.match(/★3確定プラチナガチャ/) ){
		name = '★3確定プラチナガチャ';
	}
	else if( name.match(/限定キャラ復刻/) ){
		name = '復刻ガチャ';
	}
	else if( name.match(/「(.*?)」/) ){
		let Result = name.match(/「(.*?)」/g);
		let gacha_text = '';
		for( let i = 0; i < Result.length; i++ ){
			gacha_text += Result[i];
		}
		name = `${gacha_text}ピックアップガチャ`;
	}

	return name;
}


// 日付分解
function Day_Resolve(text){

	if( text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})/) ){
		let Day_Data = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})/);
		let year = Day_Data[1];
		let mon = Day_Data[2];
		let day = Day_Data[3];
		let hour = Day_Data[4];
		let min = Day_Data[5];
		let sec = Day_Data[6];
		return [year, mon, day, hour, min, sec];
	}
	else{
		console.log("err");
		return false;
	}
}


// クランバトル凸時間チェック
async function Charge_Research(guild_id){

	// ファイルを読み込む
	let battle_schedule = await cmd.Folder(guild_id);
	let data = '';
	let datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);

	// 日時情報、クラバトの日付と時間取得
	let [year, month, today, hours, minutes, second] = await cmd.Time_Get(true);
	today--;	// 昨日のことを知りたい

	let charge_count = 0;;
	let Charge_Hour = [];
	let DataAry = [];
	if( data != undefined ){
		DataAry = data.split('\n');
	}
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i=0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\/');
		let day = ValueAry[4];			// 凸日
		let charge_time = ValueAry[5];	// 凸時間

		if( day == today ){
			let Get_Time = charge_time.match(/(\d{1,2}):(\d{1,2})/)
			let hour = Get_Time[1];
			let hour_text = ( '00' + hour ).slice( -2 );
			if( Charge_Hour[hour_text] == undefined ){ Charge_Hour[hour_text] = 0; }
			Charge_Hour[hour_text]++;
			charge_count++;
		}
	}

	let text = '';
	for( let i = 0; i < 24; i++ ){
		let hour = i + 5;
		if( hour > 23 ){ hour -= 24; }
		let hour_text = ( '00' + hour ).slice( -2 );
		if( Charge_Hour[hour_text] > 0 ){
			let charge_count_text = '';
			for( let j = 0; j < Charge_Hour[hour_text]; j++ ){
				charge_count_text += '■';
			}
			text += `${hour_text}時[${charge_count_text}](${Charge_Hour[hour_text]})\n`;
		}
	}

	// 危険度
	datafile = battle_schedule + "\/" + 'danger.txt';
	data = await cmd.Read_File(datafile);

	let danger_text = '';
	let Danger_Boss = [0,0,0,0,0];
	if( data != undefined ){	DataAry = data.split('\n');	}
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		let ValueAry = DataAry[i].split('\t');
		let name = ValueAry[0];			// プレイヤーの名前
		let boss = ValueAry[1];			// ボスの名前
		let day = ValueAry[2];			// 凸日
		console.log(name);

		if( day == today ){
			console.log(boss);
			console.log(cmd.BOSS_NO[boss]);
			Danger_Boss[cmd.BOSS_NO[boss]]++;
		}
	}

	let danger_count = 0;
	for( let i = 0; i < Danger_Boss.length; i++ ){
		danger_count += Danger_Boss[i];
	}

	if( danger_count > 0 ){
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

		danger_text = `次はボスの危険度調査だよ！` + '```md\n';
		for( let i = 0; i < cmd.Boss_Name.length; i++ ){
			let charge_count_text = '';
			for( let j = 0; j < Danger_Boss[i]; j++ ){
				charge_count_text += '■';
			}
			danger_text += `${Boss_Name_Om[i]}`;
			if( Danger_Boss[i] == 0 ){
				danger_text += `[-]`;
			}
			else{
				danger_text += `[${charge_count_text}](${Danger_Boss[i]})`;
			}
			danger_text += `\n`;
		}
		danger_text += '```';
	}

	// embedを作成
	let exampleEmbed = new MessageEmbed()
		.setColor('#0099ff')
		.setTitle('お姉ちゃんの凸時間調査')
		.setDescription(`${year}年${month}月${today}日の時間調査だよ！　合計で${charge_count}回の挑戦があったみたいだね` + '```md\n' + text + '```' + danger_text)
		.setThumbnail(icon_url_main + "sister_thumbnail.png")
	return exampleEmbed;
}



// 日付を調べる
function isWithinRangeDays(targetDate, rangeStartDate, rangeEndDate) {
	var targetDateTime, rangeStartTime, rangeEndTime,
		startFlag = false,
		endFlag	 = false;
 
	if (!targetDate) return false;
 
	var isArray = function(targetObject) {
		return (Object.prototype.toString.call(targetObject) === '[object Array]') ? true : false;
	};
 
	// 日時をミリ秒で取得する関数
	var getDateTime = function(dateObj) {
		if (!dateObj) return;
 
		if (typeof dateObj.getTime !== 'undefined') {
			return dateObj.getTime();
		} else if (isArray(dateObj)) {
			if (dateObj.length === 3) {
				return new Date(dateObj[0], Number(dateObj[1]) - 1, dateObj[2]).getTime();
			} else {
				return new Date(dateObj[0], Number(dateObj[1]) - 1, dateObj[2], dateObj[3], dateObj[4], dateObj[5]).getTime();
			}
		}
 
		return;
	};
 
	targetDateTime = getDateTime(targetDate);
	rangeStartTime = getDateTime(rangeStartDate);
	rangeEndTime	 = getDateTime(rangeEndDate);
 
	if (!targetDateTime) return false;
 
	if (rangeStartDate) {
		if (rangeStartTime && targetDateTime >= rangeStartTime) {
			startFlag = true;
		}
	} else {
		startFlag = true;
	}
 
	if (rangeEndDate) {
		if (rangeEndTime && targetDateTime <= rangeEndTime) {
			endFlag = true;
		}
	} else {
		endFlag = true;
	}
 
	if (startFlag && endFlag) return true;
 
	return false;
};


module.exports = {
	Info_Update,
	Info_Text,
	Info_Write,
	Notice_Text,
	Charge_Research,
	Help_Text,
}
