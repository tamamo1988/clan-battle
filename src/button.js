'use strict';

const { MessageActionRow, MessageButton } = require('discord.js');
const cmd = require('./set');

// ボタン展開　msg, text, button_num(ボタンの数), button_updata(0:新規 1:更新), BUTTON
async function Interaction_Button( msg, text, button_num, button_updata, BUTTON ){
	let row;
	let rows = [];
	for( let i = 1; i <= button_num; i++ ){
		let bkey1 = `b${i}_id`; let bkey2 = `b${i}_label`;
		let bkey3 = `b${i}_style`;
		if( BUTTON[bkey3] == undefined ){ BUTTON[bkey3] = 'PRIMARY'; }
		let bkey4 = `b${i}_disble`;
		if( BUTTON[bkey4] == undefined ){ BUTTON[bkey4] = "false"; }
		let row_tmp = new MessageButton().setCustomId(BUTTON[bkey1].toString()).setLabel(BUTTON[bkey2]).setStyle(BUTTON[bkey3]).setDisabled(BUTTON[bkey4]);
		rows.push(row_tmp);
	}
	row = new MessageActionRow().addComponents(rows);	// 選択肢追加

	// 新規
	if( button_updata == 0 ){
		let input_msg = msg;		// 選択を起動させた元のメッセージ
		msg.reply({ content: text, components: [row] })
			.then(async function (msg) {
				let main_msg_id = msg.id;
				setTimeout( async function(){
					try{
						msg.delete()
							.then(msg => console.log(`Deleted message from ${msg.author.username}`))
							.catch(console.error);
						let select_msg = await msg.channel.messages.fetch(msg.id);
						if( !(select_msg.content.match( /選択終了だね/ )) ){
							input_msg.reply("入力を中止したよ");
							input_msg.react("❌");
						}
					}
					catch{
						console.log("try-catch delete error");
					}
				}, 20000);
			})
			.catch(function() {
				console.log("リプライエラー")
				//Something
			});

	}
	// 更新
	else{
		button_updata.update({ content: text, components: [row] })
			.then(async function (button_updata) {
				// 特に処理はないかな
			})
			.catch(function() {
				console.log("アップデートエラー")
				//Something
			});
	}
}


module.exports = {
	Interaction_Button,
}

