import fs from 'fs';
import axios from 'axios';

const getData = async (endpoint: string) => {
	const { data } = await axios.get(`https://fantasy.premierleague.com/api/${endpoint}/`);
	let jsonData = JSON.stringify(data);
	fs.writeFileSync(`${endpoint}.json`, jsonData);
};

const endpoints = ['bootstrap-static'];

endpoints.forEach((endpoint) => getData(endpoint));
