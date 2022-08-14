import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { findLeagueAndTeams, getFile, getGameweekNo, updateBootstrapStatic, updateFixtures, updateMinutely } from './functions/functions.js';
await Promise.all([updateBootstrapStatic(), updateFixtures()]);
const bootstrapStatic = getFile(`files/bootstrap-static.json`);
let gameweekNo = getGameweekNo(bootstrapStatic);
console.log({ gameweekNo });
setInterval(async () => {
    await Promise.all([updateBootstrapStatic(), updateFixtures()]);
    // const fixtures = getFile('/files/fixtures.json') as Fixture[];
    const bootstrapStatic = getFile(`files/bootstrap-static.json`);
    gameweekNo = getGameweekNo(bootstrapStatic);
}, 1000 * 60 * 60);
await updateMinutely(gameweekNo);
setInterval(async () => {
    console.log('updateMinutely');
    await updateMinutely(gameweekNo);
}, 1000 * 60);
dotenv.config();
const app = express();
const port = process.env.PORT;
app.set('trust proxy', true);
app.use(cors());
app.use((req, _res, next) => {
    console.log(`Request received: ${req.method} - ${req.url}`);
    next();
});
app.get('/leagueID/:leagueID/', async (req, res) => {
    const leagueID = req.params.leagueID;
    try {
        const result = await findLeagueAndTeams(leagueID);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(500).end(error);
    }
});
app.get('/bootstrap-static/', async (req, res) => {
    try {
        const bootstrapStatic = getFile(`files/bootstrap-static.json`);
        res.status(200).json(bootstrapStatic);
    }
    catch (error) {
        res.status(500).end(error);
    }
});
app.get('/latest-changes/', async (req, res) => {
    try {
        const bootstrapStatic = getFile(`files/changes.json`);
        res.status(200).json(bootstrapStatic);
    }
    catch (error) {
        res.status(500).end(error);
    }
});
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
