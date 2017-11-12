'use strict';

const chalk = require('chalk');
const GitHubApi = require('github');
const config = require('./config');
const fs = require('fs');
const yargs = require('yargs');
const ora = require('ora');
const inquirer = require('inquirer');
const cmd = require('node-cmd');
const path = require('path');
const openurl = require('openurl');

function getGitCliData(data) {

}

function isValidUrl(str) {
	var pattern = new RegExp('^(https?:\/\/)?' + // protocol
		'((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|' + // domain name
		'((\d{1,3}\.){3}\d{1,3}))' + // OR ip (v4) address
		'(\:\d+)?(\/[-a-z\d%_.~+]*)*' + // port and path
		'(\?[;&a-z\d%_.~+=-]*)?' + // query string
		'(\#[-a-z\d_]*)?$', 'i'); // fragment locater
	if (!pattern.test(str)) {
		alert("Please enter a valid URL.");
		return false;
	} else {
		return true;
	}
}

const github = new GitHubApi({
	headers: {
		'accept': 'application/vnd.github.v3+json',
	},
});

/**
 * Headers for every request that is made
 */
const authHeaders = {
	type: 'token',
	token: config.ACCESS_TOKEN
};

/**
 * Command line interface code for the app
 */
const argv = yargs
	.usage('$0 <command>')
	.command('create', 'Create pull request', (yargsCreate) => {
		const repoArgs = yargsCreate
			.usage('Usage: $0 create')
			.alias('r', 'remote')
			.describe('r', 'Remote to generate pull request on')
			.string('r')
			.alias('b', 'branch')
			.describe('b', 'Remote branch')
			.string('b')
			.alias('t', 'title')
			.describe('t', 'Pull request title')
			.string('t')
			.alias('desc', 'description')
			.describe('desc', 'Pull request description')
			.string('desc')
			.example('$0 create -r main -b develop -t "Changed everything" -desc "Yes I did!"')
			.argv;
		
		if (config.USERNAME == "" || config.ACCESS_TOKEN == "") {
			const questions = [{
				type: 'confirm',
				name: 'ANS',
				message: 'Have you added the required configuration by running config command?',
			}];

			inquirer.prompt(questions).then((answers) => {
				if (!answers.ANS) openurl.open("https://github.com/fossbrew/gitpr-cli/blob/master/README.md");
			}).catch((err) => {});
		}

		const spinner = ora('Getting required data').start();

		var requestData = {
			owner: '',
			repo: '',
			title: repoArgs.t,
			body: repoArgs.desc,
			head: '',
			base: repoArgs.r,
		};

		cmd.get(
			"git branch | grep \* | cut -d ' ' -f2",
			function (err, data, stderr) {
				requestData.head = config.USERNAME + ':' + data;
			}
		);

		cmd.get(
			"git config --get remote." + repoArgs.r + ".url",
			function (err, data, stderr) {
				if (data == "") {
					console.log(chalk.red('Remote does not exist'));
					return;
				}

				if (isValidUrl(data)) {
					data = str.replace(/.git\s*$/, "");
					data = str.split("/");
					requestData.owner = data[1];
					requestData.repo = data[2];
				} else {
					data = str.replace(/.git\s*$/, "");
					data = str.split('/');
					requestData.repo = data[1];
					requestData.owner = data[0].split(':')[1];
				}
			}
		);

		console.log(requestData);
		spinner.stop();
		return;

		github.authenticate({
			type: 'token',
			token: config.ACCESS_TOKEN
		})

		github.pullRequests.create(data, function (err, res) {
			if (err) throw err;
			console.log(JSON.stringify(res))
		});
	})
	.command('config', 'Change configuration and defaults', (yargsConfig) => {
		/**
		 * Get all the options set for `config` command
		 */
		const configs = yargsConfig
			.usage('Usage: sudo $0 config')
			.example('sudo $0 config')
			.argv;

		if (configs.h) {
			return;
		}

		const questions = [{
				type: 'input',
				name: 'ACCESS_TOKEN',
				message: 'Enter ACCESS_TOKEN <leave blank incase unchanged>',
			},
			{
				type: 'input',
				name: 'USERNAME',
				message: 'Enter your GitHub username <leave blank incase unchanged>',
			}
		];

		inquirer.prompt(questions).then((answers) => {
			const obj = configs;

			if (answers.ACCESS_TOKEN !== '') {
				obj.ACCESS_TOKEN = answers.ACCESS_TOKEN;
				obj.USERNAME = answers.USERNAME;
			}

			fs.writeFileSync(path.resolve(__dirname, 'config.json'), JSON.stringify(obj, null, 2), 'utf8');
			console.log(chalk.green('Config has been updated. You can change it manually in config.json file.'));
		}).catch((err) => {
			throw err;
			console.log(chalk.red('Please run the following command with root access'));
		});
	})
	.help('h')
	.alias('h', 'help')
	.argv;