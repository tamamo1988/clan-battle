'use strict';

const fs = require('fs');
const request = require('request-promise');

require('dotenv').config();
const server_url = process.env.SERVER_URL;
const server_user = process.env.SERVER_USER;
const server_pass = process.env.SERVER_PASS;

// 疑似wait
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 共通データのフォルダ指定＆今日の日付指定
let [year, month, day, hours, minutes, second] = Time_Get();
month = ( '00' + month ).slice( -2 );
let common_data = "common_data" + "\/" + year + month;

exports.today = day;
if( hours >= 0 && hours < 5 ){	// 0時～5時なら前日の日付扱い
	exports.today--;
}

// ---------- ファイル読み込み初期設定 ----------

let data = '';
let file = '';
let DataAry = new Array;

// ---------- 開始日及び周回数と段階進行リスト ----------
let start_day = [];
let period = [];
let Level_List = new Array();

file = common_data + "\/" + 'day.txt';
(async () => {
	try {
		data = await Read_File(file);
		let ValAry;
		if( data != '' ){
			DataAry = data.split("\n");
		}

		DataAry = DataAry.filter(Boolean);	// 空白削除
		ValAry = DataAry[0].split('\t');	// 周回数と段階進行リスト
		start_day[0] = ValAry[0] * 1;		// 開始日
		period[0] = ValAry[1] * 1;			// 開催日数
		ValAry = DataAry[1].split('\t');	// 周回数と段階進行リスト
		ValAry = ValAry.filter(Boolean);	// 空白削除
		for( let j = 0; j < ValAry.length; j++ ){
			Level_List[j] = ValAry[j];
		}
	} catch (e) {
		// Deal with the fact the chain failed
		console.log(e)
		console.log("day error")
	}
})();
exports.start_day = start_day;
exports.period = period;

data = '';

// ---------- ボスの名前及びボスのHPの初期設定 ----------
let BOSS_HP = new Array();		// ボスの各段階HP
let Boss_Name = new Array();	// ボスの名前
let Boss_Icon = new Array();	// ボスの名前
let BOSS_NO = new Array();		// ボスの番号（名前から連想）

file = common_data + "\/" + 'boss.txt';
(async () => {
	try {
		data = await Read_File(file);
		let BossAry;
		if( data != '' ){
			DataAry = data.split('\n');
		}

		DataAry = DataAry.filter(Boolean);			// 空白削除
		for( let i=0; i < DataAry.length; i++ ){
			BossAry = DataAry[i].split('\t');
			Boss_Name[i] = BossAry[0];
			Boss_Icon[i] = BossAry[1];
			BOSS_NO[BossAry[0]] = i;	// No逆算
			for( let j = 1; j < BossAry.length - 1; j++ ){
				let j2 = j - 1;
				let hash_key = "boss" + i + "_" + j2;
				BOSS_HP[hash_key] = BossAry[j];
			}
		}
	} catch (e) {
		console.log("boss error")
			// Deal with the fact the chain failed
	}
})();
exports.Boss_Name = Boss_Name;
exports.BOSS_NO = BOSS_NO;
exports.Boss_HP = Boss_HP;
data = '';


// ---------- 以降、関数とその他 ----------

let BUTTON_FLAG = [];						// 選択肢のフラグ

// 呼び鈴＆初期化を使える人
const master = {
"361143557915934722" : 1,
"595978283661656070" : 1 };


// 初期化
async function Init_Data(msg){

	let file = '';
	let battle_schedule = Folder(msg.guildId);

	// 戦闘中データ初期化
	file = battle_schedule + "\/" + 'battle.txt';
	await Write_File(file, '');

	// 優先データ初期化
	file = battle_schedule + "\/" + 'priority.txt';
	await Write_File(file, '');

	// 予約データ初期化
	file = battle_schedule + "\/" + 'reserve.txt';
	await Write_File(file, '');

	// タスキルデータ初期化
	file = battle_schedule + "\/" + 'taskkill.txt';
	await Write_File(file, '');

	// 残凸MSGIDデータ初期化
	file = battle_schedule + "\/" + 'now_message.txt';
	await Write_File(file, '');

	// 進行データ初期化
	file = battle_schedule + "\/" + 'progress.txt';
	await Write_File(file, '');

	//console.log(msg.type);
	if( msg.type != 'APPLICATION_COMMAND' ){
		//msg.reply("お姉ちゃん、今月のクランバトルデータを初期化したよ")
		await msg.guild.channels.cache.get(msg.channelId).send("お姉ちゃん、今月のクランバトルデータを初期化したよ");
	}

}

