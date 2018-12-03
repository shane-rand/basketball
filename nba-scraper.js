'use strict';

const tabletojson = require('tabletojson');
const fs = require('fs');
const Promise = require('promise');
const math = require('mathjs');
const sqlite3 = require('sqlite3').verbose();

var newPlayerData = [];
var baseURL = 'https://www.basketball-reference.com/players/';
var playerJSON = require('./players.json');

var newPlayerData = [];
var promises = [];
var headers = ["G","Date","Age","tm","at","Opp","WinLoss","GS","MP","FG","FGA","FGPercent","ThreeP","ThreePA","ThreePercentage","FT","FTA","FTPercentage","ORB","DRB","TRB","AST","STL","BLK","TOV","PF","PTS","GmSc","PlusMinus"];
var createPlayersTableSql = "CREATE TABLE players(id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR, team VARCHAR, gamelog_url VARCHAR,created_at DATETIME,updated_at DATETIME);";
var createGameLogTableSql = "CREATE TABLE gamelog(id INTEGER PRIMARY KEY AUTOINCREMENT";
console.log(headers.length);
for(var k=0;k<headers.length;k++) {
  console.log(headers[k]);
  var column = headers[k];
  createGameLogTableSql += `, ${column} VARCHAR`;
}
createGameLogTableSql+=`);`;

var db = new sqlite3.Database('./nba-players',sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the database.');
});

db.serialize(function() {
  db.run("DROP TABLE IF EXISTS players;",function(err){
    if (err) {
      return console.error(err.message);
    }
    console.log('Dropped players table.');
  });
  db.run("DROP TABLE IF EXISTS gamelog;",function(err){
    if (err) {
      return console.error(err.message);
    }
    console.log('Dropped gamelog table.');
  });
  db.run(createPlayersTableSql,function(err){
    if (err) {
      return console.error(err.message);
    }
    console.log('Created gamelog table.');
  });
  console.log(createGameLogTableSql);
  db.run(createGameLogTableSql,function(err){
    if (err) {
      return console.error(err.message);
    }
    console.log('Created gamelog table.');
  });
});


generate(playerJSON);

Promise.all(promises).then(function() {
  db.close();
  //createFile("player-game-logs",newPlayerData);
});

function generate(playerData) {
  for(var i=0;i<playerData.length;i++) {
    promises.push(new Promise(function (resolve, reject) {
      setTimeout(createPlayer.bind(this,playerData[i], resolve),700*i);
    }));
  }
}

function createPlayer(playerData, resolve) {
  var player = {
    "id":null,
    "name": null,
    "url": null,
    gameData: []
  };
  player.id = playerData.Rk;
  player.name = playerData.Player.split('\\')[0];

  var playerURL = playerData.Player.split('\\')[1];
  var playerSection = playerURL.charAt(0)+'/';
  player.url = baseURL+playerSection+playerURL+'/gamelog/2019/';

  tabletojson.convertUrl(player.url,{headings:["G","Date","Age","tm","at","Opp","WinLoss","GS","MP","FG","FGA","FGPercent","3P","3PA","3Percentage","FT","FTA","FTPercentage","ORB","DRB","TRB","AST","STL","BLK","TOV","PF","PTS","GmSc","PlusMinus"]},function(tablesAsJson) {
      console.log("getting data for: ",player.name);
      player.gameData = tablesAsJson[7];
      console.log(player.gameData);
      newPlayerData.push(player);
      db.serialize(function() {
        var sql = `INSERT INTO players (name,team,gamelog_url) VALUES('${player.name}','${player.gameData[0].tm}','${player.url}');`;
        var stmt = db.prepare(sql);
        stmt.run(function(err){
          console.log(err);
        });
        stmt.finalize();
      });

      for(var j=0;j<player.gameData;j++) {
        var gameLog = player.gameData[j];
        var parsedThreePointersMade = gameLog['3P'];
        var parsedThreePointersAttempted = gameLog['3PA'];
        var parsedThreePointersPercentage = gameLog['3Percentage'];

        db.serialize(function() {
          var sql = `INSERT INTO gamelogs VALUES('${gameLog.G}','${gameLog.Date}','${gameLog.Age}','${gameLog.tm}','${gameLog.at}','${gameLog.Opp}','${gameLog.WinLoss}','${gameLog.GS}','${gameLog.MP}','${gameLog.FG}','${gameLog.FGA}','${gameLog.FGPercent}','${parsedThreePointersMade}','${parsedThreePointersAttempted}','${parsedThreePointersPercentage}','${gameLog.FT}','${gameLog.FTA}','${gameLog.FTPercentage}','${gameLog.ORB}','${gameLog.DRB}','${gameLog.TRB}','${gameLog.AST}','${gameLog.STL}','${gameLog.BLK}','${gameLog.TOV}','${gameLog.PF}','${gameLog.PTS}','${gameLog.GmSc}','${gameLog.PlusMinus}');`;
          var stmt = db.prepare(sql);
          stmt.run(function(err){
            console.log(err);
          });
          stmt.finalize();
        });
      }

      resolve();
  }).catch(function(error) {
      console.log(error);
      resolve();
  });
}

function createFile(filename,data) {

  for(var i=0;i<data.length;i++) {
    var gameData = data[i].gameData;
    var fptsArray = [];
    for(var k=0;k<gameData.length;k++) {
      var doubleCounter = 0;
      var gameLog = gameData[k];
      if(parseInt(gameLog.GS) === 0 || parseInt(gameLog.GS) === 1) {
        gameLog.fpts = (parseFloat(gameLog.PTS) + (parseFloat(gameLog['3P']) * .5) + (parseFloat(gameLog.TRB) * 1.25) + (parseFloat(gameLog.AST) * 1.5) + (parseFloat(gameLog.STL) * 2) + (parseFloat(gameLog.BLK) * 2)) - (parseFloat(gameLog.TOV) * .5);
        if(gameLog.PTS >=10) {
          doubleCounter++;
        }
        if(gameLog.TRB >=10) {
          doubleCounter++;
        }
        if(gameLog.AST >=10) {
          doubleCounter++;
        }
        if(gameLog.STL >=10) {
          doubleCounter++;
        }
        if(gameLog.BLK >=10) {
          doubleCounter++;
        }
        if(gameLog.TOV >=10) {
          doubleCounter++;
        }
        if(doubleCounter == 2) {
          gameLog.fpts += 1.5;
        } else if (doubleCounter >= 3) {
          gameLog.fpts +=3;
        }
      } else {
        gameLog.fpts = 0;
      }
      gameLog.gameNumber = k+1;
      fptsArray.push(gameLog.fpts);
    }
    data[i].fptTotal = math.sum(fptsArray);
    data[i].fptAvg = math.mean(fptsArray);
    data[i].fptDeviation = math.std(fptsArray);

  }
  fs.writeFile(filename+'.json', JSON.stringify(data, null, 2), 'utf8',function() {
    console.log(filename+'.json has been created');
  });
}