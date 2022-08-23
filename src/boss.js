'use strict';

const cmd = require('./set');
const checkcmd = require('./check');
const procmd = require('./progress');

// ボスの名前関連
async function Main_Boss(msg, text, other_name, set_day){

	let [start_day, period, Level_List, BOSS_HP, Boss_Name, Boss_Icon, BOSS_NO] = await cmd.Setting();

	text = text.replace("　", " ");	// 全角スペースを半角に 
	text = text.replace(/ +/g, " ");	// 半角スペースが複数あったらひとつに
	text = text.replace(/\//g, "");	// スラッシュ削除

	// コマンドや名前などを算出
	let DataAry = text.split(/ /);
	let command = DataAry[0];			// boss_???など
	let name = DataAry[1];				// ボスの名前
	let DataAry_Sub = [];
	for( let i = 2; i < DataAry.length; i++ ){
		DataAry_Sub.push(DataAry[i]);	// 追加するニックネーム、あるいはID
	}
	console.log(command);

	let data = '';
	let datafile = '';

	// ボスファイルを読み込む
	data = '';
	datafile = msg.guildId + "\/" + 'boss_name.txt';
	data = await cmd.Read_File(datafile);

	DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除

	// あだ名を配列的に登録
	let ValueAry = [];
	let NAME = [];
	for( let i = 0; i < DataAry.length; i++ ){
		ValueAry = DataAry[i].split('\t');
		ValueAry = ValueAry.filter(Boolean);	// 空白削除
		let name_sub = ValueAry[0];
		NAME[name_sub] = name_sub;	// 連想配列的にニックネームから名前を算出
		for( let j = 1; j < ValueAry.length; j++ ){
			NAME[ValueAry[j]] = name_sub;	// 連想配列的にニックネームから名前を算出
		}
	}

	// 前処理
	let file_write_flag = 0;	// ファイル書き込み用のフラグ
	let name_flag = 0;			// 名前が存在しているかいないか

	// ボス登録周り
	if( command == 'boss_regist' ){
		let id = DataAry_Sub[0];	// ボスのID(1～5→0～4に)
		if( id == undefined || !(id.match(/^[1-5]{1}$/)) ){
			msg.reply(`弟くん、ボスNoは1から5で入力してね`);	
			return;
		}
		else{	id--;	}

		// 画像の名前情報を抜き取る
		let picture_name = '';
		for( let i = 0; i < DataAry_Sub.length; i++ ){
			if( DataAry_Sub[i].match(/\.[png|jpg]/i) ){
				picture_name = DataAry_Sub[i];
				DataAry_Sub.splice( i, 1 );	// pngデータを削除
				break;
			}
		}

		DataAry_Sub = DataAry_Sub.filter(Boolean);	// 空白削除
		if( DataAry_Sub.length > 1 && DataAry_Sub.length < Level_List.length + 1 ){	// ID以外にHPがない場合は1 HPが5個ある場合は6になる
			msg.reply(`弟くん、HPを入れる場合は${Level_List.length}個入れてね`);	
			return;
		}
		else if( DataAry_Sub.length > Level_List.length + 1 ){
			msg.reply(`弟くん、HPを入れる場合は${Level_List.length}個入れてね`);	
			return;
		}
		// HPを入力する場合
		if(  DataAry_Sub.length == Level_List.length + 1 ){
			for( let i = 1; i < DataAry_Sub.length; i++ ){
				if( DataAry_Sub[i].match(/[^0-9]/) ){
					msg.reply(`弟くん、HPを入れる時は数字だけにしてほしいな`);	
					return;
				}
			}
		}

		let [year, month, day, hours, minutes, second] = cmd.Time_Get();
		month = ( '00' + month ).slice( -2 );
		let common_data = "common_data" + "\/" + year + month;

		// ボスファイルを読み込む
		let boss_file = common_data + "\/" + 'boss.txt';
		data = await cmd.Read_File(boss_file);

		let BossAry = data.split('\n');
		BossAry = BossAry.filter(Boolean);	// 空白削除

		ValueAry = BossAry[id].split('\t');
		ValueAry = ValueAry.filter(Boolean);	// 空白削除
		let hp_text = '';
		// HPを入力する場合
		if(  DataAry_Sub.length == Level_List.length + 1 ){
			hp_text = 'HPも';
			BossAry[id] = `${name}\t`;			// ボスの名前を変更する
			if( picture_name ){	ValueAry[1] = picture_name;	}	// 画像を変える場合
			BossAry[id] += `${ValueAry[1]}\t`;	// URL
			for( let i = 1; i < DataAry_Sub.length; i++ ){
				BossAry[id] += `${DataAry_Sub[i]}\t`;	// ボスHPを変更する
				hp_text += `${i}段階目[${DataAry_Sub[i]}]`;
			}
			hp_text += `で設定したからね`;
		}
		// 名前変更だけの場合
		else{
			BossAry[id] = BossAry[id].replace( ValueAry[0], name);	// ボスの名前を変更する
			if( picture_name ){
				BossAry[id] = BossAry[id].replace( ValueAry[1], picture_name);	// 画像の名前を変える
			}
		}

		// 念のため元となる名前や番号を変えておく
		cmd.Boss_Name[id] = name;
		cmd.BOSS_NO[ValueAry[0]] = undefined;
		cmd.BOSS_NO[name] = id;

		let boss_text = '';
		BossAry = BossAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < BossAry.length; i++ ){
			boss_text += BossAry[i] + "\n";
		}

		// ボスファイル書き込み
		await cmd.Write_File(boss_file, boss_text);

		let id2 = id + 1;
		msg.reply(`弟くん、${id2}番目に${name}って名前のボスを入力したよ！${hp_text}`);


		// 予約簡易入力でメッセージIDがあったら該当の名前を変える
		let battle_schedule = cmd.Folder(msg.guildId);
		battle_schedule = battle_schedule.slice( 0, -7 );
		datafile = battle_schedule + "\/" + 'mark_msg_id.txt';
		data = await cmd.Read_File(datafile);

		DataAry = data.split('\n');
		DataAry = DataAry.filter(Boolean);	// 空白削除
		// メッセージIDが存在
		if( DataAry[id] ){
			// 簡易予約チャンネルを検索
			let channel_id = await checkcmd.Channel_Search(msg.guildId, "reserve");
			if( channel_id == false ){	console.log("チャンネル非存在");	return;	}
 			const m = await msg.guild.channels.cache.get(channel_id).messages.fetch(DataAry[id])
			if( m ){
				await m.edit("■" + name);
			}
		}
	}
	// メンバーの討伐ボス周り
	else if( command == 'boss_kill' ){
		await Boss_Kill(msg, text, set_day);
	}
	// ニックネーム関連
	else{
		let boss_text = '';		// メッセージ用のボス全体テキスト
		let nickname_text = '';	// メッセージ用のテキスト
		let nickname_flag = 0;	// ニックネームが存在しているかいないか
		let NickNameList = [];	// 保持しておくニックネームのリスト
		for( let i = 0; i < DataAry.length; i++ ){
			ValueAry = DataAry[i].split('\t');
			ValueAry = ValueAry.filter(Boolean);	// 空白削除
			
			let main_name = ValueAry[0];
			// 全体表示用テキスト
			boss_text += `${ValueAry[0]} `;
			for( let j = 1; j < ValueAry.length; j++ ){
				boss_text += `${ValueAry[j]} `;
			}
			if( boss_text.slice(-1) == ' ' ){ boss_text = boss_text.slice( 0, -1); }
			boss_text += `\n`;

			if( NAME[name] == ValueAry[0] ){	// 名前あるいはあだ名が存在
				name_flag = 1;					// 名前が存在している
				// ニックネーム表示の場合
				if( command == 'boss' ){
					for( let j = 1; j < ValueAry.length; j++ ){
						nickname_flag = 1;
						nickname_text += `${ValueAry[j]}と`;
					}
					// ニックネームがある
					if( nickname_flag ){
						nickname_text = nickname_text.slice(0, -1);
						msg.reply(`弟くん、${main_name}には${nickname_text}のニックネームがあるよ`);
					}
					// ニックネームがない
					else{
						msg.reply(`弟くん、${main_name}にニックネームはないみたいだよ`);
					}
				}
				// ニックネーム追加の場合
				else if( command == 'boss_add' ){
					for( let j = 0; j < DataAry_Sub.length; j++ ){
						nickname_flag = 0;
						if( NAME[DataAry_Sub[j]] ){	// ニックネームが存在
							nickname_flag = 1;		// 追加しないフラグを立てる
						}
						else if( DataAry_Sub[j].length > ValueAry[0].length ){	// 元の名前より長い
							nickname_flag = 2;		// 追加しないフラグを立てる
						}
						if( nickname_flag == 0 ){	// 追加しないフラグが立ってなかったら
							NickNameList.push(DataAry_Sub[j]);
						}
					}
					// 新たに追加するニックネームをまとめておく
					for( let j = 0; j < NickNameList.length; j++ ){
						nickname_text += `${NickNameList[j]}と`;
						DataAry[i] += `\t${NickNameList[j]}`;
					}
					// ニックネーム追加
					if( NickNameList.length ){
						file_write_flag = 1;
						nickname_text = nickname_text.slice(0, -1);
						msg.reply(`弟くん、${main_name}に${nickname_text}のニックネームを追加したよ`);
					}
					// ニックネーム追加できなかった
					else{
						if( nickname_flag == 1 ){
							msg.reply(`弟くん、被ってて${main_name}にニックネームを追加できなかったよ……`);
						}
						else if( nickname_flag == 2 ){
							msg.reply(`弟くん、元より長くて${main_name}にニックネームを追加できなかったよ……`);
						}
					}
				}
				// ニックネーム削除
				else if( command == 'boss_del' ){
					for( let j = 0; j < DataAry_Sub.length; j++ ){
						nickname_flag = 0;
						if( NAME[DataAry_Sub[j]] ){	// ニックネームが存在
							nickname_flag = 1;		// 削除するフラグを立てる
						}
						if( nickname_flag == 1 ){	// 削除するフラグが立っていたら
							NickNameList.push(DataAry_Sub[j]);	// 削除するニックネームをリスト化する
						}
					}
					// 削除するニックネームをまとめたり、削除処理
					for( let j = 0; j < NickNameList.length; j++ ){
						nickname_text += `${NickNameList[j]}と`;
						DataAry[i] = DataAry[i].replace(`\t${NickNameList[j]}`, '');	// そのニックネームを削除する
					}
					// ニックネーム削除
					if( NickNameList.length ){
						file_write_flag = 1;
						nickname_text = nickname_text.slice(0, -1);
						msg.reply(`弟くん、${main_name}から${nickname_text}のニックネームを削除したよ`);
					}
					// ニックネーム削除できなかった
					else{
						msg.reply(`弟くん、${main_name}のニックネームを削除できなかったよ……`);
					}
				}
				// ひとつでも見つけたら止める
				break;
			}
		}
		// ニックネーム表示の場合＆ボス名の指定なし
		if( command == 'boss' && name == undefined ){
			if( boss_text ){
				msg.reply(`弟くん、これがボスのニックネーム一覧だよ\n` + "```" + boss_text + "```");
				return;
			}
			else{
				msg.reply(`弟くん、まだボスが登録されてないんじゃないかな`);
				return;
			}
		}
		// 名前が存在しない
		else if( command == 'boss_add' && name_flag == 0 ){
			file_write_flag = 1;
			let add_nickname_text = '';
			let nickname_text = '';
			for( let j = 0; j < DataAry_Sub.length; j++ ){
				NickNameList.push(DataAry_Sub[j]);	// 追加するニックネームをリスト化する
			}
			// 新たに追加するニックネームをまとめておく
			for( let j = 0; j < NickNameList.length; j++ ){
				add_nickname_text += `${NickNameList[j]}\t`;
				nickname_text += `${NickNameList[j]}と`;
			}
			// ニックネーム削除
			if( NickNameList.length ){
				nickname_text = nickname_text.slice(0, -1);
			}
			// 新たにリストに追加
			DataAry.push(`${name}\t${add_nickname_text}`)
			msg.reply(`弟くん、${name}って名前のボスとそのニックネームに${nickname_text}を追加したよ`);
			//msg.reply(`弟くん、その名前のボスが見当たらないよ`);
			//return;
		}
		// 名前が存在しない
		else if( command == 'boss_del' && name_flag == 0 ){
			msg.reply(`弟くん、その名前のボスが見当たらないよ`);
			return;
		}
	}

	if( file_write_flag ){	// 書き換えフラグが立っていたら
		let data_text = '';
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < DataAry.length; i++ ){
			data_text += DataAry[i] + "\n";
		}

		// メンバーファイル記入
		datafile = msg.guildId + "\/" + 'boss_name.txt';
		await cmd.Write_File(datafile, data_text);
	}

	return;
}