// 開催日と開催期間設定
async function Start_Func(msg, text){

	text = text.replace("　", " ");	// 全角スペースを半角に
	text = text.replace(/ +/g, " ");	// 半角スペースが複数あったらひとつに
	text = text.replace(/\//g, "");	// スラッシュ削除

	// 共通データのフォルダ指定＆今日の日付指定
	let [year, month] = await Time_Get();
	month = ( '00' + month ).slice( -2 );
	let common_data = "common_data" + "\/" + year + month;

	let file_write_flag = 0;

	// コマンドや名前などを算出
	let DataAry = text.split(/ /);
	let command = DataAry[0];
	let day = DataAry[1];
	let in_period = DataAry[2];
	console.log(command);

	// ---------- 開始日及び周回数と段階進行リスト ----------
	file = common_data + "\/" + 'day.txt';
	data = await Read_File(file);

	data = data.replace(/\r/g, '');
	DataAry = data.split("\n");
	DataAry = DataAry.filter(Boolean);			// 空白削除
	let ValAry;
	let start_day = 0;				// 開始日
	let period = 0;					// 開催日数

	if( data ){
		ValAry = DataAry[0].split("\t");			// 1行目を選択
		start_day = ValAry[0] * 1;				// 開始日
		period = ValAry[1] * 1;					// 開催日数
	}

	// 日付が入力されていない、あるいは数字じゃない
	if( day == undefined || !(day.match(/^[\d]{1,2}$/)) ){
		msg.reply(`弟くん、クランバトルは${start_day}日から${period}日間だよ`);	
		return;
	}
	else if( in_period != undefined && !(in_period.match(/^[\d]{1,2}$/)) ){
		msg.reply(`弟くん、開催日数は数字で入力してね`);	
		return;
	}
	// 開催日数も入っている
	else if( day != '' && in_period != undefined ){
		file_write_flag = 1;
		exports.start_day = day;
		DataAry[0] = `${day}\t${in_period}\t`;
		msg.reply(`お姉ちゃん、クランバトルを${day}日から${in_period}日間に設定したよ`);	
	}
	// 日付のみ
	else{
		file_write_flag = 1;
		exports.start_day = day;
		DataAry[0] = `${day}\t${period}\t`;
		msg.reply(`お姉ちゃん、クランバトルの開始日を${day}日からに設定したよ！`);	
	}

	if( file_write_flag ){	// 書き換えフラグが立っていたら

		let battle_schedule = "common_data" + "\/" + year + month;

		// ディレクトリを親ごと作成する
		/*fs.mkdirSync( battle_schedule, { recursive: true }, (err) => {
				if (err) throw err;
		});*/

		let data_text = '';
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < DataAry.length; i++ ){
			data_text += DataAry[i] + "\n";
		}

		// 日付ファイル書き込み
		await Write_File(file, data_text);

		return day;
	}
	return;
}


