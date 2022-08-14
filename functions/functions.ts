import axios from 'axios';
import fs from 'fs';
import { resourceLimits } from 'worker_threads';
import { BootstrapStatic, Fixture, LeagueData, LiveGameweek, Team } from '../bootstrap-static';

export const getFile = (filePath: string): any => {
	try {
		let rawdata = fs.readFileSync(filePath);
		return JSON.parse(rawdata.toString());
	} catch (error) {
		return error;
	}
};

export const writeFile = (data: unknown, path: string) => {
	const jsonData = JSON.stringify(data);
	fs.writeFileSync(path, jsonData);
};

export const updateBootstrapStatic = async () => {
	const { data } = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
	writeFile(data, `files/bootstrap-static.json`);
};

export const updateFixtures = async () => {
	const { data } = await axios.get('https://fantasy.premierleague.com/api/fixtures/');
	writeFile(data, `files/fixtures.json`);
};

export const updateLiveGameweek = async (gameweekNo: number): Promise<LiveGameweek> => {
	const { data } = await axios.get(`https://fantasy.premierleague.com/api/event/${gameweekNo}/live/`);
	return data as LiveGameweek;
};

export const getGameweekNo = (bootstrapStatic: BootstrapStatic): number => {
	return bootstrapStatic.events.reduce((acc, event) => {
		if (event.is_current) {
			acc = event.id;
		}
		return acc;
	}, 0);
};

export const updateCurrentGameweek = async (gameweekNumber: number) => {
	const { data } = await axios.get(`https://fantasy.premierleague.com/api/event/${gameweekNumber}/live/`);
	const jsonData = JSON.stringify(data);
	fs.writeFileSync(`files/current_gameweek_${gameweekNumber}.json`, jsonData);
};

export const updateGameweekStartAndEndTime = (fixtures: Fixture[], gameweekNo: number): [Date, Date] => {
	const gameweekFixtures = fixtures.filter((fixture) => fixture.event === gameweekNo);
	gameweekFixtures.sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
	return [new Date(gameweekFixtures[0].kickoff_time), new Date(gameweekFixtures[gameweekFixtures.length - 1].kickoff_time)];
};

const getPlayerName = (bootstrapStatic: BootstrapStatic, id: number): string => {
	if (bootstrapStatic.elements.filter((element) => element.id === id).length === 0) return 'Player name not found';
	return bootstrapStatic.elements.filter((element) => element.id === id)[0].web_name;
};
const getPlayer = (bootstrapStatic: BootstrapStatic, id: number) => {
	// if (bootstrapStatic.elements.filter((element) => element.id === id).length !== 1) return undefined;
	return bootstrapStatic.elements.filter((element) => element.id === id)[0];
};

type LiveGameweekChange = {
	date: Date;
	id: number;
	name: string;
	metric: string;
	old: number | string | boolean;
	new: number | string | boolean;
};

export const compareLiveGameweekData = (newData: LiveGameweek, oldData: LiveGameweek, bootstrapStatic: BootstrapStatic): LiveGameweekChange[] => {
	const changes: LiveGameweekChange[] = [];

	newData.elements.forEach((playerNew) => {
		// const name = getPlayerName(bootstrapStatic, playerNew.id);
		const player = getPlayer(bootstrapStatic, playerNew.id);

		const name = player.web_name;
		const position = player.element_type;

		const { stats, id } = playerNew;

		type Stats = keyof typeof stats;

		const playerOldArray = oldData.elements.filter((playerOld) => playerOld.id === id);

		const statsToIgnore = ['influence', 'creativity', 'threat', 'ict_index', 'in_dreamteam', 'bps'];

		if (playerOldArray.length === 1) {
			const playerOld = playerOldArray[0];
			const metrics = Object.keys(playerOld.stats) as Stats[];

			metrics.forEach((metric) => {
				if (playerOld.stats[metric] !== playerNew.stats[metric]) {
					switch (metric) {
						case 'minutes':
							const oldMinutes = playerOld.stats['minutes'];
							const newMinutes = playerNew.stats['minutes'];
							if ((oldMinutes === 0 && newMinutes > 0) || (oldMinutes < 60 && newMinutes >= 60)) {
								changes.push({ date: new Date(), id, name, metric, old: playerOld.stats[metric], new: playerNew.stats[metric] });
							}
							break;
						case 'goals_conceded':
							if (position === 0 || position === 1) {
								changes.push({ date: new Date(), id, name, metric, old: playerOld.stats[metric], new: playerNew.stats[metric] });
							} else if (position === 2) {
								if (playerOld.stats[metric] === 0) {
									changes.push({ date: new Date(), id, name, metric, old: playerOld.stats[metric], new: playerNew.stats[metric] });
								}
							}
							break;
						default:
							if (!statsToIgnore.some((stat) => stat === metric)) {
								changes.push({ date: new Date(), id, name, metric, old: playerOld.stats[metric], new: playerNew.stats[metric] });
							}

							break;
					}
				}
			});
		}
	});

	let jsonData = JSON.stringify(newData);
	fs.writeFileSync(`gwData.json`, jsonData);

	return changes;
};

export const getLeague = async (leagueID: string) => {
	const { data } = await axios.get(`https://fantasy.premierleague.com/api/leagues-classic/${leagueID}/standings`);
	return data as LeagueData;
};

export const findLeagueAndTeams = async (leagueID: string) => {
	await updateBootstrapStatic();
	const bootstrapStatic = getFile(`files/bootstrap-static.json`) as BootstrapStatic;
	const league = await getLeague(leagueID);
	const gameweekNo = getGameweekNo(bootstrapStatic);

	return await league.standings.results.reduce<Promise<typeof league>>(async (acc, manager) => {
		const teamsAcc = await acc;
		const team = await getTeam(manager.entry, gameweekNo);
		manager.team = team;
		return teamsAcc;
	}, Promise.resolve(league));
};

const getTeamsInLeague = async (league: LeagueData) => {
	league.standings.results.forEach((team) => {});
};

const getTeam = async (teamID: number, gameweekNo: number) => {
	const { data } = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamID}/event/${gameweekNo}/picks/`);
	return data as Team;
};

export const updateHourly = async () => {
	await Promise.all([updateBootstrapStatic(), updateFixtures()]);
	const fixtures = getFile('/files/fixtures.json') as Fixture[];
	const bootstrapStatic = getFile(`files/bootstrap-static.json`) as BootstrapStatic;
	const gameweekNo = getGameweekNo(bootstrapStatic);
	updateGameweekStartAndEndTime(fixtures, gameweekNo);
};

export const updateMinutely = async (gameweekNo: number) => {
	const bootstrapStatic = getFile(`files/bootstrap-static.json`) as BootstrapStatic;
	const liveGameweek = await updateLiveGameweek(gameweekNo);
	const previousLiveGameweek = getFile('files/live-gameweek.json') as LiveGameweek;
	const changes = compareLiveGameweekData(liveGameweek, previousLiveGameweek, bootstrapStatic);
	writeFile(changes.concat(getFile('files/changes.json')), 'files/changes.json');
	writeFile(liveGameweek, 'files/live-gameweek.json');
};
