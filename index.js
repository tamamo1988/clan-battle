'use strict';

console.log(process.version);

require('dotenv').config();
const token = process.env.DISCORD_BOT_TOKEN;

// Response for Uptime Robot
const http = require('http');
http.createServer(function(request, response)
{
	response.writeHead(200, {'Content-Type': 'text/plain'});
	response.end('Discord bot is active now \n');
}).listen(3000);

// Discord bot implements
const { Client, Intents, TextChannel, DMChannel, ButtonInteraction, InteractionCollector, Interaction, CommandInteraction,
Message, MessageManager, MessageEmbed } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES], partials: ['MESSAGE', 'CHANNEL', 'REACTION'] } );
const { SlashCommandBuilder } = require('@discordjs/builders');

const fs = require('fs');
const cmd = require('./src/set');
const com = require('./src/command');
const intcmd = require('./src/interaction');
const membercmd = require('./src/member');
const bosscmd = require('./src/boss');
const calccmd = require('./src/calc');
const damagecmd = require('./src/damage');
const procmd = require('./src/progress');
const checkcmd = require('./src/check');
const reacmd = require('./src/reaction');
const nowcmd = require('./src/now');
const infocmd = require('./src/info');

let guild_id;									// リクエストに使うギルドID
let All_Guild_Id = new Array();					// 入れてるギルドID全部を拾うやつ
const DEFAULT_SERVER = '674861392930799639';	// とりあえずテストサーバー使う時

// 疑似wait
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Wake_Word = new Array('\.', '\/', '\*', '\[');	// 起動ワード
const Wake_Emoji = new Array('⚔', '🈯');	// 起動絵文字

const events = {
	//MESSAGE_REACTION_ADD: 'messageReactionAdd',
	//MESSAGE_REACTION_REMOVE: 'messageReactionRemove',
	MESSAGE_REACTION_ADD: 'MESSAGE_REACTION_ADD',
	MESSAGE_REACTION_REMOVE: 'MESSAGE_REACTION_REMOVE',
};

// Botの準備が完了したタイミング（ready）で、Botに何かをさせたいとき
client.once('ready', async message =>
{
	All_Guild_Id = await client.guilds.cache.map(guild => guild.id);

	// 日付と時間取得
	let [year, month, day, hours, minutes, second] = await cmd.Time_Get();
	hours = ( '00' + hours ).slice( -2 );
	minutes = ( '00' + minutes ).slice( -2 );

	client.user.setActivity('/helpで解説 ' + hours + "時" + minutes + "分起床", {
		type: 'WATCHING'
	});
	
	let command_data = await com.Command_Func(cmd.Boss_Name);	// コマンドデータ
	//console.log(command_data);
	All_Guild_Id.forEach(async function(item, index, array) {
		await client.application.commands.set(command_data, item);
	});

	cmd.start_day = cmd.start_day[0];	// 儀式
	cmd.period = cmd.period[0];			// 儀式
	console.log('bot is ready!!!');
	console.log(cmd.start_day);
});

// 時限コマンド
setInterval(async function () {

	let [year, month, day, hours, minutes, second] = cmd.Time_Get(true);

	// よくよく考えるとギルド毎に全部記録する必要があるんだなぁ…
	if( minutes % 10 == 0 ){ // 10分ごとに
		//console.log("minutes:" + minutes);
		let notice_text_main = new Array(5);
		let notice_text_main_tmp = '';

		// 通知テキストを得る
		let [notice_text, greeting_flag] = await infocmd.Notice_Text();

		if( notice_text ){
			All_Guild_Id.forEach(async function(item, index, array) {
				let channel_id = await checkcmd.Channel_Search(item, "info");
				if( channel_id == false ){	console.log("チャンネル非存在");	return;	}
				let botmsg;
				if( greeting_flag == 100 ){	// クランバトルの結果や最後の日の凸情報
					let embed_text = await infocmd.Charge_Research(item);
					botmsg = await client.channels.cache.get(channel_id).send({ content : notice_text,  embeds: [embed_text] });
					nowcmd.Result( botmsg );
				}
				else{	// 通常時の通知テキスト
					botmsg = await client.channels.cache.get(channel_id).send(notice_text);
				}
				await _sleep(1000);
				if( greeting_flag == 1 ){	// 当日のインフォ通知
					await infocmd.Info_Text( botmsg , '', '' );
					await _sleep(1000);
				}
			});
		}
	}
}, 60000);	// 1分ごと


	//var testtest = JSON.stringify(event);		// 書き換え