// 段階とその開始周回数
async function Level_Func(msg, text){

	text = text.replace("　", " ");	// 全角スペースを半角に
	text = text.replace(/ +/g, " ");	// 半角スペースが複数あったらひとつに
	text = text.replace(/\//g, "");	// スラッシュ削除

	// 共通データのフォルダ指定＆今日の日付指定
	let [year, month] = Time_Get();
	month = ( '00' + month ).slice( -2 );
	let common_data = "common_data" + "\/" + year + month;

	let file_write_flag = 0;

	// コマンドや名前などを算出
	let DataAry = text.split(/ /);
	let command = DataAry[0];
	console.log(command);

	// 段階が進む周回数の取得
	if( DataAry.length <= 1 ){
		msg.reply(`弟くん、周回数をちゃんと入れてね！`);	
		return;
	}
	let level_data = '';
	let level_text = '';
	for( let i = 1; i < DataAry.length; i++ ){
		if( !(DataAry[i].match(/^[\d]{1,2}$/)) ){
			msg.reply(`弟くん、周回数は数字で入力してね！`);	
		}
		let i2 = i + 1;
		level_text += `第${i2}段階[${DataAry[i]}周目]`;
		level_data += DataAry[i] + "\t";
	}

	file_write_flag = 1;
	for( let i = 1; i < DataAry.length; i++ ){
		Level_List[i - 1] = DataAry[i];
	}
	Level_List[DataAry.length - 1] = '9999';

	// ---------- 開始日及び周回数と段階進行リスト ----------
	file = common_data + "\/" + 'day.txt';
	data = await Read_File(file);

	data = data.replace(/\r/g, '');
	DataAry = data.split("\n");
	DataAry = DataAry.filter(Boolean);			// 空白削除

	DataAry[1] = level_data + "9999\t";

	exports.Level_List = Level_List;

	msg.reply(`お姉ちゃん、段階の進行を${level_text}で設定したよ`);	

	if( file_write_flag ){	// 書き換えフラグが立っていたら
		let data_text = '';
		DataAry = DataAry.filter(Boolean);	// 空白削除
		for( let i = 0; i < DataAry.length; i++ ){
			data_text += DataAry[i] + "\n";
		}

		await Write_File(file, data_text);

		return day;
	}
	return;
}


// クラバト用チャンネル設定
async function Set_Channel(msg){

	let Channel_Type = ['info','command','status','reserve']
	let Channel_Text = ['情報用','コマンド入力用','残凸情報','簡易予約入力']

	msg.content = msg.content.replace("　", " ");	// 全角スペースを半角に
	msg.content = msg.content.replace(/ +/g, " ");	// 半角スペースが複数あったらひとつに
	msg.content = msg.content.replace(/\//g, "");	// スラッシュ削除

	// 共通データのフォルダ指定＆今日の日付指定
	let [year, month] = Time_Get();
	month = ( '00' + month ).slice( -2 );
	let common_data = "common_data";

	// コマンドなどを算出
	let DataAry = msg.content.split(/ /);
	let command = DataAry[0];
	let type = DataAry[1];		// progressとかcommandとかstatustとかreserveが入る
	console.log(command);

	// チャンネルIDが存在しているか
	if( Channel_Type.includes(type) == false ){
		msg.reply(`弟くん、その${type}は登録できないよ`)
		return;
	}

	// ---------- チャンネルID ----------
	let data = '';
	let file = common_data + "\/" + 'channel_id.txt';
	data = await Read_File(file);

	data = data.replace(/\r/g, '');
	DataAry = data.split("\n");
	DataAry = DataAry.filter(Boolean);			// 空白削除

	let channel_search_flag = 0;	// 設定したチャンネルが存在していたか
	let ValueAry;
	DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		ValueAry = DataAry[i].split('\t');
		let name = ValueAry[0];			// チャンネルタイプ名
		let guild_id = ValueAry[1];		// ギルドID
		let channel_id = ValueAry[2];	// チャンネルID
		// ギルドID及びチャンネルタイプが同一のものを発見
		if( msg.guildId == guild_id && name == type ){
			channel_search_flag = 1;
			DataAry[i] = `${name}\t${guild_id}\t${msg.channel.id}\t`;
		}
	}

	let data_text = '';
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		data_text += DataAry[i] + "\n";
	}
	if( channel_search_flag == 0 ){
		data_text += `${type}\t${msg.guildId}\t${msg.channel.id}\t\n`;
	}

	let ary_index = Channel_Type.indexOf( type );
	msg.reply(`弟くん、このチャンネルを${Channel_Text[ary_index]}に設定したよ`);

	await Write_File(file, data_text);

	return;
}

// チャンネル内に60分制限のスレッドを立てる
async function Set_Thread(msg, boss_name){

	// メッセージを送ったチャンネルを記憶
	let channel = msg.channel;

	// 同名スレッドの検索
	let thread_search = await channel.threads.cache.find(x => x.name === boss_name + 'の救援スレッド');

	// 同名スレッドのIDが検出されなければスレッドを作る
	if( thread_search == undefined ){
		const thread = channel.threads.create({
			name: boss_name + 'の救援スレッド',
			autoArchiveDuration: 60,	// 60分
			reason: 'ボスの救援が必要',
		});
		console.log(`Created thread: ${thread.name}`);
	}

	return;
}


// 予約簡易入力を出力する際にメッセージIDを消したり付けたり
async function Set_BossMsg_Id(msg, flag){

	let battle_schedule = await Folder(msg.guildId);
	battle_schedule = battle_schedule.slice( 0, -7 );
	let datafile = battle_schedule + "\/" + 'mark_msg_id.txt';

	if( flag == 0 ){	// データ消去
		// ファイルを書き込む（全部消す）
		await Write_File(datafile, '');
	}
	else{				// メッセージID書き込み
		let data = await Read_File(datafile);
		data += `${msg.id}\n`
		await Write_File(datafile, data);
	}

	// メッセージID
	return;
}



