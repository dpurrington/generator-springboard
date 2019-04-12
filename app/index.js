const Generator = require('yeoman-generator');

module.exports = class extends Generator {
  async prompting() {
    const answers = await this.prompt([{
      type: 'input',
      name: 'serviceName',
      message: 'Your service name',
      default: this.appname // Default to current folder name
    }, {
      type: 'list',
      name: 'serviceType',
      message: 'Service type',
      choices: ['koa web service', 'scheduled task'],
      default: 'koa web service'
    }]);

    this.answers = answers;
  }

  async writing() {
    const pkgJson = {
      name: this.answers.serviceName,
      version: '1.0.0',
      description: '',
      main: 'src/server.js',
      author: 'SimpliSafe',
      license: 'ISC',
      scripts: {
        start: "node src/server.local.js",
        "debug:start": "DEBUG=<%= serviceName -%>*,ss* npm start",
        lint: "eslint .",
        "lint:fix": "eslint . --fix",
        test: "jest",
        "test:watch": "jest --watchAll",
        "debug:test": "DEBUG=<%= serviceName -%>*,ss* npm test",
        cover: "jest --collect-coverage",
        dependency_check: "madge src/app.js --circular",
        ci: "npm run lint && npm run dependency_check && npm run cover"
      },
      dependencies: {
        "@simplisafe/ss_error": "^2.4.0",
        "@simplisafe/ss_service_utils": "^1.2.0",
        "serverless-http": "^1.9.1",  //TODO: get the right version here
        "debug": "^3.2.6",
        "koa": "^2.6.2",
        "koa-joi-router": "^5.1.0",
        "koa-joi-router-docs": "^0.1.9",
        "koa-mount": "^3.0.0",
        "koa-pino-logger": "^2.1.3",
        "koa-static": "^5.0.0",
        "koa2-swagger-ui": "^2.11.9",
        "lodash": "^4.17.10",
        "pino": "^5.12.0",
        "serverless-offline": "4.6.0",
        "serverless-plugin-warmup": "^4.3.3-rc.1"
      },
      devDependencies: {
        "chai": "^4.1.2",
        "chai-as-promised": "^7.1.1",
        "chai-shallow-deep-equal": "^1.4.6",
        "eslint": "^5.11.1",
        "eslint-plugin-jest": "^22.4.1",
        "jest": "^24.7.0",
        "madge": "^3.3.0",
        "nodemon": "^1.18.9",
        "serverless-pseudo-parameters": "^2.4.0",
        "supertest": "^3.1.0"
      },
      nyc: {
        exclude: [
          "conf/*",
          "routes/swagger/*",
          "test/*"
        ],
      }
    };

    if (this.answers.serviceType === 'web service') {
      pkgJson.scripts.start = 'source env/local.env && serverless offline start -s local';
    }

    if (this.answers.dynamodb) {
      pkgJson.scripts.setup = 'source env/local.env && serverless dynamodb install -s local && serverless dynamodb start --migrate && npm run cleanup';
      pkgJson.scripts.cleanup = 'kill -9 $(lsof -ti:8000) 2>/dev/null || true';
      pkgJson.scripts.test = 'eslint app && npm run cleanup && source env/local.env && (sls dynamodb start -s local) & sleep 5 && ./node_modules/.bin/jest && npm run cleanup';

      pkgJson.dependencies.dynamoose = '^1.3.0';
      pkgJson.devDependencies['serverless-dynamodb-local'] = '0.2.30';
    }

    if (this.answers.logForwarding) {
      pkgJson.dependencies['serverless-log-forwarding'] = '^1.3.0';
    }
    this.fs.writeJSON('package.json', pkgJson);
    this.fs.copyTpl(
      this.templatePath('.gitignore_temp'),
      this.destinationPath('.gitignore'),
      this.answers,
    )
    this.fs.copyTpl(
      this.templatePath('.eslintrc'),
      this.destinationPath('.eslintrc'),
      this.answers,
    )
    this.fs.copyTpl(
      this.templatePath('**/*'),
      this.destinationPath(),
      this.answers
    );
  }

  install() {
    this.npmInstall();
  }
};
