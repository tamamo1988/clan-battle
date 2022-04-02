'use strict';

const cmd = require('./set');

async function Main_Name(msg, text){

	let [user_id, user_name] = cmd.Set_Id(msg);

	text = text.replace("　", " ");	// 全角スペースを半角に
	text = text.replace(/ +/g, " ");	// 半角スペースが複数あったらひとつに
	text = text.replace(/\//g, "");	// スラッシュ削除

	// コマンドや名前などを算出
	let DataAry = text.split(/ /);
	let command = DataAry[0];
	let name = DataAry[1];
	let DataAry_Sub = [];
	for( let i = 2; i < DataAry.length; i++ ){
		DataAry_Sub.push(DataAry[i]);	// ニックネーム、あるいはID
	}
	console.log(command);

	let battle_schedule = cmd.Folder(msg.guildId);
	// メンバーファイルを読み込む
	let data = '';
	let datafile = battle_schedule + "\/" + 'member.txt';
	data = await cmd.Read_File(datafile);

	if( data == '' && command != 'name_regist' ){
		msg.reply(`弟くん、メンバーデータがないよ`);
		return;
	}

	// メンバーデータ整理
	DataAry = data.split('\n');
	DataAry = DataAry.filter(Boolean);	// 空白削除
	if( DataAry.length >= 30 && command == 'name_regist' ){
		msg.reply(`弟くん、これ以上メンバーは登録できないよ`);
		return;
	}

	let ValueAry = [];
	let NAME = [];
	for( let i = 0; i < DataAry.length; i++ ){
		ValueAry = DataAry[i].split('\t');
		ValueAry = ValueAry.filter(Boolean);	// 空白削除
		let name_sub = ValueAry[0];
		let id = ValueAry[1];
		NAME[name_sub] = name_sub;	// 連想配列的にニックネームから名前を算出
		for( let j = 2; j < ValueAry.length; j++ ){
			NAME[ValueAry[j]] = name_sub;	// 連想配列的にニックネームから名前を算出
		}
		if( command == 'name' && (name == undefined || name == "-null-") ){	// 名前表示で名前がない場合は
			if( user_id == id ){
				name = name_sub;	// 見つかったら名前を入れる
			}
		}
	}

	// 前処理
	let file_write_flag = 0;	// ファイル書き込み用のフラグ
	let name_flag = 0;			// 名前が存在しているかいないか

	let nickname_text = '';	// メッセージ用のテキスト
	let nickname_flag = 0;	// ニックネームが存在しているかいないか
	let NickNameList = [];	// 保持しておくニックネームのリスト
	for( let i = 0; i < DataAry.length; i++ ){
		ValueAry = DataAry[i].split('\t');
		ValueAry = ValueAry.filter(Boolean);	// 空白削除
		let main_name = ValueAry[0];
		// 登録用処理
		if( user_id == ValueAry[1] && name == undefined && command == 'name_regist' ){
			name_flag = 1;	// IDが存在している
		}
		else if( NAME[name] == ValueAry[0] ){	// 名前あるいはあだ名が存在
			name_flag = 1;					// 名前が存在している
			// ニックネーム表示の場合
			if( command == 'name' ){
				for( let j = 2; j < ValueAry.length; j++ ){
					nickname_flag = 1;
					nickname_text += `${ValueAry[j]}と`;
				}
				// ニックネームがある
				if( nickname_flag ){
					nickname_text = nickname_text.slice(0, -1);
					msg.reply(`弟くん、${main_name}さんには${nickname_text}のニックネームがあるよ`);
					return;
				}
				// ニックネームがない
				else{
					msg.reply(`弟くん、${main_name}さんにニックネームはないみたいだよ`);
					return;
				}
			}
			// ニックネーム追加の場合
			else if( command == 'name_add' ){
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
					if( DataAry[i].slice(-1) != "\t" ){	DataAry[i] += "\t";	}	// 最後がタブじゃなかったらタブを追加
					DataAry[i] += `${NickNameList[j]}\t`;
				}
				// ニックネーム追加
				if( NickNameList.length ){
					file_write_flag = 1;
					nickname_text = nickname_text.slice(0, -1);
					msg.reply(`弟くん、${main_name}さんに${nickname_text}のニックネームを追加したよ`);
				}
				// ニックネーム追加できなかった
				else{
					if( nickname_flag == 1 ){
						msg.reply(`弟くん、被ってて${main_name}さんにニックネームを追加できなかったよ……`);
						return;
					}
					else if( nickname_flag == 2 ){
						msg.reply(`弟くん、元より長くて${main_name}さんにニックネームを追加できなかったよ……`);
						return;
					}
				}
			}
			// ニックネーム削除
			else if( command == 'name_del' ){
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
					DataAry[i] = DataAry[i].replace(`${NickNameList[j]}\t`, '');	// そのニックネームを削除する
				}
				// ニックネーム削除
				if( NickNameList.length ){
					file_write_flag = 1;
					nickname_text = nickname_text.slice(0, -1);	// 『～～と』の「と」を削除
					msg.reply(`弟くん、${main_name}さんから${nickname_text}のニックネームを削除したよ`);
				}
				// ニックネーム削除できなかった
				else{
					msg.reply(`弟くん、${main_name}さんのニックネームを削除できなかったよ……`);
					return;
				}
			}
			// 登録を抹消
			else if( command == 'name_erase' ){
				file_write_flag = 1;
				DataAry[i] = '';	// その人を抹消する
				msg.reply(`弟くん、${main_name}さんの登録を抹消したよ`);
			}
			// ひとつでも見つけたら止める
			break;
		}
	}

	// 抹消するために名前が存在していなかった
	if( command == 'name_erase' && name_flag == 0 ){
		msg.reply(`弟くん、${name}さんの名前が見つからないよ？`);
		return;
	}
	// 名前が存在しない
	else if( command == 'name_add' && name_flag == 0 ){
		msg.reply(`弟くん、その名前の人が見当たらないよ`);
		return;
	}
	// 名前が存在しない
	else if( command == 'name_del' && name_flag == 0 ){
		msg.reply(`弟くん、その名前の人が見当たらないよ`);
		return;
	}

	// 登録するために名前が存在していた
	if( command == 'name_regist' ){
		if( name_flag == 1 ){
			if( name ){	// 名前が指定されている
	        	msg.reply(`その人はもう登録されてるよ`);
				return;
			}
			else{
	        	msg.reply(`弟くんはもう登録されてるよ`);
				return;
			}
		}
		else{
			if( name ){	// 名前が指定されている
				if( DataAry_Sub[0] == undefined ){	// IDが指定されていない
					msg.reply(`${name}くんを代理登録するのには18桁のIDが必要だよ`);
					return;
				}
				else if( DataAry_Sub[0].match(/^\d{18}$/) ){	// IDが18桁
					file_write_flag = 1;
					DataAry.push(`${name}\t${DataAry_Sub[0]}\t`)
					msg.reply(`${name}くんを登録したよ！　ようこそ${msg.guild.name}へ！`);
				}
				else{
					msg.reply(`${name}くんを代理登録するのには18桁のIDが必要だよ`);
					return;
				}
			}
			else{		// 名前が指定されていない本人による登録
				file_write_flag = 1;
				let regist_name = '';
				if( msg.member.nickname == null ){	// サーバー内でニックネームがない
					regist_name = user_name;
				}
				else{								// サーバー内でニックネームがある
					regist_name = msg.member.nickname;
				}
				DataAry.push(`${regist_name}\t${user_id}\t`)
				msg.reply(`弟くんを登録したよ！　ようこそ${msg.guild.name}へ！`);
			}
		}
	}

	let data_text = '';
	DataAry = DataAry.filter(Boolean);	// 空白削除
	for( let i = 0; i < DataAry.length; i++ ){
		data_text += DataAry[i] + "\n";
	}

	// メンバーファイル記入
	await cmd.Write_File(datafile, data_text);

	return;
}


module.exports = {
	Main_Name,
}
