const fs = require('fs').promises;

const getFunnyNames = async () => {
	const funnynames = await fs.readFile('./helper/funnynames.json');
	//console.log('*\n');

	return JSON.parse(funnynames);
}

const sort_number = (max) => {
	let ale = Math.floor(Math.random() * max);

	return ale;
}

const generateNickname = async () => {
	const funnynames = await getFunnyNames();
	
	const ale1 = sort_number(funnynames.adjectives.length);
	const ale2 = sort_number(funnynames.substantives.length);

	const final_nickname = funnynames.adjectives[ale1] + funnynames.substantives[ale2];

	return final_nickname;
};	

module.exports = generateNickname;
