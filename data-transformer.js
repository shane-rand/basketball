var data = require('./player-game-logs.json');
var teamData = require('./team-data.json');
var moment = require('moment');
var fs = require('fs');
const math = require('mathjs');

for(var i=0;i<data.length;i++) {
  var gameData = data[i].gameData;
  var fptsArray = [];
  console.log(data[i].name,":");
  for(var k=0;k<gameData.length;k++) {
    var gameLog = gameData[k];
    gameLog.estimatedFpts = 0;
    gameLog.residual = 0;
    var currentGameNumber = gameLog.gameNumber;
    var prevWeightedFpts = [];
    var prevFpts = [];
    var weights = [];
    //console.log("looking at game number: ",currentGameNumber);
    if(currentGameNumber > 1) {
      for(var j = currentGameNumber - 1;j>=1;j--) {
      var HCA = 1;
      //console.log("looking at previous game number: ",j);
      var prevGameLog = gameData[j];
      var prevGameNumber = prevGameLog.gameNumber;
      var gamesPlayed = currentGameNumber - 1;
      var weight = (j / gamesPlayed);
      //console.log("Previous: "+prevGameLog.fpts);
      //console.log("weight: "+ weight);
      //console.log("adjusted: "+prevGameLog.fpts * weight);
      var weightedFpts = prevGameLog.fpts * weight;
      prevFpts.push(prevGameLog.fpts);
      prevWeightedFpts.push(weightedFpts);
      weights.push(weight);
      }
      //console.log(prevFpts);
      //console.log(prevWeightedFpts);
      //console.log(math.mean(prevWeightedFpts));
      if(gameLog.at !== "@") {
        HCA = 1.25;
      }
      //var a = moment([2007, 0, 29]);
      //var b = moment([2007, 0, 28]);
      //a.diff(b, 'days') // 1
      gameLog.daysRest = (moment(gameLog.Date).diff(moment(gameData[k-1].Date),'days')) - 1;
      if(gameLog.daysRest < 0) {
        gameLog.daysRest = 0;
      }
      var weightedAvg = math.sum(prevWeightedFpts) / math.sum(weights);
      if(gameLog.daysRest >= 2) {
        daysRestMultiplier = 1.25;
      } else if(gameLog.daysRest === 1) {
        daysRestMultiplier = 1;
      } else if (gameLog.daysRest === 0) {
        daysRestMultiplier = 0.85;
      }
      gameLog.estimatedFpts = weightedAvg * HCA * daysRestMultiplier;
      gameLog.avgFpts = math.mean(prevFpts);
      gameLog.residual = gameLog.estimatedFpts - gameLog.fpts;
      //console.log(data[i].name," for game number ",gameNumber,":",gameLog.fpts," ",gameLog.estimatedFpts);
      //console.log("Estimated: "+gameLog.estimatedFpts,"Actual: "+gameLog.fpts);
    } else {
      gameLog.estimatedFpts = 0;
      gameLog.residual = 0;
    }
    //console.log("Average: ",gameLog.avgFpts,"Estimated: ",gameLog.estimatedFpts," Actual:", gameLog.fpts);
  }
}

fs.writeFile('players-with-estimations.json', JSON.stringify(data, null, 2), 'utf8',function() {
  console.log('players-with-estimations.json has been created');
});