// その月のデータフォルダ名
function Time_Get(flag, type, value){
	// 日付と時間取得
	let today_data = new Date();
	// サーバーで変わるので運用する時は入れる。ローカルの時はこれで
	//let file = '.replit';
	//if( fs.existsSync(file) ){
	today_data.setTime(today_data.getTime() + 1000*60*60*9);// JSTに変換 サーバーによっては必要なし
	//}

	if( type == 'day' ){	// 1000(コンマ)*60(秒)*60(分)*24(時間)
		today_data.setTime(today_data.getTime() + 1000*60*60*24*value)
	}
	else if( type == 'hour' ){	// value時間
		today_data.setTime(today_data.getTime() + 1000*60*60*value)
	}
	else if( type == 'min' ){	// value分
		today_data.setTime(today_data.getTime() + 1000*60*value)
	}

	let year = today_data.getYear() + 1900;
	let month = today_data.getMonth() + 1;
	let day = today_data.getDate();
	let hours = today_data.getHours();
	let minutes = today_data.getMinutes();
	let second = today_data.getSeconds();

	// trueじゃないならクラバト以外の日付取得
	if( flag != true ){
		if( hours >= 0 && hours < 5 ){	// 0時～5時は当日扱い
			day--;
		}
		// 一応ちょくちょくここは更新していきたい
		exports.today = day;
	}

	return [year, month, day, hours, minutes, second];
}

// その月のデータフォルダ名
function Folder(dirctory_name){

	let [year, month, day, hours, minutes, second] = Time_Get();

	hours = ( '00' + hours ).slice( -2 );
	minutes = ( '00' + minutes ).slice( -2 );
	month = ( '00' + month ).slice( -2 );

	let battle_schedule = dirctory_name + "\/" + year + month;

	// ディレクトリを親ごと作成する heroku 使用不可
	/*fs.mkdirSync( battle_schedule, { recursive: true }, (err) => {
    	if (err) throw err;
	});*/

	return battle_schedule;
}

// 先月のメンバーデータをコピーする
async function Copy_Data(msg){

	// 今月分のデータアドレス
	let member_data_next = await Folder(msg.guildId);

	// 先月分のデータアドレス
	let [year, month, day, hours, minutes, second] = await Time_Get(true, "day", -30);
	month = ( '00' + month ).slice( -2 );
	let member_data_last = member_data_next.slice( 0, -6 );
	member_data_last += year + month;

	console.log(member_data_last, member_data_next);
	await Copy_File(member_data_last, member_data_next, 'member.txt');	// メンバーデータ

	msg.reply("お姉ちゃん、先月のクランバトルのメンバーデータをコピーしたよ")

	// 共通データのフォルダ指定＆今月データ
	let data_next = await Folder("common_data");

	[year, month, day, hours, minutes, second] = await Time_Get(true, "day", -30);	//30日前
	month = ( '00' + month ).slice( -2 );
	let data_last = "common_data" + "\/" + year + month;

	console.log(data_last, data_next);

	// ボスデータコピー
	let data = await Read_File(data_next + "\/" + 'boss.txt');
	//console.log("boss:" + data);
	if( data == '' || data == undefined ){	// 今月のデータが存在していない
		await Copy_File(data_last, data_next, 'boss.txt');	// ボスデータ
	}

	// 日付データコピー
	data = await Read_File(data_next + "\/" + 'day.txt');
	//console.log("day:" + data);
	if( data == '' || data == undefined ){	// 今月のデータが存在していない
		await Copy_File(data_last, data_next, 'day.txt');	// 日付データ
	}

	return;
}


async function Copy_File(last_file, next_file, file_name){
	last_file += `/${file_name}`;
	next_file += `/${file_name}`;

	// ファイル読み込み
	let data = await Read_File(last_file)

	// ファイル書き換え
	await Write_File(next_file, data);
}