// ボスの名前からボス番号を返す
async function Boss_Search(msg, boss_name){

	boss_name = hiraToKana(boss_name);	// ひらがなをカタカナに変換

	// 数字で来た場合は減算して返せばよい
	if( boss_name.match(/^[1-5]{1}$/) ){
		boss_name--;		// 表面上1-5 内面0-4
		return boss_name;	// ボス番号を返す
	}
	// 本来の名前で来た場合
	else if( cmd.BOSS_NO[boss_name] >= 0 ){
		return cmd.BOSS_NO[boss_name];	// ボス番号を返す
	}
	// 別の名前で来た場合
	else{
		// ボスファイルを読み込む
		let data = '';
		let datafile = msg.guildId + "\/" + 'boss_name.txt';
		data = await cmd.Read_File(datafile);

		let DataAry = [];
		if( data != undefined ){	DataAry = data.split('\n');	}
		DataAry = DataAry.filter(Boolean);	// 空白削除

		// あだ名も含めて検索
		let name = '';	// ボスのメインの名前が入る
		let ValueAry = [];
		for( let i = 0; i < DataAry.length; i++ ){
			ValueAry = DataAry[i].split('\t');
			ValueAry = ValueAry.filter(Boolean);		// 空白削除
			ValueAry.push( ValueAry[0].slice(0, 2) );	// 頭の２文字でもOKにする（ライデンライライなどはマズいかもなぁ…）
			if( ValueAry.includes(boss_name) ){		// あだ名の中にあるか捜索→発見
				if( cmd.BOSS_NO[ValueAry[0]] >= 0 ){		// メインの名前を使うため[0]を使用 boss_nameは入力されたあだ名かもしれない
					boss_name = cmd.BOSS_NO[ValueAry[0]];	// 本来の名前からボス番号を取得
					return boss_name;	// ボス番号を返す
				}
			}
		}
	}
	return -1;			// 見つからなかった場合
}


