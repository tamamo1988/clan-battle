'use strict';

// GoogleSpreadSheet
const { GoogleSpreadsheet } = require('google-spreadsheet');
//const CREDIT = require('./google-generated-creds-674861392930799639.json');		// 認証情報jsonファイルを読み込む	// OR load directly from json file if not in secure environment
//const GSS_KEY = '19TZDuCXdA_BXh0jr9MkXLcftD9rmNJ8lSXFeBhl-miY';	// スプレッドシートキー
// 以下ノイエスさんの方
const CREDIT = require('./google-generated-creds.json');		// 認証情報jsonファイルを読み込む	// OR load directly from json file if not in secure environment
const GSS_KEY = '1P1qSFzzOtt0ZzTanQxuT9oJxcQPS7TiwzhqfkzLbCmw';	// スプレッドシートキー
const doc = new GoogleSpreadsheet(GSS_KEY);											// 閲覧権限を与えておく.
const MEMBER_SHEETTITLE = 'メンバー&キャラ所持状況';											// シートタイトル
const REGIST_CHARA_NUM = 14;	// 登録キャラ名
const DAMAGE_SHEETTITLE = '凸記録_';											// シートタイトル


// ダメージをスプレッドシートに記入する
async function Damage_Regist(msg, damage, round, boss_counter, over, attack_name, designated_date){
	// damage そのまま
	// round 1から開始
	// boss_counter 0から開始
	// over 0何もなし 1持ち越し 2討伐フラグ
	// サービスアカウントによる認証
	
	await doc.useServiceAccountAuth({
			//client_email: CREDIT.client_email,
			//private_key: CREDIT.private_key.replace(/\\n/g, '\n')
			client_email: CREDIT.client_email,
			private_key: CREDIT.private_key,
	});

	// loads document properties and worksheets
	/*await doc.loadInfo()
		.then(async function (msg) {
			console.log("スプレッドシートタイトル：" + doc.title);
		}).catch(function() {
			console.log("ERROR");
			return;
		});*/
	await doc.loadInfo();

	let today = new Date();
	today.setTime(today.getTime() + 1000*60*60*9);// JSTに変換
	//console.log("TODAY:" + today);
	let month = today.getMonth() + 1;
	let day = today.getDate();
	let hours = today.getHours();
	let minutes = today.getMinutes();
	if( hours < 5 ){ day -= 1; }
	
	if( designated_date ){ day = designated_date; } // 日付強制指定の場合
	//console.log(month + ":" + day + ":" + hours + ":" + minutes);
	let formatted = month + "月" + day + "日";
	//formatted = "原本";	// テスト用あとで外す
	//console.log(formatted);
	//return;

	// 凸記録用のシートタイトルを探す
	let sheet;
	let cancel_flag;
	
	/*damage = 1000000;
	round = 5;
	boss_counter = 2;
	over = 1;*/
	//console.log( "AAAA:" + damage + ":" + round + ":" + boss_counter + ":" + over )

	for (let s = 0; s < doc.sheetCount; ++s ) {
		sheet = doc.sheetsByIndex[s]; // or use doc.sheetsById[id]
		let sheet_name = DAMAGE_SHEETTITLE + formatted;
		//console.log(sheet_name)
		if( sheet.title == sheet_name ){
			cancel_flag = 1;
			break;
		}
	}
	if( !cancel_flag ){
	console.log("ダメージシートが見つからない")
		//await msg.reply("弟くん、ダメージ用のシートが見つからないよ");
		return;
	}
	console.log("シートタイトル：" + sheet.title);
	console.log("行カウント：" + sheet.rowCount);

	let member_cel;	// メンバーの書かれているセルデータ格納
	let member_name; // スプシ側の名前
	let msg_name = attack_name;	// 書いてきた人の名前
	
	console.log("GSS_NAME:" + msg_name);
	msg_name = msg_name.replace( /「/g, "" );
	msg_name = msg_name.replace( /」/g, "" );
	//console.log("名前：" + msg_name);

	let cel;					// セルの内容
	let cel_row;			// セルの座標記憶
	let cel_col;			// セルの座標記憶

	let msg_text = msg.content.replace( /\[DAM\]/g, "" );	// メッセージ内容

	//console.log(sheet.rowCount);

	const { title, lastColumnLetter, rowCount } = sheet;
	//console.log("lastColumnLetter" + sheet.lastColumnLetter);
	//console.log("rowCount:" + sheet.rowCount);

	// 記入した人がいるかどうかを調べるのみ
	await sheet.loadCells(`A1:A${rowCount}`); // loads a range of cells
	for( let r = 0; r < sheet.rowCount - 1; r++ ){	// 行
		member_cel = await sheet.getCell(r, 0); // 名前の列
		member_name = member_cel.value;
		if( member_cel.value == '現在の凸数合計' ){	break;	}	// さっさと終わらせる
		if( member_name != null ){
			member_name = member_name.replace( /「/g, "" );
			member_name = member_name.replace( /」/g, "" );
		}
		if( member_name == msg_name ){
			cel_row = r;
			member_name = member_cel.value;	// 戻す
			console.log("r:" + r + ":" + member_name);
			break;
		}
	}

	// ボスのダメージを調べる
	let write_col = 5 + ((round - 1) * 5) + boss_counter;	// 検索する列番号を計算
	let col_text = await Excel_Coordinate(write_col);	// ボスの列をexcel用の文字列に変換
	console.log("A:" + write_col + ":" + col_text)
	await sheet.loadCells(`${col_text}1:${col_text}53`); // loads a range of cells	35行目まで
	for( let c = 0; c < 16; c++ ){ // 列 現在各ボスに8人まで対応
		let c2 = 3 + c * 3;
		cel = await sheet.getCell(c2, write_col); // 名前のセル
		if( cel.value == null ){	// 何もなかったらそこに入力
			cel.value = member_name;
			cel = await sheet.getCell(c2 + 1, write_col); // ダメージのセル
			cel.value = damage * 1;
			cel = await sheet.getCell(c2 + 2, write_col); // 持ち越し関連のセル
			if( over == 0 ){	// 何もなし
				cel.value = '';
			}
			else if( over == 1 ){	// 持ち越し消化
				cel.value = '持ち越し消化';
			}
			else if( over == 2 ){	// 討伐して持ち越し発生
				cel.value = '持ち越し発生';
			}
			await sheet.saveUpdatedCells(); // save all updates in one call
			break;
		}
	}

	//console.log(sheet.cellStats); // total cells, loaded, how many non-empty
	//await msg.reply("弟くん、仲間の人たちを登録したよ\n```markdown\n" + chara_name_list + '```');
	//console.log("end")
}


