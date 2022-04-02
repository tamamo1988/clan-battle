'use strict';

const cmd = require('./set');

// メンバーチェック
async function Member_Check(msg, user_id, other_name){

	let attack_name = user_id;		// メンバーID

	if( other_name == undefined ){	other_name = '';	}

	let battle_schedule = await cmd.Folder(msg.guildId);
	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'member.txt';
	data = await cmd.Read_File(datafile);
	
	let MemberAry;
	let return_name = '';
	let main_name;
	let main_id;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i=0; i < DataAry.length; i++ ){
		MemberAry = DataAry[i].split('\t');
		main_name = MemberAry[0];
		if( other_name && other_name == main_name ){	// 代理で名前が見つかった
			return_name = main_name;
			break;
		}
		main_id = MemberAry[1];
		if( other_name == '' && attack_name == main_id ){	// 代理じゃなくIDが見つかった
			return_name = main_name;
			break;
		}
		for( let j = 2; j < MemberAry.length; j++ ){	// 代理であだ名が見つかった
			if( other_name == MemberAry[j] ){
				return_name = main_name;
				break;
			}
		}
	}
	// 見つからなかった
	if( !return_name ){
		if( other_name ){
			msg.reply("……その人は弟くんじゃない")
			.then(async function (msg) {
				setTimeout( async function(){
					msg.delete()
						.then(msg => console.log(`Deleted message from ${msg}`))
						.catch(console.error);
				}, 5000);	})
			.catch(function() {		console.log("リプライエラー")	});
		}
		else{
			msg.reply("……君、弟くんじゃないね？")
			.then(async function (msg) {
				setTimeout( async function(){
					msg.delete()
						.then(msg => console.log(`Deleted message from ${msg}`))
						.catch(console.error);
			}, 5000);	})
			.catch(function() {		console.log("リプライエラー")	});
		}
		return true;
	}
	return return_name;
}

async function Day_Check(msg){

	let [year, month, day, hours, minutes, second] = await cmd.Time_Get();

	let start_day = cmd.start_day;
	let period_day = cmd.period;

	if( start_day == '' || start_day == undefined ){
		msg.reply("弟くん、まだクランバトルの開始日が設定されてないよ！")
		.then(async function (msg) {
			setTimeout( async function(){
				msg.delete()
					.then(msg => console.log(`Deleted message from ${msg}`))
					.catch(console.error);
		}, 5000);	})
		.catch(function() {		console.log("リプライエラー")	});
		return true;
	}
	else if( day == start_day + period_day - 1 && hours >= 0 && hours < 5 ){
		msg.reply("弟くん、もうクランバトル終わったよ！")
		.then(async function (msg) {
			setTimeout( async function(){
				msg.delete()
					.then(msg => console.log(`Deleted message from ${msg}`))
					.catch(console.error);
		}, 5000);	})
		.catch(function() {		console.log("リプライエラー")	});
		return true;
	}
	else if( day < start_day ){
		msg.reply("弟くん、まだクランバトル始まってないよ！")
		.then(async function (msg) {
			setTimeout( async function(){
				msg.delete()
					.then(msg => console.log(`Deleted message from ${msg}`))
					.catch(console.error);
		}, 5000);	})
		.catch(function() {		console.log("リプライエラー")	});
		return true;
	}
	else if( day >= start_day + period_day ){
		msg.reply("弟くん、もうクランバトル終わったよ！")
		.then(async function (msg) {
			setTimeout( async function(){
				msg.delete()
					.then(msg => console.log(`Deleted message from ${msg}`))
					.catch(console.error);
		}, 5000);	})
		.catch(function() {		console.log("リプライエラー")	});
		return true;
	}
	else if( day >= start_day && day < start_day + period_day ){
		// 正しい日付
		return false;
	}
	else{
		msg.reply(`何か異常が出たみたい…`)
		.then(async function (msg) {
			setTimeout( async function(){
				msg.delete()
					.then(msg => console.log(`Deleted message from ${msg}`))
					.catch(console.error);
		}, 5000);	})
		.catch(function() {		console.log("リプライエラー")	});
		return true;
	}
}

function Time_Check(time_text){

	let text = '';

	if( !time_text.match(/(\d{1}):(\d{2})/) ){
		text = `弟くん、時間は正しく書いてね？`;
	}
	else{
		let Value = time_text.match(/(\d{1}):(\d{2})/);
		let minutes = Value[1];
		let sec = Value[2];
		if( minutes > 1 ){
			text = `弟くん、1分30秒を超えて${minutes}分は設定はできないよ`;
		}
		else if( minutes == 1 && sec > 30 ){
			text = `弟くん、1分30秒を超えた設定はできないよ`;
		}
		else if( sec > 59 ){
			text = `弟くん、60を超えた秒数は設定できないから1分にしてね`;
		}
		else if( minutes == 0 && sec < 20 ){
			text = `弟くん、持ち越し時間は20秒未満にはならないよ`;
		}
	}
	return text;
}

