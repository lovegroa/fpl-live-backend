import axios from 'axios';
import fs from 'fs';
export const getFile = (filePath) => {
    let rawdata = fs.readFileSync(filePath);
    return JSON.parse(rawdata.toString());
};
export const writeFile = (data, path) => {
    const jsonData = JSON.stringify(data);
    fs.writeFileSync(path, jsonData);
};
export const updateBootstrapStatic = async () => {
    console.log('Updating BootstrapStatic');
    try {
        const { data } = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
        if (!data)
            return false;
        if (typeof data !== 'object')
            return false;
        if (!data.hasOwnProperty('elements'))
            return false;
        if (!data.elements.length)
            return false;
        writeFile(data, `files/bootstrap-static.json`);
        return true;
    }
    catch (error) {
        return false;
    }
};
export const updateFixtures = async () => {
    console.log('Updating fixtures');
    try {
        const { data } = await axios.get('https://fantasy.premierleague.com/api/fixtures/');
        if (!Array.isArray(data))
            return false;
        if (!data.length)
            return false;
        writeFile(data, `files/fixtures.json`);
        return true;
    }
    catch (error) {
        return false;
    }
};
export const updateLiveGameweek = async (gameweekNo) => {
    try {
        const { data } = await axios.get(`https://fantasy.premierleague.com/api/event/${gameweekNo}/live/`);
        return data;
    }
    catch (error) {
        return null;
    }
};
export const getGameweekNo = (bootstrapStatic) => {
    return bootstrapStatic.events.reduce((acc, event) => {
        if (event.is_current) {
            acc = event.id;
        }
        return acc;
    }, 0);
};
export const updateCurrentGameweek = async (gameweekNumber) => {
    const { data } = await axios.get(`https://fantasy.premierleague.com/api/event/${gameweekNumber}/live/`);
    const jsonData = JSON.stringify(data);
    fs.writeFileSync(`files/current_gameweek_${gameweekNumber}.json`, jsonData);
};
export const updateGameweekStartAndEndTime = (fixtures, gameweekNo) => {
    const gameweekFixtures = fixtures.filter((fixture) => fixture.event === gameweekNo);
    gameweekFixtures.sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
    return [new Date(gameweekFixtures[0].kickoff_time), new Date(gameweekFixtures[gameweekFixtures.length - 1].kickoff_time)];
};
const getPlayerName = (bootstrapStatic, id) => {
    if (bootstrapStatic.elements.filter((element) => element.id === id).length === 0)
        return 'Player name not found';
    return bootstrapStatic.elements.filter((element) => element.id === id)[0].web_name;
};
const getPlayer = (bootstrapStatic, id) => {
    // if (bootstrapStatic.elements.filter((element) => element.id === id).length !== 1) return undefined;
    return bootstrapStatic.elements.filter((element) => element.id === id)[0];
};
// clean sheets
// saves
// goals conceeded
// assists
// goals
// penalties missed
// penalties saved
// bonus points
// own goals
// yellow cards
// red cards
// minutes
const calculateCleanSheets = ({ stats: { goals_conceded, minutes } }, position) => {
    if (minutes < 60)
        return 0;
    if (goals_conceded !== 0)
        return 0;
    switch (position) {
        case 1:
            return 4;
        case 2:
            return 4;
        case 3:
            return 1;
        case 4:
            return 0;
    }
    return 0;
};
const calculateGoalsConceded = ({ stats: { goals_conceded } }, position) => {
    if (goals_conceded < 2)
        return 0;
    switch (position) {
        case 1:
            return Math.floor(goals_conceded / 2) * -1;
        case 2:
            return Math.floor(goals_conceded / 2) * -1;
        default:
            return 0;
    }
};
const calculateSaves = ({ stats: { saves } }, position) => {
    if (position !== 1)
        return 0;
    return Math.floor(saves / 3);
};
const calculatePenaltiesSaved = ({ stats: { penalties_saved } }, position) => {
    return penalties_saved * 5;
};
const calculatePenaltiesMissed = ({ stats: { penalties_missed } }, position) => {
    return penalties_missed * -2;
};
const calculateYellowCards = ({ stats: { yellow_cards } }, position) => {
    return yellow_cards * -1;
};
const calculateRedCards = ({ stats: { red_cards } }, position) => {
    return red_cards * -3;
};
const calculateOwnGoals = ({ stats: { own_goals } }, position) => {
    return own_goals * -2;
};
const calculateAssists = ({ stats: { assists } }, position) => {
    return assists * 3;
};
const calculateMinutes = ({ stats: { minutes } }, position) => {
    if (minutes >= 60)
        return 2;
    if (minutes > 0)
        return 1;
    return 0;
};
const calculateGoalsScored = ({ stats: { goals_scored } }, position) => {
    switch (position) {
        case 1:
            return goals_scored * 6;
        case 2:
            return goals_scored * 6;
        case 3:
            return goals_scored * 5;
        case 4:
            return goals_scored * 4;
    }
    return 0;
};
const calculateLivePoints = (gameweekData, bootstrapStatic) => {
    gameweekData.elements.forEach((element) => {
        const { element_type } = bootstrapStatic.elements.filter(({ id }) => id === element.id)[0];
        let totalPoints = 0;
        totalPoints += calculateMinutes(element, element_type);
        totalPoints += calculateGoalsScored(element, element_type);
        totalPoints += calculateAssists(element, element_type);
        totalPoints += calculateOwnGoals(element, element_type);
        totalPoints += calculateRedCards(element, element_type);
        totalPoints += calculateYellowCards(element, element_type);
        totalPoints += calculatePenaltiesMissed(element, element_type);
        totalPoints += calculatePenaltiesSaved(element, element_type);
        totalPoints += calculateGoalsConceded(element, element_type);
        totalPoints += calculateSaves(element, element_type);
        totalPoints += calculateCleanSheets(element, element_type);
        totalPoints += element.stats.bonus;
        element.stats.total_points = totalPoints;
    });
};
export const isLiveGameweekDataType = (newData) => {
    if (!newData) {
        return false;
    }
    if (typeof newData !== 'object') {
        return false;
    }
    if (!newData.hasOwnProperty('elements')) {
        return false;
    }
    if (!newData.elements.length) {
        return false;
    }
    return true;
};
export const compareLiveGameweekData = (newData, oldData, bootstrapStatic, teams, originalChanges) => {
    const changes = [];
    newData.elements.forEach((playerNew) => {
        const player = getPlayer(bootstrapStatic, playerNew.id);
        const name = player.web_name;
        const position = player.element_type;
        const { stats, id } = playerNew;
        const playerOldArray = oldData.elements.filter((playerOld) => playerOld.id === id);
        const statsToIgnore = ['influence', 'creativity', 'threat', 'ict_index', 'in_dreamteam', 'bps'];
        let playStatus = 0; // 0 = game not started, 1 = played, 2 = game started and not yet played
        if (teams[player.team]) {
            playStatus = playerNew.stats.minutes ? 1 : 2;
        }
        if (playerOldArray.length === 1) {
            const playerOld = playerOldArray[0];
            const metrics = Object.keys(playerOld.stats);
            metrics.forEach((metric) => {
                if (playerOld.stats[metric] !== playerNew.stats[metric]) {
                    switch (metric) {
                        case 'minutes':
                            const oldMinutes = playerOld.stats['minutes'];
                            const newMinutes = playerNew.stats['minutes'];
                            if ((oldMinutes === 0 && newMinutes > 0) || (oldMinutes < 60 && newMinutes >= 60)) {
                                changes.push({
                                    date: new Date(),
                                    id,
                                    name,
                                    metric,
                                    old: playerOld.stats[metric],
                                    new: playerNew.stats[metric],
                                });
                            }
                            break;
                        case 'goals_conceded':
                            if (position === 0 || position === 1) {
                                changes.push({
                                    date: new Date(),
                                    id,
                                    name,
                                    metric,
                                    old: playerOld.stats[metric],
                                    new: playerNew.stats[metric],
                                });
                            }
                            else if (position === 2) {
                                if (playerOld.stats[metric] === 0) {
                                    changes.push({
                                        date: new Date(),
                                        id,
                                        name,
                                        metric,
                                        old: playerOld.stats[metric],
                                        new: playerNew.stats[metric],
                                    });
                                }
                            }
                            break;
                        default:
                            if (!statsToIgnore.some((stat) => stat === metric)) {
                                changes.push({
                                    date: new Date(),
                                    id,
                                    name,
                                    metric,
                                    old: playerOld.stats[metric],
                                    new: playerNew.stats[metric],
                                });
                            }
                            break;
                    }
                }
            });
            if (playStatus === 2) {
                if (originalChanges.filter((change) => change.id === id && change.metric === 'playStatus').length === 0) {
                    changes.push({
                        date: new Date(),
                        id,
                        name,
                        metric: 'playStatus',
                        old: 0,
                        new: 2,
                    });
                }
            }
        }
    });
    return changes;
};
export const compareInitialLiveGameweekData = (newData, bootstrapStatic, teams, originalChanges) => {
    const changes = [];
    newData.elements.forEach((playerNew) => {
        const player = getPlayer(bootstrapStatic, playerNew.id);
        const name = player.web_name;
        const position = player.element_type;
        const { stats, id } = playerNew;
        const statsToIgnore = ['influence', 'creativity', 'threat', 'ict_index', 'in_dreamteam', 'bps'];
        let playStatus = 0; // 0 = game not started, 1 = played, 2 = game started and not yet played
        if (teams[player.team]) {
            playStatus = playerNew.stats.minutes ? 1 : 2;
        }
        const metrics = Object.keys(playerNew.stats);
        const defaultMetircValues = {
            minutes: 0,
            goals_scored: 0,
            assists: 0,
            clean_sheets: 0,
            goals_conceded: 0,
            own_goals: 0,
            penalties_saved: 0,
            penalties_missed: 0,
            yellow_cards: 0,
            red_cards: 0,
            saves: 0,
            bonus: 0,
            bps: 0,
            influence: '0.0',
            creativity: '0.0',
            threat: '0.0',
            ict_index: '0.0',
            total_points: 0,
            in_dreamteam: false,
        };
        metrics.forEach((metric) => {
            if (defaultMetircValues[metric] !== playerNew.stats[metric]) {
                switch (metric) {
                    case 'minutes':
                        const oldMinutes = defaultMetircValues['minutes'];
                        const newMinutes = playerNew.stats['minutes'];
                        if ((oldMinutes === 0 && newMinutes > 0) || (oldMinutes < 60 && newMinutes >= 60)) {
                            changes.push({
                                date: new Date(),
                                id,
                                name,
                                metric,
                                old: defaultMetircValues[metric],
                                new: playerNew.stats[metric],
                            });
                        }
                        break;
                    case 'goals_conceded':
                        if (position === 0 || position === 1) {
                            changes.push({
                                date: new Date(),
                                id,
                                name,
                                metric,
                                old: defaultMetircValues[metric],
                                new: playerNew.stats[metric],
                            });
                        }
                        else if (position === 2) {
                            if (defaultMetircValues[metric] === 0) {
                                changes.push({
                                    date: new Date(),
                                    id,
                                    name,
                                    metric,
                                    old: defaultMetircValues[metric],
                                    new: playerNew.stats[metric],
                                });
                            }
                        }
                        break;
                    default:
                        if (!statsToIgnore.some((stat) => stat === metric)) {
                            changes.push({
                                date: new Date(),
                                id,
                                name,
                                metric,
                                old: defaultMetircValues[metric],
                                new: playerNew.stats[metric],
                            });
                        }
                        break;
                }
            }
        });
        if (playStatus === 2) {
            if (originalChanges.filter((change) => change.id === id && change.metric === 'playStatus').length === 0) {
                changes.push({
                    date: new Date(),
                    id,
                    name,
                    metric: 'playStatus',
                    old: 0,
                    new: 2,
                });
            }
        }
    });
    return changes;
};
export const getLeague = async (leagueID) => {
    const { data } = await axios.get(`https://fantasy.premierleague.com/api/leagues-classic/${leagueID}/standings`);
    return data;
};
export const findLeagueAndTeams = async (leagueID) => {
    await updateBootstrapStatic();
    const bootstrapStatic = getFile(`files/bootstrap-static.json`);
    const league = await getLeague(leagueID);
    const gameweekNo = getGameweekNo(bootstrapStatic);
    return await league.standings.results.reduce(async (acc, manager) => {
        const teamsAcc = await acc;
        const team = await getTeam(manager.entry, gameweekNo);
        manager.team = team;
        return teamsAcc;
    }, Promise.resolve(league));
};
const getTeamsInLeague = async (league) => {
    league.standings.results.forEach((team) => { });
};
const getTeam = async (teamID, gameweekNo) => {
    const { data } = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamID}/event/${gameweekNo}/picks/`);
    return data;
};
const teamStarted = (liveGameweek, bootstrapStatic) => {
    let teams = {
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
        7: false,
        8: false,
        9: false,
        10: false,
        11: false,
        12: false,
        13: false,
        14: false,
        15: false,
        16: false,
        17: false,
        18: false,
        19: false,
        20: false,
    };
    return liveGameweek.elements.reduce((acc, element) => {
        const { team } = getPlayer(bootstrapStatic, element.id);
        if (acc[team])
            return acc;
        if (element.stats.minutes > 0)
            acc[team] = true;
        return acc;
    }, teams);
};
export const updateHourly = async () => {
    await Promise.all([updateBootstrapStatic(), updateFixtures()]);
    const fixtures = getFile('/files/fixtures.json');
    const bootstrapStatic = getFile(`files/bootstrap-static.json`);
    const gameweekNo = getGameweekNo(bootstrapStatic);
    updateGameweekStartAndEndTime(fixtures, gameweekNo);
};
export const updateMinutely = async (gameweekNo) => {
    console.log('updateMinutely: start');
    const changesFilePath = `files/gameweeks/${gameweekNo}/changes-${gameweekNo}.json`;
    const originalChanges = getFile(changesFilePath);
    const bootstrapStatic = getFile(`files/bootstrap-static.json`);
    const liveGameweek = await updateLiveGameweek(gameweekNo);
    if (!liveGameweek)
        return;
    if (!isLiveGameweekDataType(liveGameweek))
        return;
    const teams = teamStarted(liveGameweek, bootstrapStatic);
    calculateLivePoints(liveGameweek, bootstrapStatic);
    const previousLiveGameweek = getFile(`files/gameweeks/${gameweekNo}/live-gameweek-${gameweekNo}.json`);
    if (previousLiveGameweek.elements.length) {
        const changes = compareLiveGameweekData(liveGameweek, previousLiveGameweek, bootstrapStatic, teams, originalChanges);
        writeFile(changes.concat(originalChanges), changesFilePath);
    }
    else {
        const changes = compareInitialLiveGameweekData(liveGameweek, bootstrapStatic, teams, originalChanges);
        writeFile(changes.concat(originalChanges), changesFilePath);
    }
    writeFile(liveGameweek, `files/gameweeks/${gameweekNo}/live-gameweek-${gameweekNo}.json`);
    console.log('updateMinutely: end');
};
