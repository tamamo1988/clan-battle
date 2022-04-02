'use strict';

const cmd = require('./set');

async function Command_Func(Boss_Name){

	let data = [
		{
			"name": "d",
			"description": "ダメージの入力を行う",
			"options": 
			[{
				"name": "ダメージ",		"description": "ダメージ数値",
				"type": 4,	"required": true,
			},
			{
				"name": "ボス",	"description": "ボスの入力",
				"type": 3,	"required": true,
				"choices": 
				[{"name": `${Boss_Name[0]}`,	"value": "1"},
				{"name": `${Boss_Name[1]}`,"value": "2"},
				{"name": `${Boss_Name[2]}`,"value": "3"},
				{"name": `${Boss_Name[3]}`,"value": "4"},
				{"name": `${Boss_Name[4]}`,"value": "5"}]
			},
			{
				"name": "凸番号",	"description": "凸番号の入力",
				"type": 3,	"required": true,
				"choices": 
				[{"name": "1凸","value": "1"},
				{"name": "2凸","value": "2"},
				{"name": "3凸","value": "3"}]
			},
			{
				"name": "代理",	"description": "代理の名前（省略可）",
				"type": 3,	"required": false,
			},
			{
				"name": "日付",	"description": "日付の数字（省略可）",
				"type": 4,	"required": false,
			},
			{
				"name": "残り時間",	"description": "残り時間の入力（省略可）",
				"type": 3,	"required": false,
			}]
		},
		{
			"name": "kill",
			"description": "ダメージの入力（討伐）を行う",
			"options": 
			[{
				"name": "ボス",	"description": "ボスの入力",
				"type": 3,	"required": true,
				"choices": 
				[{"name": `${Boss_Name[0]}`,	"value": "1"},
				{"name": `${Boss_Name[1]}`,"value": "2"},
				{"name": `${Boss_Name[2]}`,"value": "3"},
				{"name": `${Boss_Name[3]}`,"value": "4"},
				{"name": `${Boss_Name[4]}`,"value": "5"}]
			},
			{
				"name": "凸番号",	"description": "凸番号の入力",
				"type": 3,	"required": true,
				"choices": 
				[{"name": "1凸","value": "1"},
				{"name": "2凸","value": "2"},
				{"name": "3凸","value": "3"}]
			},
			{
				"name": "代理",	"description": "代理の名前（省略可）",
				"type": 3,	"required": false,
			},
			{
				"name": "日付",	"description": "日付の数字（省略可）",
				"type": 4,	"required": false,
			},
			{
				"name": "残り時間",	"description": "残り時間の入力（省略可）",
				"type": 3,	"required": false,
			}]
		},
		{
			"name": "del",
			"description": "ダメージの削除を行う",
			"options": 
			[{
				"name": "名前",		"description": "対象者の名前（省略可）",
				"type": 3,	"required": false,
			}]
		},
		{
			"name": "re",
			"description": "ダメージの修正・入替を行う（コマンドのみで入れ替え）",
			"options": 
			[{
				"name": "ダメージ",		"description": "ダメージ数値（省略可）",
				"type": 4,	"required": false,
			},
			{
				"name": "ボス",	"description": "ボスの入力（省略可）",
				"type": 3,	"required": false,
				"choices": 
				[{"name": `${Boss_Name[0]}`,	"value": "1"},
				{"name": `${Boss_Name[1]}`,"value": "2"},
				{"name": `${Boss_Name[2]}`,"value": "3"},
				{"name": `${Boss_Name[3]}`,"value": "4"},
				{"name": `${Boss_Name[4]}`,"value": "5"}]
			},
			{
				"name": "凸番号",	"description": "凸番号の入力（省略可）",
				"type": 3,	"required": false,
				"choices": 
				[{"name": "1凸","value": "1"},
				{"name": "2凸","value": "2"},
				{"name": "3凸","value": "3"}]
			},
			{
				"name": "代理",	"description": "名前（省略可）",
				"type": 3,	"required": false,
			}]
		},
		{
			"name": "now",
			"description": "残凸状況を更新する",
			"options": 
			[{
				"name": "日付",		"description": "更新したい日付（省略可）",
				"type": 4,	"required": false,
			}]
		},
		{
			"name": "start",
			"description": "開催日と開催期間を設定する",
			"options": 
			[{
				"name": "開始日",		"description": "開始日",
				"type": 4,	"required": true,
			},
			{
				"name": "期間",		"description": "期間",
				"type": 4,	"required": true,
			}]
		},
		{
			"name": "level",
			"description": "段階毎の開始周回数を設定する",
			"options": 
			[{
				"name": "level2",		"description": "第2段階開始周",
				"type": 4,	"required": true,
			},
			{
				"name": "level3",		"description": "第3段階開始周",
				"type": 4,	"required": true,
			},
			{
				"name": "level4",		"description": "第4段階開始周",
				"type": 4,	"required": true,
			},
			{
				"name": "level5",		"description": "第5段階開始周",
				"type": 4,	"required": true,
			}]
		},
		{
			"name": "time",
			"description": "最新の討伐か指定した凸番号に残り時間を設定する",
			"options": 
			[{
				"name": "残り時間",		"description": "残り時間の入力",
				"type": 3,	"required": true,
			},
			{
				"name": "凸番号",	"description": "凸番号の入力（省略可）",
				"type": 3,	"required": false,
				"choices": 
				[{"name": "1凸","value": "1"},
				{"name": "2凸","value": "2"},
				{"name": "3凸","value": "3"}]
			}]
		},
		{
			"name": "name",
			"description": "省略した名前の追加・削除・表示を入力する",
			"options": 
			[{
				"name": "type",	"description": "処理",
				"type": 3,	"required": true,
				"choices": 
				[{"name": "add",	"value": "name_add"},
				{"name": "del","value": "name_del"},
				{"name": "default","value": "name"},
				{"name": "regist","value": "name_regist"},
				{"name": "erase","value": "name_erase"}]
			},
			{
				"name": "target",		"description": "対象者の名前（省略可）",
				"type": 3,	"required": false,
			},
			{
				"name": "nickname",	"description": "追加削除する省略名（省略可）",
				"type": 3,	"required": false,
			},]
		},
		{
			"name": "boss",
			"description": "ボスの登録や省略した名前の追加・削除・表示を入力する",
			"options": 
			[{
				"name": "type",	"description": "処理",
				"type": 3,	"required": true,
				"choices": 
				[{"name": "regist",	"value": "boss_regist"},
				{"name": "add","value": "boss_add"},
				{"name": "del","value": "boss_del"},
				{"name": "default","value": "boss"}]
			},
			{
				"name": "target",		"description": "対象のボス名",
				"type": 3,	"required": true,
			},
			{
				"name": "nickname",	"description": "追加削除する省略名（省略可）",
				"type": 3,	"required": false,
			},]
		},
		{
			"name": "boss_kill",
			"description": "自身かあるいは指定した人が倒したボスを表示する",
			"options": 
			[{
				"name": "対象名",		"description": "対象の名前（省略可）",
				"type": 3,	"required": false,
			},
			{
				"name": "日付",	"description": "対象の日付 形式:202101 （省略可）",
				"type": 3,	"required": false,
			}]
		},
		{
			"name": "info",
			"description": "情報の表示や入力を行う",
			"options": 
			[{
				"name": "type",	"description": "処理",
				"type": 3,	"required": true,
				"choices": 
				[{"name": "add",	"value": "info_add"},
				{"name": "del","value": "info_del"},
				{"name": "updata","value": "info_updata"},
				{"name": "default","value": "info"}]
			},
			{
				"name": "contents",		"description": "内容（省略可）",
				"type": 3,	"required": false,
			},
			{
				"name": "start",	"description": "開始日時（省略可）",
				"type": 3,	"required": false,
			},
			{
				"name": "end",	"description": "終了日時（省略可）",
				"type": 3,	"required": false,
			}]
		},
		{
			"name": "main_info",
			"description": "その日のキャンペーン情報などを表示する",
		},
		{
			"name": "notice",
			"description": "現時点でのキャンペーンがあれば通知する",
		},
		{
			"name": "result",
			"description": "今月のクランバトルの結果を表示する",
		},
		{
			"name": "mark",
			"description": "予約簡易入力を構成する",
		},
		{
			"name": "reserve",
			"description": "予約の入力を行う",
			"options": 
			[{
				"name": "ボス",	"description": "ボスの選択",
				"type": 3,	"required": true,
				"choices": 
				[{"name": `${Boss_Name[0]}`,	"value": "1"},
				{"name": `${Boss_Name[1]}`,"value": "2"},
				{"name": `${Boss_Name[2]}`,"value": "3"},
				{"name": `${Boss_Name[3]}`,"value": "4"},
				{"name": `${Boss_Name[4]}`,"value": "5"}]
			},
			{
				"name": "タイプ",	"description": "物理・魔法の選択（省略可）",
				"type": 3,	"required": false,
				"choices": 
				[{"name": "物理","value": "物理"},
				{"name": "魔法","value": "魔法"},
				{"name": "特殊","value": "特殊"}]
			},
			{
				"name": "凸タイミング",	"description": "凸タイミングの選択（省略可）",
				"type": 3,	"required": false,
				"choices": 
				[{"name": "次","value": "次"},
				{"name": "次々","value": "次々"},
				{"name": "希望","value": "希望"}]
			},
			{
				"name": "予定ダメージ",	"description": "予定ダメージの入力（省略可）",
				"type": 4,	"required": false,
			}]
		},
		{
			"name": "battle",
			"description": "凸宣言の入力を行う",
			"options": 
			[{
				"name": "ボス",	"description": "ボスの入力",
				"type": 3,	"required": true,
				"choices": 
				[{"name": `${Boss_Name[0]}`,	"value": "1"},
				{"name": `${Boss_Name[1]}`,"value": "2"},
				{"name": `${Boss_Name[2]}`,"value": "3"},
				{"name": `${Boss_Name[3]}`,"value": "4"},
				{"name": `${Boss_Name[4]}`,"value": "5"}]
			},
			{
				"name": "凸番号",	"description": "凸番号の入力",
				"type": 3,	"required": true,
				"choices": 
				[{"name": "1凸","value": "1"},
				{"name": "2凸","value": "2"},
				{"name": "3凸","value": "3"}]
			}]
		},
		{
			"name": "copy",
			"description": "先月のメンバーデータ等をコピーする",
		},
		{
			"name": "calc1",
			"description": "ダメージ超過分から持ち越し時間を算出する",
			"options": 
			[{
				"name": "ボス",	"description": "ボスの入力",
				"type": 3,	"required": true,
				"choices": 
				[{"name": `${Boss_Name[0]}`,	"value": "1"},
				{"name": `${Boss_Name[1]}`,"value": "2"},
				{"name": `${Boss_Name[2]}`,"value": "3"},
				{"name": `${Boss_Name[3]}`,"value": "4"},
				{"name": `${Boss_Name[4]}`,"value": "5"}]
			},
			{
				"name": "削りダメージ",	"description": "削りダメージの入力",
				"type": 3,	"required": true,
			},
			{
				"name": "トドメダメージ",	"description": "トドメダメージの入力",
				"type": 3,	"required": true,
			}]
		},
		{
			"name": "calc2",
			"description": "フルで残すために必要なトドメのダメージを算出する",
			"options": 
			[{
				"name": "ボス",	"description": "ボスの入力",
				"type": 3,	"required": true,
				"choices": 
				[{"name": `${Boss_Name[0]}`,	"value": "1"},
				{"name": `${Boss_Name[1]}`,"value": "2"},
				{"name": `${Boss_Name[2]}`,"value": "3"},
				{"name": `${Boss_Name[3]}`,"value": "4"},
				{"name": `${Boss_Name[4]}`,"value": "5"}]
			},
			{
				"name": "削りダメージ",	"description": "削りダメージの入力",
				"type": 3,	"required": true,
			}]
		},
		{
			"name": "calc3",
			"description": "フルで残すために必要な削りダメージを算出する",
			"options": 
			[{
				"name": "ボス",	"description": "ボスの入力",
				"type": 3,	"required": true,
				"choices": 
				[{"name": `${Boss_Name[0]}`,	"value": "1"},
				{"name": `${Boss_Name[1]}`,"value": "2"},
				{"name": `${Boss_Name[2]}`,"value": "3"},
				{"name": `${Boss_Name[3]}`,"value": "4"},
				{"name": `${Boss_Name[4]}`,"value": "5"}]
			},
			{
				"name": "トドメダメージ",	"description": "トドメダメージの入力",
				"type": 3,	"required": true,
			}]
		},
		{
			"name": "calc1_sub",
			"description": "ダメージ超過分から持ち越し時間を算出する（HP手動）",
			"options": 
			[{
				"name": "ボス",	"description": "指定の現在HPを入力する",
				"type": 3,	"required": true,
			},
			{
				"name": "削りダメージ",	"description": "削りダメージの入力",
				"type": 3,	"required": true,
			},
			{
				"name": "トドメダメージ",	"description": "トドメダメージの入力",
				"type": 3,	"required": true,
			}]
		},
		{
			"name": "init",
			"description": "今月の進行や予約等のデータを初期化する",
		},
		{
			"name": "help",
			"description": "ヘルプを表示する",
		},
		{
			"name": "db",
			"description": "指定されたデータベースを更新する",
			"options": 
			[{
				"name": "database_key",		"description": "更新したいkey",
				"type": 3,	"required": true,
			}]
		},
		{
			"name": "sign",
			"description": "指定されたデータベースを表示する",
			"options": 
			[{
				"name": "database_key",		"description": "表示したいkey",
				"type": 3,	"required": true,
			}]
		}
	];

	return data;
}


module.exports = {
	Command_Func
}

