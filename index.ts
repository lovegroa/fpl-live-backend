import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import { findLeagueAndTeams, getFile, getGameweekNo, updateBootstrapStatic, updateFixtures, updateMinutely } from './functions/functions.js';
import { BootstrapStatic } from './types';
import axios from 'axios';

console.log('updateTenMinutely');
await Promise.all([updateBootstrapStatic(), updateFixtures()]);
let bootstrapStatic = getFile(`files/bootstrap-static.json`) as BootstrapStatic;
let gameweekNo = getGameweekNo(bootstrapStatic);

console.log({ gameweekNo });

setInterval(async () => {
	console.log('updateTenMinutely');
	await Promise.all([updateBootstrapStatic(), updateFixtures()]);
	bootstrapStatic = getFile(`files/bootstrap-static.json`) as BootstrapStatic;
	gameweekNo = getGameweekNo(bootstrapStatic);
	console.log({ gameweekNo });
}, 1000 * 60 * 10);

await updateMinutely(gameweekNo);

setInterval(async () => {
	await updateMinutely(gameweekNo);
}, 1000 * 60);

dotenv.config();

const app: Express = express();
const port = process.env.PORT;
app.set('trust proxy', true);

app.use(cors());
app.use((req, _res, next) => {
	console.log(`Request received: ${req.method} - ${req.url}`);
	next();
});

app.get('/league/:leagueID/', async (req: Request, res: Response) => {
	const leagueID = req.params.leagueID;

	try {
		const result = await findLeagueAndTeams(leagueID);
		res.status(200).json(result);
	} catch (error) {
		res.status(500).end(error);
	}
});

app.get('/entry/:entryID/', async (req: Request, res: Response) => {
	const { entryID } = req.params;
	console.log({ entryID });

	try {
		const { data } = await axios.get(`https://fantasy.premierleague.com/api/entry/${entryID}/`);
		res.status(200).json(data);
	} catch (error) {
		console.log(error);
		res.status(500).end(error);
	}
});

app.get('/bootstrap-static/', async (req: Request, res: Response) => {
	try {
		const bootstrapStatic = getFile(`files/bootstrap-static.json`);
		res.status(200).json(bootstrapStatic);
	} catch (error) {
		console.log(error);
		res.status(500).end(error);
	}
});

app.get('/latest-changes/', async (req: Request, res: Response) => {
	try {
		const bootstrapStatic = getFile(`files/gameweeks/${gameweekNo}/changes-${gameweekNo}.json`);
		res.status(200).json(bootstrapStatic);
	} catch (error) {
		console.log(error);
		res.status(500).end(error);
	}
});

app.listen(port, () => {
	console.log(`??????[server]: Server is running at https://localhost:${port}`);
});