// イベント（主にリアクションボタンの処理）
client.on('raw', async event => {

	// `event.t` is the raw event name
	// 指定されたプロパティを持っているかどうか
	if (!events.hasOwnProperty(event.t)) return;

	//const user = await client.users.fetch(event.d.user_id);
	let user = await client.users.fetch(event.d.user_id);

	if( user == client.user ) return;	// 自分自身のリアクションを無視
	if( user.bot == true ) return;	// botのリアクションは無視

	await reacmd.Reaction_Main(client, event, user);

	//client.emit(events[event.t], reaction, user);
});

// イベント（主に選択肢ボタンの処理）
client.on('interactionCreate', async interaction => {

	// ボタン
	if( interaction.type == 'MESSAGE_COMPONENT' ){
		intcmd.Interaction_Main(interaction, client);
	}
	// コマンド
	else{
		intcmd.Interaction_Command(interaction, client);
	}

});

// 誰かがチャットを送信したタイミング（message）で、Botに何かをさせたいとき
client.on('messageCreate', async message =>
{
	let msg = message;

	// bot自身の発言は一部以外無視
	if ( msg.author.bot && msg.channel.type === "DM" ){ // DMならこっち
		return;
	}
	else if ( msg.author.bot ){
		return;
	}

	// ダイレクトメッセージの受信
	if ( msg.channel.type === "DM" ){
		console.log("DM反応");
		let msg = message;
		// インフォテキストの更新＆表示
		if(msg.content.match(/^\/main_info/i))
		{
			infocmd.Info_Text(msg);
			return;
		}
		// インフォテキストの追加
		else if(msg.content.match(/^\/info_(.*)/i))
		{
			// addで追加 名前と日付時間(イベント名 08/11 12:00)
			// 同じ名前のものがあったら上書きする
			// delで削除 名前
			infocmd.Info_Write(msg, msg.content);
			return;
		}
		// インフォテキストの表示
		else if(msg.content.match(/^\/info$/i))
		{
			infocmd.Info_Text(msg, "all");
			return;
		}
		else if(msg.content.match(/^\/help/i))
		{
			infocmd.Help_Text(msg);
			return;
		}
		// タイムライン変換
		else if( msg.content.match(/^\/tl/i) ){
			calccmd.Time_Line_Change( msg );
			return;
		}
		else{
			msg.reply("お姉ちゃんに何かヒミツの用事かな？");
			//client.users.cache.get(msg.author.id).send("お姉ちゃんに何かヒミツの用事かな？")
			return;
		}
	}

	// リプライに反応＆ただし自分自身は除く
	if(msg.mentions.has(client.user) && msg.author != client.user)
	{
		let random = Math.floor(Math.random() * 9);
		console.log(random);
		switch( random ) {
			case 0:
				msg.reply("お姉ちゃんだよ！");
				break;
			case 1:
				msg.reply("お姉ちゃんチョップ！");
				break;
			case 2:
				msg.reply("もしかしてお嫁さんだと思った？　ざーんねん、お姉ちゃんでした♪");
				break;
			case 3:
				msg.reply("お姉ちゃんパワー！");
				break;
			case 4:
				msg.reply("みんなのお姉ちゃんだよ☆");
				break;
			case 5:
				msg.reply("これがお姉ちゃんの愛の力！");
				break;
			case 6:
				msg.reply("お姉ちゃんの本気だよ！");
				break;
			case 7:
				msg.reply("お姉ちゃん、もっとお姉ちゃんになったよ！");
				break;
			case 8:
				msg.reply("お姉ちゃんの上にお姉ちゃんはなしっ！　だよ");
				break;
		}
		return;
	}

	// DMで来ると困る
	guild_id = message.guild.id;	// ギルドID　※これいる？

	// ここからユーザーが主に使う
	let regexp_main;

	// 起動文字が先頭に存在しているか
	let wake_flag = 0;
	if( Wake_Word.includes(msg.content.slice(0, 1)) ){
		wake_flag = 1;
	}
	else if( Wake_Emoji.includes(msg.content.slice(0, 1)) ){
		wake_flag = 1;
	}
	// 起動文字がないからここで止める
	if( wake_flag == 0 ){	return;	}

	// チャンネル登録はどのチャンネルでもできるように
	if( msg.content.match(/^\/set/i) ){
		console.log("チャンネル設定");
		cmd.Set_Channel( msg );
		return;
	}

	// 処理を行うチャンネルではない
	let check_flag = await checkcmd.Channel_Check(msg);
	if( check_flag == false ){	return;	}

	// bot処理スタート
	console.log("process start");

	// 適当
	if( msg.content == 'あ' ){
	}
	// テスト
	else if( msg.content.match(/^\/test2/i) ){
		console.log(msg.id)
		let bot_msg = await msg.reply(msg.id);
		console.log(bot_msg.id)
		await msg.reply(bot_msg.id);
	}
	// テスト
	else if( msg.content.match(/^\/test3/i) ){
		// embedを作成
		let text = '';
		for( let i = 0; i < 24; i++ ){
			text += `${i}時 `;
			for( let j = 0; j < 30-i; j++ ){
				text += `⬛`;
			}
			text += `\n`;
		}
		let exampleEmbed = new MessageEmbed()
			.setColor("#0000FF")
			.setTitle("凸時間調査")
			.setDescription("```" + text + "```")
			/*.addFields(VALUE)
			.addField("オレオレ", "TEST")
			.addFields(VALUE)*/
			.setThumbnail('http://yellow.ribbon.to/~gabapuri/image/sister_thumbnail.png')
		await msg.reply( { content: '凸時間調査だよ', embeds: [exampleEmbed] });
	}
	// テスト
	else if( msg.content.match(/^\/test/i) ){
		let text = '```diff\n' + "HP[■■■■■■■■■■]()\n";
		text += "HP[          ]()\n";
		text += "HP[          ]()" + '```';
		//let text = '```md\n' + "HP[■■■■■■■■■■■■■■]()" + '```';

		/*let VALUE = [
			{ name: text, value: "　", },
		]*/
		// embedを作成
		let exampleEmbed = new MessageEmbed()
			.setColor("#0000FF")
			.setTitle("ワイバーン [2周目]")
			.setDescription(text)
			//.addFields(VALUE)
			//.addField("オレオレ", "TEST")
			//.addFields(VALUE)
			.setThumbnail('http://yellow.ribbon.to/~gabapuri/image/305700.png')
		await msg.reply( { content: ' ', embeds: [exampleEmbed] });
	}
	// 初期化
	else if (msg.content.match(/^\/init/i)){	// 初期化
		if( cmd.master[msg.author.id] == 1 ){		// botのマスターのみ使用可能？
			await msg.reply("弟くん、今月のクランバトルのデータを初期化するよ？　本当にいいの？　10秒以内に決めてね！")
				.then(async function (msg) {
					await msg.react('🆗');
					await msg.react('🆖');
					setTimeout( async function(){
						try{
							msg.delete()
								.then(msg => console.log(`Deleted message from ${msg}`))
								.catch(console.error);
						}
						catch{
							console.log("try-catch delete error");
						}
					}, 10000);
			}).catch(function() {
					//Something
			});
		}
		else{
			await msg.reply("危ないから決められた人以外、使えないよ")
		}
		return;
	}
	// ヘルプ
	else if( msg.content.match(/^\/help/i) ){
		await infocmd.Help_Text(msg);
		return;
	}
	// 通知
	else if( msg.content.match(/^\/notice/i) ){
		let [notice_text, greeting_flag] = await infocmd.Notice_Text();
		console.log(notice_text, greeting_flag);
		if( notice_text ){
			let channel_id = await checkcmd.Channel_Search(msg.guild.id, "info");
			if( channel_id == false ){	console.log("チャンネル非存在");	return;	}
			if( greeting_flag == 100 ){	// クランバトルの結果や最後の日の凸情報
				let embed_text = await infocmd.Charge_Research(msg.guild.id);
				await client.channels.cache.get(channel_id).send({ content : notice_text,  embeds: [embed_text] });
			}
			else{
				await client.channels.cache.get(channel_id).send(notice_text);
			}
		}
		return;
	}
	// インフォテキスト（当日）
	else if(msg.content.match(/^\/main_info/i))
	{
		infocmd.Info_Text(msg);
		return;
	}
	// インフォアップデートの追加
	else if(msg.content.match(/^\/info_update/i))
	{
		infocmd.Info_Update();
		return;
	}
	// インフォテキストの追加
	else if(msg.content.match(/^\/info_(.*)/i))
	{
		// addで追加 名前と日付時間(イベント名 08/11 12:00)
		// 同じ名前のものがあったら上書きする
		// delで削除 名前
		infocmd.Info_Write(msg, msg.content);
		return;
	}
	// インフォテキストの表示
	else if(msg.content.match(/^\/info$/i))
	{
		infocmd.Info_Text(msg, "all");
		return;
	}
	// 凸の選択肢を表示
	else if( msg.content.slice(0, 1) == '⚔' ){
		await damagecmd.Main_Damage(msg, 0, 0, 'battle', 0, 0, '', '');
		return;
	}
	// 簡易予約入力にリアクションボタンを出力
	else if( msg.content.match(/^\/mark/i) ){
		reacmd.Reaction_Output(msg);
		return;
	}
	// メンバーの登録、抹消、ニックネームの追加と削除
	else if( msg.content.match(/^\/name/i) ){
		membercmd.Main_Name( msg, msg.content );
		return;
	}
	// ボスの登録、抹消、ニックネームの追加と削除
	else if( msg.content.match(/^\/boss/i) ){
		// 別名調べる
		let other_name = await checkcmd.Other_Name_Check(msg, msg.content);
		if( other_name == -1 ){ return; }

		let day = '';
		if( msg.content.match(/\[(\d{4})(\d{2})\]/) ){
			let days = msg.content.match(/\[(\d{4})(\d{2})\]/);
			day = days[1];
			day += days[2];
		}
		else if( msg.content.match(/\[(\d{1,2})\]/) ){
			let days = msg.content.match(/\[(\d{1,2})\]/);
			day = days[1];
		}
	
		bosscmd.Main_Boss( msg, msg.content, other_name, day );
		return;
	}
	// 持ち越し時間計算
	else if( msg.content.match(/^\*/i) ){
		calccmd.Main_Calc( msg, msg.content );
		return;
	}
	// タイムライン変換
	else if( msg.content.match(/^\/tl/i) ){
		calccmd.Time_Line_Change( msg );
		return;
	}
	// 先月分のデータコピー
	else if( msg.content.match(/^\/copy/i) ){
		await cmd.Copy_Data( msg );
		return;
	}
	// ファイルデータをデータベースにコピー
	else if( msg.content.match(/^\/db/i) ){
		await cmd.Copy_Database( msg, msg.content );
		return;
	}
	// データベースを表示
	else if( msg.content.match(/^\/sign/i) ){
		await cmd.Sign_Database( msg, msg.content );
		return;
	}
	// 開催日設定
	else if( msg.content.match(/^\/start/i) ){
		cmd.start_day = await cmd.Start_Func( msg, msg.content );
		return;
	}
	// 段階進行設定
	else if( msg.content.match(/^\/level/i) ){
		cmd.start_day = await cmd.Level_Func( msg, msg.content );
		return;
	}
	// 残凸更新
	else if( msg.content.match(/^\/now (\d{1,2})/i) ){
		let Target = msg.content.match( /^\/now (\d{1,2})/i );
		let target_day = Target[1];
		let Update = [];
		nowcmd.Now_Main( msg, target_day, Update);
		return;
	}
	// 残凸更新
	else if( msg.content.match(/^\/now/i) ){
		let target_day;
		let Update = [1,1,1,1,1];
		nowcmd.Now_Main( msg, target_day, Update );
		return;
	}
	// 結果更新
	else if( msg.content.match(/^\/result/i) ){
		nowcmd.Result( msg );
		return;
	}
	// 時間更新凸指定あり
	else if( msg.content.match(/^\[(\d{1}).(\d{1}):(\d{1,2})\]/i) ){
		let Value = msg.content.match(/^\[(\d{1}).(\d{1}):(\d{1,2})\]/i);
		let set_time = `${Value[2]}:${Value[3]}`;
		let turn = Value[1];
		damagecmd.Surplus_Time( msg, set_time, turn);
		return;
	}
	// 時間更新
	else if( msg.content.match(/^\[(\d{1}):(\d{1,2})\]/i) ){
		let Value = msg.content.match(/^\[(\d{1}):(\d{1,2})\]/i);
		let set_time = `${Value[1].toString()}:${Value[2].toString()}`;
		damagecmd.Surplus_Time( msg, set_time, '' );
		return;
	}
	// ダメージ削除
	else if( msg.content.match(/^[\/|\.]del/i) ){
		// 文字の整理
		msg.content = msg.content.replace(/　/g, " "); // 全角スペースを半角に
		msg.content = msg.content.replace(/ +/g, " ");// 半角スペースが複数あったらひとつに
		msg.content = msg.content.replace(/ ([^0-9])/g, "$1");// 半角スペース+数字の並びじゃなかったら、その半角スペースは消す
		msg.content = msg.content.replace(/\//g, ".");	// スラッシュをドットに

		// 別名調べる
		let other_name = await checkcmd.Other_Name_Check(msg, msg.content);
		if( other_name == -1 ){ return; }

		let boss_no = -1;
		if( other_name ){
			// ボス名を探す
			boss_no = await bosscmd.Boss_Search(msg, other_name)
			// ボス名が見つかった
			if( boss_no >= 0 ){	other_name = '';	}
			// 見つからなかった
			else{	boss_no = '';	}
		}
		if( other_name != undefined ){	// 誰かのデータを削除する時
			damagecmd.Damage_Revise(msg, other_name, -1);
		}
		else{	// 最新ダメージdelのみ
			damagecmd.Damage_Del( msg, 0, boss_no, other_name );
		}
	}
	// メインのダメージ処理
	else if(msg.content.match(regexp_main) )
	{
		console.log("----------------------------------------------------------------------------");
		// 文字の整理
		msg.content = msg.content.replace(/　/g, " "); // 全角スペースを半角に
		msg.content = msg.content.replace(/ +/g, " ");// 半角スペースが複数あったらひとつに
		msg.content = msg.content.replace(/ ([^0-9])/g, "$1");// 半角スペース+数字の並びじゃなかったら、その半角スペースは消す
		msg.content = msg.content.replace(/\//g, ".");	// スラッシュをドットに

		// ボスA～Eを1～5に変換
		msg.content = msg.content.replace(/\.A\./i, ".1.");
		msg.content = msg.content.replace(/\.B\./i, ".2.");
		msg.content = msg.content.replace(/\.C\./i, ".3.");
		msg.content = msg.content.replace(/\.D\./i, ".4.");
		msg.content = msg.content.replace(/\.E\./i, ".5.");

		let Damage_List = msg.content.split('\n');
		Damage_List = Damage_List.filter(Boolean);	// 空白削除

		// 修正時フラグ
		let revise_flag = 0;
		if( Damage_List.length == 1 ){
			// 別名調べる
			let other_name = await checkcmd.Other_Name_Check(msg, msg.content);
			if( other_name == -1 ){ return; }
			if( Damage_List[0].match(/^.Re[0-9]/i)){	// データ修正
				Damage_List[0] = Damage_List[0].replace(/.Re/i, ".");
				revise_flag = 2;
			}
			else if( Damage_List[0].match(/^.Re/i) ){	// 即時修正
				damagecmd.Damage_Revise(msg, other_name);
				revise_flag = 1;
				return;
			}
		}

		let target_day_main;
		if( Damage_List.length > 1 ){
			let content_text = Damage_List[0];
			if( content_text.match(/^\[day\d+\]/) ){  // 強制入力
				target_day_main = content_text.match(/\[day(\d+)\]/);
				target_day_main = target_day_main[1]
				//console.log("全ダメージ日付指定強制入力:" + target_day + "日");
				Damage_List[0] = '';
				Damage_List = Damage_List.filter(Boolean);	// 空白削除
			}
		}

		// 通常ダメージ
		for( let i = 0; i < Damage_List.length; i++ ){
			let content_text = Damage_List[i];
			let attention_text = '';
			if( Damage_List.length > 1 ){
				attention_text = "```" + content_text + "```";
			}

			// 入力の定型が正しいかを判定（※一部は見逃す）
			let damage_particulars;	// ダメージ周り
			if( content_text.match(/(\d{2,10}|kill|討伐|error)\.([1-5]{1})\.([1-3]{1})/) ){
				damage_particulars = content_text.match(/(\d{1,10}|kill|討伐|error)\.([1-5]{1})\.([1-3]{1})/);
			}
			else if( content_text.match(/(\d{2,10}|kill|討伐|error)\.([0-9]{1})\.([1-3]{1})/) ){	// 0あるいは6～9
				damage_particulars = content_text.match(/(\d{2,10}|kill|討伐|error)\.(.*)\.([1-3]{1})/);
				if( damage_particulars[2] == 0 && revise_flag == 2 ){
				}
				else if( damage_particulars[1] == 'error' ){
				}
				else{
					msg.reply("弟くん…ボスがちゃんと記入されてないよ？" + attention_text);
					return;
				}
			}
			else if( content_text.match(/(\d{2,10}|kill|討伐|error)\.([1-5]{1})\.([0-9]{1,9})/) ){
				msg.reply("弟くん…何回目の挑戦か正しい数値で記入されてないよ？" + attention_text);
				return;
			}
			else if( content_text.match(/(\d{2,10}|kill|討伐|error)\.(.*)\.([1-3]{1})/) ){	// ボス名記入
				damage_particulars = content_text.match(/(\d{2,10}|kill|討伐|error)\.(.*)\.([1-3]{1})/);
				// ボスの名前を入れて番号を返す
				damage_particulars[2] = await bosscmd.Boss_Search(msg, damage_particulars[2]);
				if( damage_particulars[2] == -1 ){
					msg.reply("弟くん、そんな名前のボスはいないよ？" + attention_text);
					return;
				}
				damage_particulars[2]++;	// 入力に使用するので表面上のNoにする
			}
			// killの処理
			else if( content_text.match(/(.*)\.([0-9]{1})\.([0-9]{1})/) ){			// 形式は正しいけどダメージ入力に難
				damage_particulars = content_text.match(/(.*)\.([0-9]{1})\.([0-9]{1})/);
			}
			else if( content_text.match(/^\.(.*)\.([0-9]{1})/) ){	// 形式が正しくない
				msg.reply("弟くん…記入がおかしいよ？　[ダメージ.ボスNo.凸回数] の規則で入力してね" + attention_text);
				return;
			}
			else{
				//message.reply("弟くん…記入がおかしいよ？　[ダメージ.ボスNo.凸回数] の規則で入力してね");
				//return;
			}

			let damage = 0;				// ダメージ
			let target_boss_no = '';	// 指定ボスNo
			let attack_turn = '';		// 指定凸番号
			// ダメージのみ入力
			if( damage_particulars == undefined ){
				damage = content_text.match(/\d{2,10}|kill|討伐|error/);
			}
			// ダメージ＆ボスＮｏ＆凸番号
			else{
				damage = damage_particulars[1];
				target_boss_no = damage_particulars[2];
				attack_turn = damage_particulars[3];
			}

			// killあるいは討伐
			if( damage == 'kill' || damage == '討伐' ){
				// スルー
			}
			else if( damage == 'error' ){
				// スルー
			}
			// 数字が来るはず
			else{
				damage += '';	// マッチさせるために数字を文字に変換
				if( damage.match(/\D/) ){ // ダメージに英語あるいは日本語が入っている
					msg.reply(`弟くん…ダメージは正しく入力してね？` + attention_text);
					return;
				}
			}

			let target_day;
			if( content_text.match(/\[day\d+\]/) ){  // 強制入力
				target_day = content_text.match(/\[day(\d+)\]/);
				target_day = target_day[1]
				console.log("日付指定強制入力:" + target_day + "日");
			}
			else{
				target_day = target_day_main;
				console.log("全ダメージ日付指定強制入力個別:" + target_day + "日");
			}
			//console.log(target_day);

			// 残り時間設定
			content_text = content_text.replace(/［/, "\[").replace(/］/, "\]");
			let over_time = content_text.match(/\[(\d{1}):(\d{1,2})\]/);
			let over_time_data = '';
			if( over_time != null ){
				over_time_data = `${over_time[1]}:${over_time[2]}`;
				// 時間の書式チェック
				let time_text = checkcmd.Time_Check(over_time_data)
				if( time_text ){	msg.reply(`${time_text}` + attention_text);	return;	}
			}

			if( content_text.match(/\@/) ){
				message.reply(`ごめんね、半角の＠はダメなんだ…` + attention_text);
				return;
			}

			// 別名調べる
			let other_name = await checkcmd.Other_Name_Check(msg, content_text);
			if( other_name == -1 ){ return; }

			// 数値修正時はここで
			if( revise_flag == 2 ){
				damagecmd.Damage_Revise(msg, other_name, damage, target_boss_no, attack_turn);
				return;
			}

			let end_flag = 0;
			// killが入っている
			if( damage == "kill" ){	// これを先に持ってこないと半角判定に引っかかる…
				end_flag = await damagecmd.Main_Damage(msg, i, Damage_List.length, 'kill', target_boss_no, attack_turn, over_time_data, other_name, target_day);
			}
			// killが入っている
			else if( damage == "error" ){	// これを先に持ってこないと半角判定に引っかかる…
				end_flag = await damagecmd.Main_Damage(msg, i, Damage_List.length, 'error', target_boss_no, attack_turn, over_time_data, other_name, target_day);
			}
			// ダメージ入力がない
			else if (damage == null){
				msg.reply(`弟くん、ダメージが半角で入ってないよ` + attention_text);
				return;
			}
			// ダメージが大きすぎる。いつかは修正しなきゃいけないかも
			else if( damage.match(/\d{10,}/) ){
				msg.reply(`弟くん…お姉ちゃんね、そんな大きなダメージは入らないと思うんだ` + attention_text);
				return;
			}
			// ダメージ入力されている
			else{
				end_flag = await damagecmd.Main_Damage(msg, i, Damage_List.length, damage, target_boss_no, attack_turn, over_time_data, other_name, target_day);
			}

			if( end_flag == -1 ){
				return;
			}
		}
		return;
	}
	return;
});

if(token == '')
{
	console.log('please set ENV: DISCORD_BOT_TOKEN');
	process.exit(0);
}

console.log('ENV: DISCORD_BOT_TOKEN OK');
client.login( token );