// 各ボスの残りHP及び討伐数
function Progress_Player(data, attack_name, target_day){

	// 日付と時間取得
	let [year, month, day, hours, minutes, second] = cmd.Time_Get();

	if( target_day == undefined ){
		//console.log("日指定" + target_day);
		target_day = day;
	}
	else{
	}

	let Charge_Flag = [0,0,0,0];
	let DataAry = [];
	if( data != undefined ){
		DataAry = data.split('\n');
		for( let i=0; i < DataAry.length - 1; i++ ){
			let ValueAry = DataAry[i].split('\/');
			let name = ValueAry[0];			// メンバーの名前
			let over = ValueAry[2];			// 持ち越しなら1
			let value_time = ValueAry[3];	// 持ち越し時間
			let day = ValueAry[4];			// 凸日
			let attack_turn = ValueAry[7];	// 凸番号

			// 名前と日付が同じ
			if( name == attack_name && target_day == day ){
				if( value_time != '' && value_time != '×' ){	// 討伐して残っている
					Charge_Flag[attack_turn] = 1;
				}
				else if( over ){	// 持ち越しで殴った
					Charge_Flag[attack_turn] = 2;
					Charge_Flag[0]++;	// 凸回数
				}
				else{				// ダメージを与えたのみ
					Charge_Flag[attack_turn] = 2;
					Charge_Flag[0]++;	// 凸回数
				}
			}
		}
	}
	return Charge_Flag;
}

// 今、プレイヤーが戦闘中か否か
async function Battle_Check(msg, attack_name){

	let battle_schedule = cmd.Folder(msg.guildId);

	// ファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'battle.txt';
	data = await cmd.Read_File(datafile);

	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除

	let attack_boss = '';	// ボス名変数
	let attack_turn = 0;	// 凸番号変数
	let BattleAry;
	DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		BattleAry = DataAry[i].split('\t');
		if( attack_name == BattleAry[0] ){	// 名前を発見
			attack_boss = cmd.BOSS_NO[BattleAry[1]];	// ボス名を入れる
			attack_turn = BattleAry[2];		// 凸番号を入れる
			break; 
		}
	}
	return [attack_boss, attack_turn];
}

// チャンネルを探す
async function Channel_Search(guildId, order){

	// ファイルを読み込む
	let data = '';
	let datafile = "common_data\/" + 'channel_id.txt';
	data = await cmd.Read_File(datafile);

	let ValueAry;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		ValueAry = DataAry[i].split('\t');
		let name = ValueAry[0];			// チャンネルタイプ名
		let guild_id = ValueAry[1];		// ギルドID
		let channel_id = ValueAry[2];	// チャンネルID
		if( guildId == guild_id ){
			// 指定された名前のチャンネルのIDを返す
			if( order != '' && order == name ){	// 名前を発見
				return channel_id;
			}
		}
	}
	return false;
}

// 入力可能なチャンネルか？
async function Channel_Check(msg){

	// ファイルを読み込む
	let data = '';
	let datafile = "common_data\/" + 'channel_id.txt';
	data = await cmd.Read_File(datafile);
	//console.log("info:" + data);

	let ValueAry;
	let DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		ValueAry = DataAry[i].split('\t');
		let name = ValueAry[0];			// チャンネルタイプ名
		let guild_id = ValueAry[1];		// ギルドID
		let channel_id = ValueAry[2];	// チャンネルID
		console.log(name, guild_id, channel_id);
		if( msg.guildId == guild_id ){
			// このチャンネルが入力可能なものであることを返す
			if( msg.channel.id == channel_id && name == 'command' ){
				console.log("Channel OK!")
				return true;
			}
		}
	}
	console.log("Channel NG...")
	return false;
}

function Other_Name_Check(msg, text){

	let others_name;	// 別名が入る
	let regexp;			// 消去用
	if( text.match(/＠(.*)＠/) ){
		others_name = text.match(/＠(.*)＠/);
		regexp = new RegExp("＠" + others_name[1] + "＠", 'g');
	}
	else if( text.match(/「(.*)」/) ){
		others_name = text.match(/「(.*)」/);
		regexp = new RegExp("「" + others_name[1] + "」", 'g');
	}
	else if( text.match(/｢(.*)｣/) ){
		others_name = text.match(/｢(.*)｣/);
		regexp = new RegExp("｢" + others_name[1] + "｣", 'g');
	}
	else if( text.match(/<(.*)>/) ){
		others_name = text.match(/<(.*)>/);
		regexp = new RegExp("<" + others_name[1] + ">", 'g');
	}
	else if( text.match(/\-(.*)\-/) ){
		others_name = text.match(/\-(.*)\-/);
		regexp = new RegExp("\-" + others_name[1] + "\-", 'g');
	}

	if( others_name ){
		let others_text = text.replace( regexp, "");		// 消去されたテキストを返す
		return others_name[1];
	}
	else if( text.match(/\-/) || text.match(/＠/) ||text.match(/「/) || text.match(/」/) ||
		text.match(/｢/) || text.match(/｣/) || text.match(/</) || text.match(/>/) ){
		msg.reply("弟くん！　名前を記号で囲んでないんじゃないかな？");
		return -1;
	}
	else{
		return;
	}
}

module.exports = {
	Member_Check,
	Day_Check,
	Time_Check,
	Battle_Check,
	Channel_Search,
	Channel_Check,
	Progress_Player,
	Other_Name_Check
}