// ダメージをスプレッドシートから消す
async function Damage_Delete(msg, round, boss_counter, attack){

	// サービスアカウントによる認証
	await doc.useServiceAccountAuth({
			client_email: CREDIT.client_email,
			private_key: CREDIT.private_key,
	});

	// loads document properties and worksheets
	await doc.loadInfo();

	console.log("スプレッドシートタイトル：" + doc.title);

	let today = new Date();
	today.setTime(today.getTime() + 1000*60*60*9);// JSTに変換
	//console.log("TODAY:" + today);
	let month = today.getMonth() + 1;
	let day = today.getDate();
	let hours = today.getHours();
	let minutes = today.getMinutes();
	if( hours < 5 ){ day -= 1; }
	//console.log(month + ":" + day + ":" + hours + ":" + minutes);
	let formatted = month + "月" + day + "日";
	//formatted = "原本";	// テスト用あとで外す
	//console.log(formatted);
	//return;

	// 凸記録用のシートタイトルを探す
	let sheet;
	let cancel_flag;

	for (let s = 0; s < doc.sheetCount; ++s ) {
		sheet = doc.sheetsByIndex[s]; // or use doc.sheetsById[id]
		let sheet_name = DAMAGE_SHEETTITLE + formatted;
		//console.log(sheet_name)
		if( sheet.title == sheet_name ){
			cancel_flag = 1;
			break;
		}
	}
	if( !cancel_flag ){
		console.log("ダメージシートが見つからない")	
		//await msg.reply("弟くん、ダメージ用のシートが見つからないよ");
		return;
	}
	console.log("シートタイトル：" + sheet.title);
	console.log("行カウント：" + sheet.rowCount);

	let cel;					// セルの内容
	let cel_row;			// セルの座標記憶
	let cel_col;			// セルの座標記憶

	let msg_text = msg.content.replace( /\[DAM\]/g, "" );	// メッセージ内容

	const { title, lastColumnLetter, rowCount } = sheet;

	// delをするセルを探してダメージを消す処理
	let write_col = 5 + ((round - 1) * 5) + boss_counter * 1;	// 検索する列番号を計算
	let col_text = await Excel_Coordinate(write_col);	// ボスの列をexcel用の文字列に変換
	console.log("cell:" + write_col + ":" + col_text)
	await sheet.loadCells(`${col_text}1:${col_text}53`); // loads a range of cells	35行目まで

	let c2 = 3 + (attack - 1) * 3; // 攻撃回数
	console.log("cell-2/" + attack + ":" + c2 );
	cel = await sheet.getCell(c2, write_col); // 名前のセル
	cel.value = "";
	cel = await sheet.getCell(c2 + 1, write_col); // ダメージのセル
	cel.value = "";
	cel = await sheet.getCell(c2 + 2, write_col); // 持ち越し関連のセル
	cel.value = "";
	await sheet.saveUpdatedCells(); // save all updates in one call

	//console.log(sheet.cellStats); // total cells, loaded, how many non-empty
	//await msg.reply("弟くん、仲間の人たちを登録したよ\n```markdown\n" + chara_name_list + '```');
	//console.log("end")
}
 

