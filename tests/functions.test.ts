import { BootstrapStatic, Fixture, LiveGameweek } from '../types';
import {
	updateBootstrapStatic,
	getFile,
	updateFixtures,
	getGameweekNo,
	updateGameweekStartAndEndTime,
	updateLiveGameweek,
	compareLiveGameweekData,
	findLeagueAndTeams,
	writeFile,
} from '../functions/functions';

describe('Create files from axios requests', () => {
	it('Get Bootstrap Static', async () => {
		await updateBootstrapStatic();
		const bootstrapStatic = getFile('files/bootstrap-static.json') as BootstrapStatic;
		expect(bootstrapStatic).toHaveProperty('events');
		expect(bootstrapStatic).toHaveProperty('game_settings');
		expect(bootstrapStatic).toHaveProperty('phases');
		expect(bootstrapStatic).toHaveProperty('teams');
		expect(bootstrapStatic).toHaveProperty('total_players');
		expect(bootstrapStatic).toHaveProperty('elements');
		expect(bootstrapStatic).toHaveProperty('element_stats');
		expect(bootstrapStatic).toHaveProperty('element_types');
	});
	it('Get Fixtures', async () => {
		await updateFixtures();
		const fixtures = getFile('files/fixtures.json');
		expect(fixtures.length).toBe(380);
	});

	it('Identify current gameweek number', async () => {
		await updateBootstrapStatic();
		const bootstrapStatic = getFile(`files/bootstrap-static.json`) as BootstrapStatic;
		const gameweekNo = getGameweekNo(bootstrapStatic);
		expect(gameweekNo).toBeGreaterThanOrEqual(1);
		expect(gameweekNo).toBeLessThanOrEqual(38);
	});

	it('Get Live Gameweek', async () => {
		await updateBootstrapStatic();
		const bootstrapStatic = getFile(`files/bootstrap-static.json`) as BootstrapStatic;
		const gameweekNo = getGameweekNo(bootstrapStatic);
		const liveGameweek = await updateLiveGameweek(gameweekNo);
		if (liveGameweek) {
			expect(liveGameweek).toHaveProperty('elements');
			expect(liveGameweek.elements.length).toBeGreaterThan(0);
			expect(liveGameweek.elements[0]).toHaveProperty('id');
			expect(liveGameweek.elements[0]).toHaveProperty('stats');
			expect(liveGameweek.elements[0]).toHaveProperty('explain');
		}
	});

	it('Identify gameweek start and end dates', async () => {
		await updateBootstrapStatic();
		await updateFixtures();
		const bootstrapStatic = getFile(`files/bootstrap-static.json`) as BootstrapStatic;
		const gameweekNo = getGameweekNo(bootstrapStatic);
		const fixtures = getFile('files/fixtures.json') as Fixture[];
		const [gameweekFirstKO, gameweekLastKO] = updateGameweekStartAndEndTime(fixtures, gameweekNo);
		expect(gameweekFirstKO.getTime()).toBeGreaterThanOrEqual(new Date('2022-08-05').getTime());
		expect(gameweekLastKO.getTime()).toBeLessThanOrEqual(new Date('2023-06-01').getTime());
	});

	// it('Compare latest gameweek data', async () => {
	// 	await updateBootstrapStatic();
	// 	const bootstrapStatic = getFile(`files/bootstrap-static.json`) as BootstrapStatic;
	// 	const gameweekNo = getGameweekNo(bootstrapStatic);
	// 	const liveGameweek = await updateLiveGameweek(gameweekNo);
	// 	const previousLiveGameweek = getFile('files/live-gameweek-test.json') as LiveGameweek;

	// 	// if (liveGameweek) {
	// 	// 	const changes = compareLiveGameweekData(liveGameweek, previousLiveGameweek, bootstrapStatic);
	// 	// 	writeFile(changes, 'files/changes.json');
	// 	// 	await findLeagueAndTeams('915610');
	// 	// 	expect(changes).toBeTruthy();
	// 	// }
	// });
});
