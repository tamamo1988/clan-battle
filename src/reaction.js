'use strict';

const reservecmd = require('./reserve');
const cmd = require('./set');
const checkcmd = require('./check');

// リアクションの反応
async function Reaction_Main( client, event, user){

	// リアクションを入れた時に処理
	if( event.t == 'MESSAGE_REACTION_ADD' ){

		console.log("MESSAGE_REACTION_ADD");

		const { d: data } = event;

		const channel = client.channels.cache.get(data.channel_id) || await user.createDM();

		// if the message is already in the cache, don't re-emit the event
		//if (channel.messages.has(data.message_id)) return;
		// if you're on the master/v12 branch, use `channel.messages.fetch()`
		const msg = await channel.messages.fetch(data.message_id);
		//console.log(msg)
		let guild_id = msg.guildId;	// ギルドID

		// カスタム絵文字のリアクションは `name:ID` 形式でキーイングされますが、ユニコード絵文字は名前でキーイングされます。
		// master/v12 ブランチを使用している場合、カスタム絵文字のリアクションは ID がキーになります。
		// 何の絵文字が押されたか
		const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
		let reaction = '';
		if( data.emoji.id == null ){	// 通常絵文字
			reaction = msg.reactions.cache.get(emojiKey);	}
		else{												 // カスタム絵文字
			reaction = msg.reactions.cache.get(data.emoji.id);
		}
		console.log("emojiKey:" + emojiKey);
		//console.log(reaction);

		let name = event.d.user_id;
		//let users = reaction.message.guild.members.resolve(name)
		//console.log(event);
		console.log("name:" + name);
		//console.log("users:" + users);

		let boss = '';

		// 予約回り。ボス名毎のリアクションボタンによる反応
		if( msg.content.match(/^■(.*?)/) ){
			boss = msg.content.match(/^■(.*?)/);
			boss = boss.input.replace(/■/, '');
			//let boss_name = boss;
			let attack_type = '';		// 物理魔法
			let attack_when = '';		// いつ行くか
			let challenge_no = '';		// 凸番号
			if( emojiKey == '⭕' ){	attack_when = 0;	attack_type = '';	}
			else if( emojiKey == '🗡' ){	attack_type = '物理';	}
			else if( emojiKey == '✡' ){	attack_type = '魔法';	}
			else if( emojiKey == '♻' ){	attack_type = '持越';	}
			else if( emojiKey == '❌' ){	attack_type = 'キャンセル';	}
			//else if( emojiKey == '🔽' ){	attack_when = 0;	}
			else if( emojiKey == '⏬' ){	attack_when = 1;	}
			else if( emojiKey == '⏸' ){	attack_when = 255;	}
			else if( emojiKey == '1⃣' ){ challenge_no = 1;	}
			else if( emojiKey == '2⃣' ){ challenge_no = 2;	}
			else if( emojiKey == '3⃣' ){ challenge_no = 3;	}
			else if( emojiKey == '↩' ){ challenge_no = 99;	}
			if( attack_type ){
				// msg、押した人のID、ダメージ、ボスの名前、物理魔法、いつ（次、希望など）
				reservecmd.Main_Reserve(msg, name, "", boss, attack_type, attack_when)
			}
			else{
				reservecmd.Main_Battle(msg, name, cmd.BOSS_NO[boss], challenge_no)
			}
			await reaction.users.remove(name); // 来たリアクションをそのまま消す。
		}
		
		else if( msg.content.match(/500万1000万\//) ){
			let damage = 0;
			if( emojiKey == '1⃣' ){ damage = "1000万"; }
			else if( emojiKey == '2⃣' ){ damage = "2000万"; }
			else if( emojiKey == '3⃣' ){ damage = "3000万"; }
			else if( emojiKey == '🕧' ){ damage = "500万"; }
			else if( emojiKey == '🕜' ){ damage = "1500万"; }
			else if( emojiKey == '🕝' ){ damage = "2500万"; }
			if( emojiKey == '💥' ){ damage = "ワンパン"; }
			reservecmd.Main_Reserve(msg, name, damage, '', '', '')
			await reaction.users.remove(name); // 来たリアクションをそのまま消す。
		}
		else if( msg.content.match(/🚫タスキル(.*)元に戻す/) ){
			// タスキル
			if( emojiKey == '🚫' ){
				reservecmd.Main_Taskkill(msg, name, 1)	// 0以外で追加
			}
			// タスキル取り消し
			else if( emojiKey == '↩' ){
				reservecmd.Main_Taskkill(msg, name, 0)	// 0がキャンセル
			}
			// 優先
			else if( emojiKey == '🕛' ){
				reservecmd.Main_Priority(msg, name, 1)	// 0以外で追加
			}
			// 優先取り消し
			else if( emojiKey == '✖' ){
				reservecmd.Main_Priority(msg, name, 0)	// 0がキャンセル
			}
			// 呼び出し
			else if( emojiKey == '🛎' ){
				let channel_id = await checkcmd.Channel_Search(msg.guildId, "command");
				if( channel_id && cmd.master[name] ){
					msg.guild.channels.cache.get(channel_id).send( "@everyone クランリーダーが呼んでるよ！　応えられる人はいるかな？" );
				}
			}
			// 救援
			else if( emojiKey == '🆘' ){
				reservecmd.Main_Battle(msg, name, "999", '');	// SOSは999	
			}
			await reaction.users.remove(name); // 来たリアクションをそのまま消す。
		}
		/*else if( msg.content.match(/凸宣言/) ){	//▶凸宣言 ⏩LA(次ボスに続凸)🔁LA(次周待ち)
			let boss_no = 0;
			if( emojiKey == '▶' ){			}
			else if( emojiKey == '1⃣' ){ boss_no = 1;	}
			else if( emojiKey == '2⃣' ){ boss_no = 2;	}
			else if( emojiKey == '3⃣' ){ boss_no = 3;	}
			else if( emojiKey == '4⃣' ){ boss_no = 4;	}
			else if( emojiKey == '5⃣' ){ boss_no = 5;	}
			// 凸キャンセル
			else if( emojiKey == '❌' ){ boss_no = 100;	}	// 下で99になる

			boss_no--;	// ボス番号は表面上は1～5 内部では0～4
			reservecmd.Main_Battle(msg, name, boss_no, '')
			await reaction.users.remove(name); // 来たリアクションをそのまま消す。
		}
		else if( msg.content.match(/凸番号/) ){	//▶凸番号
			le__dirname
			if( emojiKey == '▶' ){	console.log("▶");}
			else if( emojiKey == '1⃣' ){	attack_turn = 1;	}
			else if( emojiKey == '2⃣' ){	attack_turn = 2;	}
			else if( emojiKey == '3⃣' ){	attack_turn = 3;	}
			reservecmd.Main_Battle(msg, name, '', attack_turn)
			await reaction.users.remove(name); // 来たリアクションをそのまま消す。
		}*/
		else if( msg.content.match(/クランバトルのデータを初期化するよ？/) ){	//🆗 🆖
			if( emojiKey == '🆗' ){
				//console.log("🆗" + message.id);
				cmd.Init_Data(msg);
				try{
					msg.delete()
						.then(msg => console.log(`Deleted message from ${msg.author.username}`))
						.catch(console.error);
				}
				catch{
					console.log("try-catch delete error");
				}
			}
			else if( emojiKey == '🆖' ){
				//console.log("🆖" + message.id);
				try{
					msg.delete()
						.then(msg => console.log(`Deleted message from ${msg.author.username}`))
						.catch(console.error);
				}
				catch{
					console.log("try-catch delete error");
				}
			}
			//console.log("user:" + user);
			//await reaction.users.remove(user); // 来たリアクションをそのまま消す。
		}
		//message.reactions.cache.get('484535447171760141').remove().catch(error => console.error('Failed to remove reactions: ', error));
		return {reaction};
	}
}

async function Reaction_Output(msg){

	msg.delete()					// マークの文字は消す
		.then(msg => console.log(`Deleted message from ${msg.author.username}`))
		.catch(console.error);
	await cmd.Set_BossMsg_Id(msg, 0);		// ファイルを初期化タイプ

	// 予約簡易入力用のチャンネルを探す
	let channel = await checkcmd.Channel_Search(msg.guildId, "reserve");
	if( channel == false ){
		msg.reply("予約簡易入力用のチャンネルが見つからないよ？　まずは設定してね")
		console.log("チャンネル非存在");
		return;
	}

	console.log(channel);
	await msg.guild.channels.cache.get(channel).send("1⃣2⃣3⃣凸宣言 ↩凸取消 🗡物理予約 ✡魔法予約 ❌予約取消");
	for(let i = 0; i < cmd.Boss_Name.length; i++ ){
		//let boss_emoji;
		/*if( i == 0 ){ boss_emoji = "1⃣"; }
		else if( i == 1 ){ boss_emoji = "2⃣"; }
		else if( i == 2 ){ boss_emoji = "3⃣"; }
		else if( i == 3 ){ boss_emoji = "4⃣"; }
		else if( i == 4 ){ boss_emoji = "5⃣"; }*/
		//await msg.guild.channels.get(channel).send( "■" + boss_emoji + boss_list_mark[i])
		await msg.guild.channels.cache.get(channel).send( "■" + cmd.Boss_Name[i])
			.then(async function (msg) {
				await msg.react('1⃣');
				await msg.react('2⃣');
				await msg.react('3⃣');
				await msg.react('↩');
				await msg.react('🗡');
				await msg.react('✡');
				//await msg.react('⏸');
				await msg.react('❌');
				await cmd.Set_BossMsg_Id(msg, 1);		// ボスごとにmsgIDを追記
		}).catch(function() {
				//Something
		});
		/*await msg.guild.channels.cache.get(channel).send( "■" + cmd.Boss_Name[i])
			.then(async function (msg) {
				await msg.react('🗡');
				await msg.react('✡');
				await msg.react('♻');
				await msg.react('⭕');
				//await msg.react('🔽');
				await msg.react('⏬');
				await msg.react('⏸');
				await msg.react('❌');
				await cmd.Set_BossMsg_Id(msg, 1);		// ボスごとにmsgIDを追記
		}).catch(function() {
				//Something
		});*/
	}
	await msg.guild.channels.cache.get(channel).send( "●予想ダメージ（予約後入力※最新の予約のみ更新）──────────\n```500万1000万/1500万/2000万/2500万/3000万/ワンパン```")
		.then(async function (msg) {
			await msg.react('🕧');
			await msg.react('1⃣');
			await msg.react('🕜');
			await msg.react('2⃣');
			await msg.react('🕝');
			await msg.react('3⃣');
			await msg.react('💥');
		}).catch(function() {
			//Something:clock1230: 0.5K/:clock130: 1.5K/:clock230: 2.5K/:clock330: 3.5K
	});
	await msg.guild.channels.cache.get(channel).send("────────────────────────\n🚫タスキル ↩元に戻す／🕛優先 ✖通常／🛎集合(リーダー専用) 🆘救援")
		.then(async function (msg) {
			await msg.react('🚫');
			await msg.react('↩');
			await msg.react('🕛');
			await msg.react('✖');
			await msg.react('🛎');
			await msg.react('🆘');
		}).catch(function() {
			//Something
	});
	/*await msg.guild.channels.cache.get(channel).send("────────────────────────\n1⃣2⃣3⃣4⃣5⃣凸宣言 ❌凸中止")
		.then(async function (msg) {
			await msg.react('1⃣');
			await msg.react('2⃣');
			await msg.react('3⃣');
			await msg.react('4⃣');
			await msg.react('5⃣');
			await msg.react('❌');
		}).catch(function() {
			//Something
	});
	await msg.guild.channels.cache.get(channel).send("1⃣2⃣3⃣凸番号")
		.then(async function (msg) {
			await msg.react('1⃣');
			await msg.react('2⃣');
			await msg.react('3⃣');
		}).catch(function() {
			//Something
	});*/
	return;
}

module.exports = {
	Reaction_Main,
	Reaction_Output
}