// 列記号を数字に変換する
var Excel_Coordinate = async function(number){
	let text = '';
	let digit = '';
	let double_digit = '';
	let digit_text = '';
	let double_digit_text = '';
	let temp_digit = '';
	let temp_digit_text = '';
	let max = 1;
	// 26以上なら
	if( number / 26 ){
		double_digit = Math.floor(number / 26);	// 10桁以上の数字
		//console.log(double_digit);
	}
	digit = number % 26;	// 一桁
	if( double_digit > 0 ){ max = 2; }
	for( let x = 0; x < max; x++ ){
		if( x == 0 )			{ temp_digit = digit; }
		else if( x == 1 ) { temp_digit = double_digit - 1; }	// 二桁目は0がAではなく1がA 2がBといった状態となる

		if( temp_digit == 0 )			{ temp_digit_text = 'A'; }
		else if( temp_digit == 1 ) { temp_digit_text = 'B'; }
		else if( temp_digit == 2 ) { temp_digit_text = 'C'; }
		else if( temp_digit == 3 ) { temp_digit_text = 'D'; }
		else if( temp_digit == 4 ) { temp_digit_text = 'E'; }
		else if( temp_digit == 5 ) { temp_digit_text = 'F'; }
		else if( temp_digit == 6 ) { temp_digit_text = 'G'; }
		else if( temp_digit == 7 ) { temp_digit_text = 'H'; }
		else if( temp_digit == 8 ) { temp_digit_text = 'I'; }
		else if( temp_digit == 9 ) { temp_digit_text = 'J'; }
		else if( temp_digit == 10 ){ temp_digit_text = 'K'; }
		else if( temp_digit == 11 ){ temp_digit_text = 'L'; }
		else if( temp_digit == 12 ){ temp_digit_text = 'M'; }
		else if( temp_digit == 13 ){ temp_digit_text = 'N'; }
		else if( temp_digit == 14 ){ temp_digit_text = 'O'; }
		else if( temp_digit == 15 ){ temp_digit_text = 'P'; }
		else if( temp_digit == 16 ){ temp_digit_text = 'Q'; }
		else if( temp_digit == 17 ){ temp_digit_text = 'R'; }
		else if( temp_digit == 18 ){ temp_digit_text = 'S'; }
		else if( temp_digit == 19 ){ temp_digit_text = 'T'; }
		else if( temp_digit == 20 ){ temp_digit_text = 'U'; }
		else if( temp_digit == 21 ){ temp_digit_text = 'V'; }
		else if( temp_digit == 22 ){ temp_digit_text = 'W'; }
		else if( temp_digit == 23 ){ temp_digit_text = 'X'; }
		else if( temp_digit == 24 ){ temp_digit_text = 'Y'; }
		else if( temp_digit == 25 ){ temp_digit_text = 'Z'; }

		if( x == 0 )			{ digit_text = temp_digit_text; }
		else if( x == 1 ) { double_digit_text = temp_digit_text; }
	}
	text = double_digit_text + digit_text;
	return text;
}


module.exports = {
	Damage_Regist,
	Damage_Delete
}