// 討伐ボス一覧表示
async function Boss_Kill(msg, other_name, set_day){

	let [user_id, user_name] = cmd.Set_Id(msg);

	let set_year = '';	let set_mon = '';
	let [year, month, day, hours, minutes, second] = cmd.Time_Get();
	month = ( '00' + month ).slice( -2 );

	set_year = year;
	set_mon = month;
	if( set_day != undefined && set_day.length >= 6 ){
		set_year = set_day.slice(0, 4) * 1;
		set_mon = set_day.slice(4, 6) * 1;
	}

	// クランメンバーか
	let check = await checkcmd.Member_Check(msg, user_id, other_name);
	if( check == true ){ return; }
	let attack_name = check;

	// ボスファイルを読み込む
	let common_data = "common_data" + "\/" + set_year + set_mon;
	let file = common_data + "\/" + 'boss.txt';

	let data = await cmd.Read_File(file);
	let BossAry;	let DataAry;
	if( data != '' ){
		DataAry = data.split('\n');
		DataAry = DataAry.filter(Boolean);			// 空白削除
	}
	let Boss_Name = new Array;
	for( let i=0; i < DataAry.length; i++ ){
		BossAry = DataAry[i].split('\t');
		Boss_Name[i] = BossAry[0];
	}

	let battle_schedule = cmd.Folder(msg.guildId);
	if( set_day != undefined && set_day.length >= 6){
		let set_year = set_day.slice(0, 4) * 1;
		let set_mon = set_day.slice(4, 6) * 1;
		battle_schedule = `${msg.guildId}\/${set_year}${set_mon}`;
	}

	data = '';
	let datafile = battle_schedule + "\/" + 'progress.txt';
	data = await cmd.Read_File(datafile);
	if( data != '' ){
		DataAry = data.split('\n');
		DataAry = DataAry.filter(Boolean);			// 空白削除
	}

	let boss_kill_text = '';
	for( let i = 0; i < DataAry.length; i++ ){
		let [name, damage, over, value_time, day, charge_time, boss_counter, attack_turn] = DataAry[i].split('\/');
		if( attack_name == name ){
			boss_kill_text += `${day}日 `;
			boss_kill_text += `${Boss_Name[boss_counter]}`;
			if( value_time != '' ){	// 討伐
				boss_kill_text += `⚔`;
			}
			boss_kill_text += `\(${damage}\)`;
			boss_kill_text += `\n`;
		}
	}

	console.log("討伐ボス表示");
	let other_text = '';
	if( other_name ){  other_text = "弟くん、" + other_name + "さんの"; }
	else{ other_text = "弟くんの"; }

	if( set_day != undefined && set_day.length >= 6){
		let set_year = set_day.slice(0, 4) * 1;
		let set_mon = set_day.slice(4, 6) * 1;
		other_text += set_year + "年" + set_mon + "月の";
	}
	else if( set_day ){  other_text += set_day + "日の"; }
	else{               other_text += "今月の"; }

	if( boss_kill_text == '' ){
		await msg.reply(`${other_text}討伐ボスはいなかったよ`);
	}
	else{
		await msg.reply(`${other_text}討伐ボス一覧だよ` + "```md\n" + boss_kill_text + "```");
	}
}

// ひらがな→カタカナ
function hiraToKana(str) {
    return str.replace(/[\u3041-\u3096]/g, function(match) {
        let chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
}


module.exports = {
	Main_Boss,
	Boss_Kill,
	Boss_Search,
}