// ローカルファイルデータをデータベースにコピー　※heroku使用不可
async function Copy_Database(msg, text){
/*
	text = text.replace(/　/g, " ");	// 全角スペースを半角に
	text = text.replace(/ +/g, " ");	// 半角スペースが複数あったらひとつに
	text = text.replace(/\//g, "");	// スラッシュ削除

	// コマンドや名前などを算出
	let DataAry = text.split(/ /);
	let command = DataAry[0];			// dbなど
	let filename = DataAry[1];			// ファイル名
	console.log(command);

	let data = '';

	let file = '.replit';
	if( fs.existsSync(file) ){	// サーバー側
		filename = filename.replace(/\\/g, '/');
		console.log(filename);
		if( fs.existsSync(filename) ){
			// ローカル側のテキストファイルを読み込み
			data = fs.readFileSync( filename, 'utf8');
			data = data.replace(/\r/g, '');

			// サーバーのデータベースにコピー
			await db.set(filename, data);

			msg.reply(`お姉ちゃん、${filename}をデータベースにコピーしたよ`)
		}
		else{
			msg.reply(`弟くん、${filename}のファイルがないよ`)
		}
	}
	else{
		msg.reply("弟くん、ここでそのコマンドは使えないよ")
	}
*/
}

// データベースをローカルファイルデータにコピー　※heroku使用不可
async function Sign_Database(msg, text){
/*
	text = text.replace(/　/g, " ");	// 全角スペースを半角に
	text = text.replace(/ +/g, " ");	// 半角スペースが複数あったらひとつに
	text = text.replace(/\//g, "");	// スラッシュ削除

	// コマンドや名前などを算出
	let DataAry = text.split(/ /);
	let command = DataAry[0];			// signなど
	let filename = DataAry[1];			// ファイル名
	console.log(command);

	let data = '';

	let file = '.replit';
	if( fs.existsSync(file) ){	// サーバー側
		data = await db.get(filename);
		if( data != null ){
			msg.reply(`${filename}を表示するよ`);
			let ValAry = data.split(/\n/);
			ValAry = ValAry.filter(Boolean);	// 空白削除
			let sub_text = '';
			for( let i = 0; i < ValAry.length; i++ ){
				sub_text += `${ValAry[i]}\n`;
				if( sub_text.length > 1950 ){
					await msg.guild.channels.cache.get(msg.channelId).send(sub_text);
					await _sleep(1000);
					sub_text = '';
				}
			}
			if( sub_text.length > 0 ){
				await msg.guild.channels.cache.get(msg.channelId).send(sub_text);
			}
		}
		else{
			msg.reply(`弟くん、${filename}のファイルがないよ`);
		}
	}
	else{
		msg.reply("弟くん、ここでそのコマンドは使えないよ")
	}
*/
}

async function Read_File(filename){
	console.log("Read_file:" + filename);
	//console.log(server_url);

	let data = '';

	let options = {
		url: server_url,  method: 'POST',
		auth: {
			user: server_user,  password: server_pass
		},
		form: {
			"mode": "readfile",  "file": filename
		}
	}

	await request(options, function (error, response, body) {
		//console.log(body);
		//console.log(error);
		//console.log(response);
		if( body.match(/オープンに失敗しました/) ){
			// オープン失敗時　特になし
		}
		else{
			body = body.replace(/<(.*?)>/g, '');			// 不要な文字を削除
			body = body.replace(/\n /g, '\n');				// 不要な空白を削除
			let Body = body.split(/\n/);
			Body = Body.filter(Boolean);	// 空白削除
			Body.shift();					// 先頭削除（※広告）
			for(let i = 0; i < Body.length; i++ ){
				data += `${Body[i]}\n`;
			}
		}
	});
	//console.log("-------------");
	//console.log(data);
	return await data;
}

async function Write_File(filename, datatext){

	// ファイル記入
	let options = {
		url: server_url,  method: 'POST',
		auth: {
			user: server_user,  password: server_pass
		},
		form: {
			"mode": "writefile",  "file": filename, "data": datatext
		}
	}

	await request(options, function (error, response, body) {
	});
}

function Set_Id(msg){

	let user_id = '';
	let user_name = '';
	// デフォルトのメッセージ
	if( msg.type == 'DEFAULT' ){
		user_id = msg.author.id;
		user_name = msg.author.name;
	}
	// コマンド
	else{
		user_id = msg.user.id;
		user_name = msg.user.username;
	}

	return [user_id, user_name];
}

module.exports = {
	Init_Data,
	Start_Func,
	Level_Func,
	Set_BossMsg_Id,
	Set_Channel,
	Set_Thread,
	Time_Get,
	Copy_Data,
	Copy_Database,
	Sign_Database,
	Folder,
	Read_File,
	Write_File,
	Set_Id,
	// ここから変数
	start_day,
	period,
	master,
	Level_List,
	BOSS_HP,
	Boss_Name,
	Boss_Icon,
	BOSS_NO,
	BUTTON_FLAG
}

